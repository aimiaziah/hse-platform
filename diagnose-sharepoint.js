// Diagnostic script to check SharePoint integration status
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseSharePoint() {
  console.log('🔍 SharePoint Integration Diagnostic Report\n');
  console.log('=' .repeat(60));

  // 1. Check environment variables
  console.log('\n1️⃣  Environment Configuration:');
  console.log('   SHAREPOINT_TENANT_ID:', process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID ? '✅ Set' : '❌ Missing');
  console.log('   SHAREPOINT_CLIENT_ID:', process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('   SHAREPOINT_CLIENT_SECRET:', process.env.SHAREPOINT_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('   SHAREPOINT_SITE_URL:', process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL || '❌ Missing');
  console.log('   SHAREPOINT_LIBRARY_NAME:', process.env.SHAREPOINT_LIBRARY_NAME || '❌ Missing');
  console.log('   SHAREPOINT_BASE_FOLDER:', process.env.SHAREPOINT_BASE_FOLDER || '❌ Missing');

  // 2. Check if migration has been applied
  console.log('\n2️⃣  Database Schema:');
  try {
    const { data, error } = await supabase
      .from('inspections')
      .select('sharepoint_sync_status, sharepoint_file_url')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('   ❌ Migration NOT applied - sharepoint columns missing!');
        console.log('   Run: npx supabase db push');
      } else {
        console.log('   ❌ Error checking schema:', error.message);
      }
    } else {
      console.log('   ✅ SharePoint columns exist in inspections table');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // 3. Check recent fire extinguisher inspections
  console.log('\n3️⃣  Recent Fire Extinguisher Inspections:');
  try {
    const { data: inspections, error } = await supabase
      .from('inspections')
      .select('inspection_number, inspected_by, status, sharepoint_sync_status, sharepoint_file_url, created_at')
      .eq('inspection_type', 'fire_extinguisher')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.log('   ❌ Error:', error.message);
    } else if (!inspections || inspections.length === 0) {
      console.log('   ⚠️  No fire extinguisher inspections found');
    } else {
      console.log(`   Found ${inspections.length} recent inspections:\n`);
      inspections.forEach((insp, idx) => {
        console.log(`   ${idx + 1}. ${insp.inspection_number || 'N/A'}`);
        console.log(`      Status: ${insp.status}`);
        console.log(`      SharePoint: ${insp.sharepoint_sync_status || 'N/A'}`);
        console.log(`      URL: ${insp.sharepoint_file_url || 'Not exported'}`);
        console.log(`      Created: ${new Date(insp.created_at).toLocaleString()}\n`);
      });
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // 4. Check SharePoint sync log (failures)
  console.log('4️⃣  SharePoint Sync Failures:');
  try {
    const { data: failures, error } = await supabase
      .from('sharepoint_sync_log')
      .select('inspection_id, sync_type, error_message, metadata, created_at')
      .eq('status', 'failure')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('   ❌ sharepoint_sync_log table missing - migration not applied!');
      } else {
        console.log('   ❌ Error:', error.message);
      }
    } else if (!failures || failures.length === 0) {
      console.log('   ✅ No recent failures found');
    } else {
      console.log(`   ⚠️  Found ${failures.length} recent failures:\n`);
      failures.forEach((fail, idx) => {
        console.log(`   ${idx + 1}. Inspection ID: ${fail.inspection_id}`);
        console.log(`      Error: ${fail.error_message}`);
        console.log(`      Time: ${new Date(fail.created_at).toLocaleString()}`);
        if (fail.metadata) {
          console.log(`      Details: ${JSON.stringify(fail.metadata, null, 2)}`);
        }
        console.log('');
      });
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }

  // 5. Summary
  console.log('=' .repeat(60));
  console.log('\n📋 Summary:');
  console.log('   1. Check if all environment variables are set above');
  console.log('   2. If migration not applied, run: npx supabase db push');
  console.log('   3. Review any failures above for error details');
  console.log('   4. Test by submitting a new fire extinguisher inspection\n');
}

diagnoseSharePoint().catch(console.error);
