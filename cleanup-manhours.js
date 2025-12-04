// cleanup-manhours.js
// Script to delete all manhours reports from the database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function cleanupManhoursReports() {
  console.log('🧹 Starting manhours report cleanup...\n');

  try {
    // First, count how many manhours reports exist
    const { count: totalCount, error: countError } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('inspection_type', 'manhours_report');

    if (countError) {
      console.error('❌ Error counting manhours reports:', countError.message);
      return;
    }

    console.log(`📊 Found ${totalCount} manhours report(s) in the database`);

    if (totalCount === 0) {
      console.log('✅ No manhours reports to delete');
      return;
    }

    // Ask for confirmation (in a script context, we'll just proceed)
    console.log(`\n⚠️  WARNING: This will permanently delete all ${totalCount} manhours report(s)`);
    console.log('Proceeding with deletion in 3 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all manhours reports
    const { data: deletedReports, error: deleteError } = await supabase
      .from('inspections')
      .delete()
      .eq('inspection_type', 'manhours_report')
      .select('id, inspection_date, form_data');

    if (deleteError) {
      console.error('❌ Error deleting manhours reports:', deleteError.message);
      return;
    }

    console.log(`✅ Successfully deleted ${deletedReports?.length || 0} manhours report(s)`);

    // Show details of deleted reports
    if (deletedReports && deletedReports.length > 0) {
      console.log('\n📋 Deleted reports:');
      deletedReports.forEach((report, index) => {
        const formData = report.form_data || {};
        const month = formData.reportMonth || 'N/A';
        const year = formData.reportYear || 'N/A';
        const preparedBy = formData.preparedBy || 'N/A';
        console.log(`   ${index + 1}. ${month} ${year} - Prepared by: ${preparedBy} (ID: ${report.id})`);
      });
    }

    // Verify deletion
    const { count: remainingCount, error: verifyError } = await supabase
      .from('inspections')
      .select('*', { count: 'exact', head: true })
      .eq('inspection_type', 'manhours_report');

    if (verifyError) {
      console.error('❌ Error verifying deletion:', verifyError.message);
      return;
    }

    console.log(`\n✅ Verification: ${remainingCount} manhours report(s) remaining in database`);
    console.log('🎉 Cleanup completed successfully!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the cleanup
cleanupManhoursReports()
  .then(() => {
    console.log('✅ Script execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
