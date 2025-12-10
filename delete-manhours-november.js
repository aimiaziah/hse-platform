// Script to delete manhours reports from November 2025
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteManhoursNovember() {
  console.log('🔍 Searching for Manhours Reports from November 2025...\n');

  try {
    // Query all manhours reports
    const { data: reports, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('inspection_type', 'manhours_report');

    if (error) {
      console.error('❌ Error fetching reports:', error.message);
      return;
    }

    console.log(`Found ${reports.length} total manhours reports\n`);

    // Filter for November 2025 reports
    const novemberReports = reports.filter(report => {
      const formData = report.form_data;

      // Check if reportMonth is "Nov" and reportYear is "2025"
      if (formData && formData.reportMonth === 'Nov' && formData.reportYear === '2025') {
        return true;
      }

      return false;
    });

    if (novemberReports.length === 0) {
      console.log('ℹ️  No Manhours Reports found for November 2025');
      console.log('\n📋 Showing all manhours reports:');

      reports.forEach(report => {
        const formData = report.form_data;
        console.log(`  - ID: ${report.id}`);
        console.log(`    Date: ${report.inspection_date}`);
        console.log(`    Month: ${formData?.reportMonth} ${formData?.reportYear}`);
        console.log(`    Status: ${report.status}`);
        console.log(`    Inspector: ${report.inspected_by}`);
        console.log('');
      });

      return;
    }

    console.log(`✅ Found ${novemberReports.length} report(s) from November 2025:\n`);

    novemberReports.forEach(report => {
      const formData = report.form_data;
      console.log(`  📄 Report ID: ${report.id}`);
      console.log(`     Prepared By: ${formData?.preparedBy || report.inspected_by}`);
      console.log(`     Date: ${report.inspection_date}`);
      console.log(`     Month/Year: ${formData?.reportMonth} ${formData?.reportYear}`);
      console.log(`     Status: ${report.status}`);
      console.log('');
    });

    // Delete each report
    for (const report of novemberReports) {
      console.log(`🗑️  Deleting report ${report.id}...`);

      const { error: deleteError } = await supabase
        .from('inspections')
        .delete()
        .eq('id', report.id);

      if (deleteError) {
        console.error(`   ❌ Failed to delete report ${report.id}:`, deleteError.message);
      } else {
        console.log(`   ✅ Successfully deleted report ${report.id}`);
      }
    }

    console.log('\n✅ Deletion complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

deleteManhoursNovember();
