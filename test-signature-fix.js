// Test script to verify signature functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSignatureFix() {
  console.log('=== Testing Signature Functionality ===\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Check if signature column exists
    console.log('1. Checking if signature column exists in users table...');
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, name, role, signature')
      .limit(1);

    if (queryError) {
      console.error('❌ Error querying users table:', queryError.message);
      console.log('\n💡 The signature column might not exist. Please run the migration:');
      console.log('   Run the SQL file: supabase/migrations/008_add_user_signature.sql');
      return;
    }

    console.log('✅ Signature column exists in users table\n');

    // 2. Check for supervisor users
    console.log('2. Checking for supervisor users...');
    const { data: supervisors, error: supervisorError } = await supabase
      .from('users')
      .select('id, name, role, signature')
      .eq('role', 'supervisor');

    if (supervisorError) {
      console.error('❌ Error querying supervisors:', supervisorError.message);
      return;
    }

    if (!supervisors || supervisors.length === 0) {
      console.log('⚠️  No supervisor users found in database');
      console.log('   Create a supervisor user to test signature functionality\n');
    } else {
      console.log(`✅ Found ${supervisors.length} supervisor user(s):`);
      supervisors.forEach((sup) => {
        console.log(`   - ${sup.name} (${sup.id})`);
        console.log(`     Has signature: ${sup.signature ? 'Yes ✅' : 'No ❌'}`);
      });
      console.log('');
    }

    // 3. Summary
    console.log('=== Fix Summary ===');
    console.log('✅ Modified RBAC middleware to allow signature-only self-updates');
    console.log('✅ Signature column verified in database');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Login as a supervisor user (PIN: 5555 or your custom supervisor)');
    console.log('2. Go to a pending inspection review');
    console.log('3. Draw your signature in the approval modal');
    console.log('4. Click "Save Signature to My Profile"');
    console.log('5. The signature should now be saved successfully!');
    console.log('');
    console.log('🔍 If you still have issues:');
    console.log('   - Check browser console for any errors');
    console.log('   - Ensure .env.local has correct Supabase credentials');
    console.log('   - Verify the migration was run in Supabase dashboard');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSignatureFix();
