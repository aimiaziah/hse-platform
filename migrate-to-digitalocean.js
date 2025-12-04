// migrate-to-digitalocean.js
// Migrates base64 images from Supabase database to DigitalOcean Spaces
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// DigitalOcean Spaces config
const doSpacesRegion = process.env.DO_SPACES_REGION || 'sgp1'; // Singapore by default
const doSpacesName = process.env.DO_SPACES_NAME;
const doSpacesKey = process.env.DO_SPACES_KEY;
const doSpacesSecret = process.env.DO_SPACES_SECRET;
const doSpacesEndpoint = process.env.DO_SPACES_ENDPOINT;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('\nRequired in .env.local:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL=your_url');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your_key\n');
  process.exit(1);
}

if (!doSpacesName || !doSpacesKey || !doSpacesSecret) {
  console.error('❌ Missing DigitalOcean Spaces credentials');
  console.log('\nRequired in .env.local:');
  console.log('  DO_SPACES_NAME=your-space-name');
  console.log('  DO_SPACES_KEY=your_access_key');
  console.log('  DO_SPACES_SECRET=your_secret_key');
  console.log('  DO_SPACES_REGION=sgp1  # Optional, defaults to sgp1');
  console.log('  DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com  # Optional\n');
  console.log('📖 See DIGITALOCEAN_SETUP.md for setup instructions\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// DigitalOcean Spaces S3 client
const doClient = new S3Client({
  region: doSpacesRegion,
  endpoint: doSpacesEndpoint || `https://${doSpacesRegion}.digitaloceanspaces.com`,
  credentials: {
    accessKeyId: doSpacesKey,
    secretAccessKey: doSpacesSecret,
  },
  forcePathStyle: false, // DigitalOcean uses virtual-hosted-style
});

/**
 * Upload base64 image to DigitalOcean Spaces
 */
async function uploadToSpaces(base64Data, path) {
  try {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');

    await doClient.send(
      new PutObjectCommand({
        Bucket: doSpacesName,
        Key: path,
        Body: buffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read', // Make images publicly accessible
      })
    );

    // Return public CDN URL
    return `https://${doSpacesName}.${doSpacesRegion}.cdn.digitaloceanspaces.com/${path}`;
  } catch (error) {
    console.error(`Failed to upload ${path}:`, error.message);
    return null;
  }
}

/**
 * Process a single inspection
 */
async function processInspection(inspection) {
  const formData = inspection.form_data || {};
  let modified = false;
  let imagesMigrated = 0;
  let totalImages = 0;

  // Process signature
  if (inspection.signature && inspection.signature.startsWith('data:image')) {
    totalImages++;
    const signaturePath = `inspections/${inspection.inspection_type}/signatures/${inspection.id}.jpg`;
    const signatureUrl = await uploadToSpaces(inspection.signature, signaturePath);
    if (signatureUrl) {
      inspection.signature = signatureUrl;
      modified = true;
      imagesMigrated++;
    }
  }

  // Process photos in formData
  if (formData.photos && Array.isArray(formData.photos)) {
    for (let i = 0; i < formData.photos.length; i++) {
      const photo = formData.photos[i];
      if (photo && typeof photo === 'string' && photo.startsWith('data:image')) {
        totalImages++;
        const photoPath = `inspections/${inspection.inspection_type}/photos/${inspection.id}_photo_${i}.jpg`;
        const photoUrl = await uploadToSpaces(photo, photoPath);
        if (photoUrl) {
          formData.photos[i] = photoUrl;
          modified = true;
          imagesMigrated++;
        }
      }
    }
  }

  // Process extinguishers with aiCapturedImages (fire extinguisher)
  if (formData.extinguishers && Array.isArray(formData.extinguishers)) {
    for (let i = 0; i < formData.extinguishers.length; i++) {
      const ext = formData.extinguishers[i];
      if (ext.aiCapturedImages && Array.isArray(ext.aiCapturedImages)) {
        for (let j = 0; j < ext.aiCapturedImages.length; j++) {
          const img = ext.aiCapturedImages[j];
          if (img.dataUrl && img.dataUrl.startsWith('data:image')) {
            totalImages++;
            const imgPath = `inspections/fire_extinguisher/ai/${inspection.id}_ext${i}_img${j}.jpg`;
            const imgUrl = await uploadToSpaces(img.dataUrl, imgPath);
            if (imgUrl) {
              ext.aiCapturedImages[j].dataUrl = imgUrl;
              modified = true;
              imagesMigrated++;
            }
          }
        }
      }
    }
  }

  // Process items with photos (first aid, HSE)
  if (formData.items && Array.isArray(formData.items)) {
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (item.photos && Array.isArray(item.photos)) {
        for (let j = 0; j < item.photos.length; j++) {
          const photo = item.photos[j];
          if (photo && typeof photo === 'string' && photo.startsWith('data:image')) {
            totalImages++;
            const photoPath = `inspections/${inspection.inspection_type}/items/${inspection.id}_item${i}_photo${j}.jpg`;
            const photoUrl = await uploadToSpaces(photo, photoPath);
            if (photoUrl) {
              item.photos[j] = photoUrl;
              modified = true;
              imagesMigrated++;
            }
          }
        }
      }
    }
  }

  // Update database if modified
  if (modified) {
    const { error } = await supabase
      .from('inspections')
      .update({
        form_data: formData,
        signature: inspection.signature,
      })
      .eq('id', inspection.id);

    if (error) {
      console.error(`❌ Failed to update inspection ${inspection.id}:`, error.message);
      return { success: false, imagesMigrated: 0, totalImages };
    }
  }

  return { success: modified, imagesMigrated, totalImages };
}

/**
 * Main migration function
 */
async function migrateAllInspections() {
  console.log('🚀 Starting inspection image migration to DigitalOcean Spaces...\n');
  console.log(`📦 Space: ${doSpacesName}`);
  console.log(`🌍 Region: ${doSpacesRegion}`);
  console.log(`🔗 CDN: https://${doSpacesName}.${doSpacesRegion}.cdn.digitaloceanspaces.com\n`);

  try {
    // Fetch all inspections
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch inspections:', error);
      return;
    }

    console.log(`📋 Found ${inspections.length} inspections to process\n`);

    let totalProcessed = 0;
    let totalImagesMigrated = 0;
    let totalImagesFound = 0;
    let inspectionsUpdated = 0;

    for (const inspection of inspections) {
      const shortId = inspection.id.substring(0, 8);
      const inspectionType = inspection.inspection_type?.replace('_', ' ') || 'unknown';
      process.stdout.write(`[${totalProcessed + 1}/${inspections.length}] ${shortId} (${inspectionType})... `);

      const result = await processInspection(inspection);
      totalProcessed++;
      totalImagesFound += result.totalImages;

      if (result.success) {
        totalImagesMigrated += result.imagesMigrated;
        inspectionsUpdated++;
        console.log(`✅ ${result.imagesMigrated}/${result.totalImages} images`);
      } else if (result.totalImages > 0) {
        console.log(`❌ Failed`);
      } else {
        console.log(`⏭️  No images`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(70));
    console.log(`✅ Total inspections processed: ${totalProcessed}`);
    console.log(`✅ Inspections updated: ${inspectionsUpdated}`);
    console.log(`📸 Total images found: ${totalImagesFound}`);
    console.log(`☁️  Images migrated to Spaces: ${totalImagesMigrated}`);

    if (totalImagesMigrated > 0) {
      const estimatedSavings = (totalImagesMigrated * 200) / 1024; // Assume 200KB avg per image
      console.log(`\n💰 Estimated egress reduction per analytics load: ~${estimatedSavings.toFixed(1)} MB`);
      console.log(`💰 Monthly savings (at 100 page loads): ~${(estimatedSavings * 100 / 1024).toFixed(1)} GB`);
      console.log(`\n🎓 Cost with Student Pack: $0 (using your $200 credit!)`);
    }

    console.log('\n✅ Migration complete!');
    console.log(`\n🔗 View your images at:`);
    console.log(`   https://${doSpacesName}.${doSpacesRegion}.cdn.digitaloceanspaces.com/inspections/\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  }
}

// Run migration
migrateAllInspections();
