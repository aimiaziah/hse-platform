// Verify and Fix Inspector Permissions for History Access
// This script checks if inspector users have the correct permissions to access the History page

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAndFixInspectorPermissions() {
  console.log('🔍 Checking inspector users and their permissions...\n');

  try {
    // Get all inspector users
    const { data: inspectors, error: inspectorsError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        role,
        is_active,
        user_permissions (
          can_create_inspections,
          can_view_inspections,
          can_view_analytics
        )
      `)
      .eq('role', 'inspector');

    if (inspectorsError) {
      console.error('❌ Error fetching inspectors:', inspectorsError);
      return;
    }

    if (!inspectors || inspectors.length === 0) {
      console.log('⚠️  No inspector users found in the database.');
      return;
    }

    console.log(`✅ Found ${inspectors.length} inspector user(s):\n`);

    const inspectorsToFix = [];

    for (const inspector of inspectors) {
      const permissions = inspector.user_permissions || {};
      const hasCorrectPermissions =
        permissions.can_create_inspections === true &&
        permissions.can_view_inspections === true &&
        permissions.can_view_analytics === true;

      console.log(`Inspector: ${inspector.name} (ID: ${inspector.id})`);
      console.log(`  Active: ${inspector.is_active}`);
      console.log(`  Permissions:`);
      console.log(`    - can_create_inspections: ${permissions.can_create_inspections || false}`);
      console.log(`    - can_view_inspections: ${permissions.can_view_inspections || false}`);
      console.log(`    - can_view_analytics: ${permissions.can_view_analytics || false}`);

      if (!hasCorrectPermissions) {
        console.log(`  ⚠️  MISSING PERMISSIONS - Will fix`);
        inspectorsToFix.push(inspector);
      } else {
        console.log(`  ✅ Has correct permissions`);
      }
      console.log('');
    }

    // Fix permissions for inspectors that need it
    if (inspectorsToFix.length > 0) {
      console.log(`\n🔧 Fixing permissions for ${inspectorsToFix.length} inspector(s)...\n`);

      for (const inspector of inspectorsToFix) {
        const { error: updateError } = await supabase
          .from('user_permissions')
          .upsert(
            {
              user_id: inspector.id,
              // Inspector permissions according to rbac.ts:239-257
              can_manage_users: false,
              can_manage_forms: false,
              can_create_inspections: true, // ✅ Required for History page
              can_view_inspections: true, // ✅ Required for History page
              can_review_inspections: false,
              can_approve_inspections: false,
              can_reject_inspections: false,
              can_view_pending_inspections: false,
              can_view_analytics: true, // ✅ Standard permission
            },
            {
              onConflict: 'user_id',
            }
          );

        if (updateError) {
          console.error(`  ❌ Failed to fix permissions for ${inspector.name}:`, updateError);
        } else {
          console.log(`  ✅ Fixed permissions for ${inspector.name}`);
        }
      }

      console.log('\n✅ Permission fixes completed!');
    } else {
      console.log('✅ All inspectors have correct permissions!');
    }

    console.log('\n📋 Summary:');
    console.log(`  - Total inspectors: ${inspectors.length}`);
    console.log(`  - Fixed: ${inspectorsToFix.length}`);
    console.log(`  - Already correct: ${inspectors.length - inspectorsToFix.length}`);
    console.log('\n✅ Inspectors should now be able to access the History page at /saved');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyAndFixInspectorPermissions();
