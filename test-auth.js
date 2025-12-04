// Test authentication flow
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ooriqpeqtfmgfynlbsxb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcmlxcGVxdGZtZ2Z5bmxic3hiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg5NzU0NSwiZXhwIjoyMDc2NDczNTQ1fQ.tCbLZ_236VKS-DqClHzEJH_xAgco8A-iYXc1j5OWIg8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAuth() {
  console.log('=== Testing Authentication ===\n');

  // Test 1: Find an inspector user
  console.log('Test 1: Finding inspector user...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      name,
      pin,
      role,
      is_active,
      user_permissions (
        can_create_inspections,
        can_view_inspections
      )
    `)
    .eq('role', 'inspector')
    .eq('is_active', true)
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error('❌ No inspector found:', userError?.message);
    console.log('\nLet me check all users...');

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, role, pin, is_active')
      .eq('is_active', true);

    console.log('\nActive users:');
    allUsers.forEach(u => {
      console.log(`- ${u.name} (${u.role}, PIN: ${u.pin})`);
    });
    return;
  }

  const testUser = users[0];
  console.log('✅ Inspector found:', testUser.name);
  console.log('User ID:', testUser.id);
  console.log('PIN:', testUser.pin);
  console.log('Role:', testUser.role);
  console.log('Permissions:', testUser.user_permissions);
  console.log();

  // Test 2: Simulate login
  console.log('Test 2: Simulating login with PIN:', testUser.pin);
  console.log('Token would be:', testUser.id);
  console.log();

  // Test 3: Check if user can create inspections
  const permissions = testUser.user_permissions || {};
  console.log('Test 3: Checking permissions...');
  console.log('can_create_inspections:', permissions.can_create_inspections);
  console.log('can_view_inspections:', permissions.can_view_inspections);

  if (!permissions.can_create_inspections) {
    console.log('❌ User does NOT have permission to create inspections!');
    console.log('This needs to be fixed in the database.');
  } else {
    console.log('✅ User has permission to create inspections');
  }
}

testAuth().catch(console.error);
