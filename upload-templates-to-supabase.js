// Script to upload template files to Supabase Storage
// Run with: node upload-templates-to-supabase.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'templates';

// Template files to upload - using absolute paths from Downloads folder
const templates = [
  {
    localPath: 'C:\\Users\\Aimi\\Downloads\\form - fire extinguisher.xlsx',
    remotePath: 'fire extinguisher form.xlsx',
    name: 'Fire Extinguisher Form'
  },
  {
    localPath: 'C:\\Users\\Aimi\\Downloads\\first aid form.xlsx',
    remotePath: 'first aid form.xlsx',
    name: 'First Aid Form'
  },
  {
    localPath: 'C:\\Users\\Aimi\\Downloads\\hse inspection form.xlsx',
    remotePath: 'hse inspection form.xlsx',
    name: 'HSE Inspection Form'
  },
  {
    localPath: path.join(__dirname, 'public', 'templates', 'manhours-template.xlsx'),
    remotePath: 'monthly manhours.xlsx',
    name: 'Monthly Manhours Report'
  }
];

async function ensureBucket() {
  console.log('📦 Checking if templates bucket exists...\n');

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Error checking buckets:', error);
    return false;
  }

  const bucketExists = buckets.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log('Creating templates bucket...');
    const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Make bucket public for easy access
      fileSizeLimit: 10485760, // 10MB limit
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return false;
    }
    console.log('✅ Bucket created successfully\n');
  } else {
    console.log('✅ Bucket exists\n');
  }

  return true;
}

async function uploadTemplate(template) {
  console.log(`📤 Uploading: ${template.name}`);
  console.log(`   Local path: ${template.localPath}`);

  // Check if file exists
  if (!fs.existsSync(template.localPath)) {
    console.log(`   ❌ File not found at: ${template.localPath}`);
    console.log(`   Please update the localPath in the script to point to your template file\n`);
    return false;
  }

  // Read file
  const fileBuffer = fs.readFileSync(template.localPath);
  const fileSize = (fileBuffer.length / 1024).toFixed(2);
  console.log(`   File size: ${fileSize} KB`);

  // Upload to Supabase
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(template.remotePath, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.log(`   ❌ Upload failed: ${error.message}\n`);
    return false;
  }

  console.log(`   ✅ Uploaded successfully to: ${BUCKET_NAME}/${template.remotePath}`);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(template.remotePath);

  console.log(`   🔗 Public URL: ${urlData.publicUrl}\n`);

  return true;
}

async function verifyUploads() {
  console.log('🔍 Verifying uploads...\n');

  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    console.error('❌ Error listing files:', error);
    return;
  }

  console.log(`✅ Found ${files.length} files in ${BUCKET_NAME} bucket:`);
  files.forEach(file => {
    const size = (file.metadata?.size / 1024 || 0).toFixed(2);
    console.log(`   - ${file.name} (${size} KB)`);
  });
}

async function main() {
  console.log('🚀 Supabase Template Upload Tool\n');
  console.log('='.repeat(60));
  console.log('');

  // Step 1: Ensure bucket exists
  const bucketReady = await ensureBucket();
  if (!bucketReady) {
    console.error('❌ Failed to prepare bucket. Exiting.');
    return;
  }

  // Step 2: Upload each template
  let successCount = 0;
  for (const template of templates) {
    const success = await uploadTemplate(template);
    if (success) successCount++;
  }

  console.log('='.repeat(60));
  console.log('');

  // Step 3: Verify uploads
  await verifyUploads();

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log(`📊 SUMMARY: ${successCount}/${templates.length} templates uploaded successfully`);
  console.log('');

  if (successCount < templates.length) {
    console.log('⚠️  Some uploads failed. Common issues:');
    console.log('   1. File paths are incorrect - update localPath in the script');
    console.log('   2. Files don\'t exist in the specified location');
    console.log('   3. Insufficient permissions');
    console.log('');
    console.log('💡 To fix: Update the template paths in upload-templates-to-supabase.js');
    console.log('   to match where your Excel templates are actually located.');
  } else {
    console.log('✅ All templates uploaded successfully!');
    console.log('   You can now use the export functionality in your app.');
  }
}

main().catch(console.error);
