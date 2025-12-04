// Verify user permissions in Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyUserPermissions() {
  console.log('🔍 Fetching all users and their permissions...\n');

  // Get all users with permissions
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      role,
      pin,
      is_active,
      user_permissions (
        can_manage_users,
        can_manage_forms,
        can_create_inspections,
        can_view_inspections,
        can_review_inspections,
        can_approve_inspections,
        can_reject_inspections,
        can_view_pending_inspections,
        can_view_analytics
      )
    `)
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('⚠️  No active users found in database');
    return;
  }

  console.log(`Found ${users.length} active user(s):\n`);

  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} (${user.role})`);
    console.log(`   PIN: ${user.pin}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Permissions:`, user.user_permissions || 'No permissions record');
    console.log('');
  });

  // Check if any user is missing permissions
  const usersWithoutPermissions = users.filter(u => !u.user_permissions);

  if (usersWithoutPermissions.length > 0) {
    console.log('⚠️  Users without permissions record:');
    usersWithoutPermissions.forEach(u => {
      console.log(`   - ${u.name} (${u.role}) - PIN: ${u.pin}`);
    });
    console.log('\n💡 Fixing missing permissions...\n');

    // Create permissions for users without them
    for (const user of usersWithoutPermissions) {
      const defaultPermissions = {
        user_id: user.id,
        can_manage_users: user.role === 'admin',
        can_manage_forms: user.role === 'admin',
        can_create_inspections: ['admin', 'inspector'].includes(user.role),
        can_view_inspections: ['admin', 'inspector', 'supervisor'].includes(user.role),
        can_review_inspections: ['admin', 'supervisor'].includes(user.role),
        can_approve_inspections: ['admin', 'supervisor'].includes(user.role),
        can_reject_inspections: ['admin', 'supervisor'].includes(user.role),
        can_view_pending_inspections: ['admin', 'supervisor'].includes(user.role),
        can_view_analytics: true, // All users can view analytics
      };

      const { error: insertError } = await supabase
        .from('user_permissions')
        .insert(defaultPermissions);

      if (insertError) {
        console.error(`   ❌ Failed to create permissions for ${user.name}:`, insertError);
      } else {
        console.log(`   ✅ Created permissions for ${user.name}`);
      }
    }
  } else {
    console.log('✅ All users have permissions records');
  }
}

verifyUserPermissions()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
