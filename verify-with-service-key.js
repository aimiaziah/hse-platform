// Verify templates using service role key
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verifying templates with different keys\n');
console.log('='.repeat(60));

async function test() {
  // Test with service key
  console.log('\n📋 Test 1: Using SERVICE ROLE KEY\n');
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: serviceFiles, error: serviceError } = await serviceClient.storage
    .from('templates')
    .list('', { limit: 100 });

  if (serviceError) {
    console.log('❌ Error:', serviceError);
  } else {
    console.log(`✅ Found ${serviceFiles.length} files:`);
    serviceFiles.forEach(f => {
      console.log(`   - ${f.name} (${(f.metadata?.size / 1024 || 0).toFixed(2)} KB)`);
    });
  }

  // Test download with service key
  console.log('\n📥 Download test with service key:');
  const { data: dlData, error: dlError } = await serviceClient.storage
    .from('templates')
    .download('hse inspection form.xlsx');

  if (dlError) {
    console.log('❌ Error:', dlError);
  } else {
    console.log(`✅ Downloaded successfully (${dlData.size} bytes)`);
  }

  // Test with anon key
  console.log('\n📋 Test 2: Using ANON KEY\n');
  const anonClient = createClient(supabaseUrl, anonKey);

  const { data: anonFiles, error: anonError } = await anonClient.storage
    .from('templates')
    .list('', { limit: 100 });

  if (anonError) {
    console.log('❌ Error:', anonError);
  } else {
    console.log(`✅ Found ${anonFiles.length} files:`);
    anonFiles.forEach(f => {
      console.log(`   - ${f.name}`);
    });
  }

  // Test download with anon key
  console.log('\n📥 Download test with anon key:');
  const { data: anonDlData, error: anonDlError } = await anonClient.storage
    .from('templates')
    .download('hse inspection form.xlsx');

  if (anonDlError) {
    console.log('❌ Error:', anonDlError);
  } else {
    console.log(`✅ Downloaded successfully (${anonDlData.size} bytes)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 DIAGNOSIS:');
  if (serviceFiles.length > 0 && anonFiles.length === 0) {
    console.log('❌ Files exist but anon key cannot access them');
    console.log('   → RLS policies are blocking access');
    console.log('   → You need to make the bucket public OR add RLS policies');
  } else if (serviceFiles.length === 0) {
    console.log('❌ No files found even with service key');
    console.log('   → Files were not uploaded successfully');
  } else {
    console.log('✅ Everything is working correctly!');
  }
}

test().catch(console.error);
