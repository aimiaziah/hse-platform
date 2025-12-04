// Diagnostic script to test Supabase Storage access
// Run with: node test-supabase-storage.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageAccess() {
  console.log('🔍 Testing Supabase Storage Access\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  // Test 1: List buckets
  console.log('📦 Test 1: Listing all buckets...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError.message);
  } else {
    console.log('✅ Found buckets:', buckets.map(b => b.name).join(', '));
  }
  console.log('');

  // Test 2: List files in templates bucket
  console.log('📁 Test 2: Listing files in "templates" bucket...');
  const { data: files, error: filesError } = await supabase.storage
    .from('templates')
    .list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (filesError) {
    console.error('❌ Error listing files:', filesError.message);
  } else {
    console.log(`✅ Found ${files.length} files in templates bucket:`);
    files.forEach(file => {
      console.log(`   - ${file.name}`);
    });
  }
  console.log('');

  // Test 3: Try to download the HSE Inspection template
  const templatePaths = [
    'hse inspection form.xlsx',
    'hse-inspection-form.xlsx',
    'hse_inspection_form.xlsx',
    'HSE Inspection form.xlsx',
  ];

  console.log('📥 Test 3: Attempting to download HSE Inspection template...');
  for (const path of templatePaths) {
    console.log(`   Trying: "${path}"`);
    const { data, error } = await supabase.storage
      .from('templates')
      .download(path);

    if (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    } else {
      console.log(`   ✅ SUCCESS! Template found at: "${path}"`);
      console.log(`   File size: ${data.size} bytes`);
      break;
    }
  }
  console.log('');

  // Test 4: Check public access
  console.log('🔓 Test 4: Checking public URL access...');
  const { data: publicUrl } = supabase.storage
    .from('templates')
    .getPublicUrl('hse inspection form.xlsx');

  console.log('   Public URL:', publicUrl.publicUrl);
  console.log('   Note: If the bucket is not public, this URL will not work');
  console.log('');

  // Summary
  console.log('📋 SUMMARY AND RECOMMENDATIONS:');
  console.log('');
  console.log('If you see errors above:');
  console.log('1. Check that the "templates" bucket exists in Supabase Storage');
  console.log('2. Make sure the file is named exactly "hse inspection form.xlsx" (with spaces)');
  console.log('3. Verify the bucket has the correct RLS policies');
  console.log('4. For public access, enable "Public bucket" in Supabase dashboard');
  console.log('');
  console.log('To fix in Supabase Dashboard:');
  console.log('1. Go to Storage > templates bucket');
  console.log('2. Upload the file "hse inspection form.xlsx"');
  console.log('3. Go to Policies tab and add a policy:');
  console.log('   - Name: "Public read access"');
  console.log('   - Allowed operation: SELECT');
  console.log('   - Policy definition: true (allows everyone)');
}

testStorageAccess().catch(console.error);
