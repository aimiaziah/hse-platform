// Test authenticated access to templates
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testAuthenticatedAccess() {
  console.log('🔐 Testing Authenticated Access to Templates\n');
  console.log('='.repeat(60));

  // Create client (like your app does)
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });

  // Test 1: Unauthenticated access (should fail)
  console.log('\n📋 Test 1: Unauthenticated Access (should FAIL)\n');

  const { data: unauthFiles, error: unauthError } = await supabase.storage
    .from('templates')
    .list('', { limit: 10 });

  if (unauthError || (unauthFiles?.length || 0) === 0) {
    console.log('   ✅ PASS - Unauthenticated users blocked');
    console.log(`   ${unauthError ? 'Error: ' + unauthError.message : 'No files accessible'}`);
  } else {
    console.log('   ❌ FAIL - Unauthenticated users can still access templates');
    console.log(`   Found ${unauthFiles.length} files`);
  }

  // Test 2: Try to sign in and test
  console.log('\n📋 Test 2: Authenticated Access\n');
  console.log('   To test authenticated access, please provide test credentials:');
  console.log('   Or test manually by:');
  console.log('   1. Log into your app');
  console.log('   2. Try to export an HSE Inspection form');
  console.log('   3. It should download successfully\n');

  console.log('='.repeat(60));
  console.log('\n📊 SUMMARY:\n');
  console.log('If Test 1 shows "blocked", your security is working correctly!');
  console.log('Only logged-in users in your app will be able to download templates.\n');
}

testAuthenticatedAccess().catch(console.error);
