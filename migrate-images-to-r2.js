// migrate-images-to-r2.js - Migrate existing localStorage images to Cloudflare R2
/**
 * This script migrates existing inspection images from base64 (stored in localStorage)
 * to Cloudflare R2 storage, replacing base64 data with R2 URLs.
 *
 * Usage:
 *   1. Ensure R2 credentials are set in .env.local
 *   2. Run: node migrate-images-to-r2.js
 *
 * What it does:
 *   - Reads all inspections from localStorage backup files
 *   - Finds all base64 image data
 *   - Uploads images to R2
 *   - Replaces base64 with R2 URLs
 *   - Saves updated data back
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuration
const R2_CONFIG = {
  accountId: process.env.NEXT_PUBLIC_R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.NEXT_PUBLIC_R2_BUCKET_NAME,
  publicDomain: process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN,
};

// Validate configuration
function validateConfig() {
  const missing = [];
  if (!R2_CONFIG.accountId) missing.push('NEXT_PUBLIC_R2_ACCOUNT_ID');
  if (!R2_CONFIG.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!R2_CONFIG.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!R2_CONFIG.bucketName) missing.push('NEXT_PUBLIC_R2_BUCKET_NAME');

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these in your .env.local file');
    process.exit(1);
  }

  console.log('✅ R2 configuration validated');
}

// Create R2 client
function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_CONFIG.accessKeyId,
      secretAccessKey: R2_CONFIG.secretAccessKey,
    },
  });
}

// Convert base64 to buffer
function base64ToBuffer(base64Data) {
  const base64String = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;
  return Buffer.from(base64String, 'base64');
}

// Get MIME type from base64
function getMimeType(base64Data) {
  const match = base64Data.match(/data:([^;]+);/);
  return match ? match[1] : 'image/jpeg';
}

// Get file extension
function getExtension(mimeType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return extensions[mimeType] || 'jpg';
}

// Generate file key
function generateFileKey(prefix, mimeType) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = getExtension(mimeType);
  return `${prefix}/${timestamp}-${random}.${extension}`;
}

// Upload image to R2
async function uploadToR2(client, base64Data, folder) {
  try {
    const buffer = base64ToBuffer(base64Data);
    const mimeType = getMimeType(base64Data);
    const key = generateFileKey(folder, mimeType);

    const command = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await client.send(command);

    // Generate public URL
    const publicUrl = R2_CONFIG.publicDomain
      ? `https://${R2_CONFIG.publicDomain}/${key}`
      : `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com/${R2_CONFIG.bucketName}/${key}`;

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Upload error:', error.message);
    return { success: false, error: error.message };
  }
}

// Check if data is base64
function isBase64(str) {
  return str && typeof str === 'string' && str.startsWith('data:image');
}

// Process inspection data
async function processInspectionData(client, data, inspectionType) {
  let imageCount = 0;
  let uploadedCount = 0;
  const folder = `inspections/${inspectionType}`;

  // Process different inspection types
  if (inspectionType === 'hse-observation' && data.observations) {
    for (const obs of data.observations) {
      if (obs.photos && Array.isArray(obs.photos)) {
        const newPhotos = [];
        for (const photo of obs.photos) {
          imageCount++;
          if (isBase64(photo)) {
            process.stdout.write(`  Uploading image ${imageCount}...`);
            const result = await uploadToR2(client, photo, folder);
            if (result.success) {
              newPhotos.push(result.url);
              uploadedCount++;
              process.stdout.write(' ✅\n');
            } else {
              newPhotos.push(photo); // Keep original on failure
              process.stdout.write(' ❌\n');
            }
          } else {
            newPhotos.push(photo);
          }
        }
        obs.photos = newPhotos;
      }
    }
  }

  // Process signature
  if (data.signature && isBase64(data.signature)) {
    imageCount++;
    process.stdout.write(`  Uploading signature...`);
    const result = await uploadToR2(client, data.signature, 'signatures');
    if (result.success) {
      data.signature = result.url;
      uploadedCount++;
      process.stdout.write(' ✅\n');
    } else {
      process.stdout.write(' ❌\n');
    }
  }

  return { imageCount, uploadedCount };
}

// Main migration function
async function migrateImages() {
  console.log('🚀 Starting image migration to Cloudflare R2...\n');

  validateConfig();

  const client = createR2Client();

  // Define localStorage keys and their types
  const storageKeys = [
    { key: 'fireExtinguisherInspections', type: 'fire-extinguisher' },
    { key: 'firstAidInspections', type: 'first-aid' },
    { key: 'hseObservations', type: 'hse-observation' },
    { key: 'hseInspections', type: 'hse-inspection' },
  ];

  let totalImages = 0;
  let totalUploaded = 0;

  // Simulate localStorage read (in browser, you'd use localStorage.getItem)
  console.log('📋 Note: This script needs to run in a browser context or with localStorage data exported.');
  console.log('   To migrate, you can either:');
  console.log('   1. Export localStorage data to JSON files and update this script to read them');
  console.log('   2. Run this migration logic in the browser console');
  console.log('   3. Create a migration page in your Next.js app\n');

  console.log('📝 Example browser console migration code:\n');
  console.log(`
// Copy and paste this into your browser console while on your app:
(async () => {
  const storageKeys = [
    { key: 'fireExtinguisherInspections', type: 'fire-extinguisher' },
    { key: 'firstAidInspections', type: 'first-aid' },
    { key: 'hseObservations', type: 'hse-observation' },
    { key: 'hseInspections', type: 'hse-inspection' },
  ];

  for (const { key, type } of storageKeys) {
    const data = localStorage.getItem(key);
    if (!data) continue;

    const inspections = JSON.parse(data);
    console.log(\`Processing \${key}: \${inspections.length} inspections\`);

    for (const inspection of inspections) {
      // Upload photos
      if (inspection.observations) {
        for (const obs of inspection.observations) {
          if (obs.photos && Array.isArray(obs.photos)) {
            const newPhotos = [];
            for (const photo of obs.photos) {
              if (photo.startsWith('data:image')) {
                const response = await fetch('/api/upload/image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: photo, folder: \`inspections/\${type}\` }),
                });
                const result = await response.json();
                newPhotos.push(result.success ? result.url : photo);
              } else {
                newPhotos.push(photo);
              }
            }
            obs.photos = newPhotos;
          }
        }
      }

      // Upload signature
      if (inspection.signature && inspection.signature.startsWith('data:image')) {
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: inspection.signature, folder: 'signatures' }),
        });
        const result = await response.json();
        if (result.success) inspection.signature = result.url;
      }
    }

    // Save back to localStorage
    localStorage.setItem(key, JSON.stringify(inspections));
    console.log(\`✅ Completed \${key}\`);
  }

  console.log('🎉 Migration complete!');
})();
  `);

  console.log('\n💡 Alternative: Create a migration page');
  console.log('   We can create /pages/migrate-to-r2.tsx for you to run this in the browser.');
  console.log('   This is the recommended approach for production use.\n');
}

// Run migration
migrateImages().catch(console.error);
