// Test script to verify manhours template is accessible
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 Testing Monthly Manhours Template Access\n');
console.log('='.repeat(60));
console.log('');

async function testDownload(client, keyType) {
  console.log(`📥 Testing download with ${keyType}...`);

  const { data, error } = await client.storage
    .from('templates')
    .download('monthly manhours.xlsx');

  if (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }

  if (data) {
    console.log(`   ✅ Success! File size: ${(data.size / 1024).toFixed(2)} KB`);
    return true;
  }

  return false;
}

async function main() {
  // Test with anon key (what the app uses)
  console.log('Testing with ANON key (this is what your app uses):\n');
  const anonClient = createClient(supabaseUrl, anonKey);
  const anonSuccess = await testDownload(anonClient, 'anon key');

  console.log('');

  // Test with service key (admin access)
  console.log('Testing with SERVICE key (admin access):\n');
  const serviceClient = createClient(supabaseUrl, serviceKey);
  const serviceSuccess = await testDownload(serviceClient, 'service key');

  console.log('');
  console.log('='.repeat(60));
  console.log('');

  if (anonSuccess) {
    console.log('✅ SUCCESS! The template is accessible to your app.');
    console.log('   Your export should work now. Try the export again.');
  } else if (serviceSuccess && !anonSuccess) {
    console.log('⚠️  PERMISSION ISSUE DETECTED!');
    console.log('');
    console.log('The template exists but is not publicly accessible.');
    console.log('');
    console.log('🔧 FIX: Go to Supabase Dashboard and follow these steps:');
    console.log('');
    console.log('1. Go to Storage → templates bucket');
    console.log('2. Click on "Policies" tab (top right, shows "6" policies)');
    console.log('3. Look for a policy that allows SELECT on bucket_id = \'templates\'');
    console.log('4. If none exists, click "New Policy"');
    console.log('5. Choose "Get started quickly" → "Allow public read access"');
    console.log('6. Make sure:');
    console.log('   - Policy name: "Public read access to templates"');
    console.log('   - Allowed operation: SELECT');
    console.log('   - Target roles: public');
    console.log('7. Click "Save policy"');
    console.log('');
    console.log('Alternatively, you can make the entire bucket public:');
    console.log('1. Go to Storage → templates');
    console.log('2. Click the gear/settings icon');
    console.log('3. Toggle "Public bucket" to ON');
    console.log('4. Save');
  } else {
    console.log('❌ Template file not found!');
    console.log('   Please upload "monthly manhours.xlsx" to the templates bucket.');
  }
}

main().catch(console.error);
