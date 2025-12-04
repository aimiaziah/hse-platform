const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixData() {
  console.log('Looking for Feb/Mar 2024 reports with 2025 inspection dates...\n');

  // Query manhours reports with Feb/Mar 2024 in form_data but 2025 inspection_date
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('inspection_type', 'manhours_report')
    .gte('inspection_date', '2025-02-01')
    .lte('inspection_date', '2025-03-31');

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(`Found ${data.length} reports to check\n`);

  for (const report of data) {
    const formData = report.form_data || {};
    const month = formData.reportMonth;
    const year = formData.reportYear;

    if ((month === 'Feb' || month === 'Mar') && year === '2024') {
      console.log(`Fixing report: ${month} ${year} -> ${month} 2025`);
      console.log(`  Report ID: ${report.id}`);
      console.log(`  Current Year in form_data: ${year}`);
      console.log(`  Inspection Date: ${report.inspection_date}`);

      // Update the form_data to change year from 2024 to 2025
      const updatedFormData = {
        ...formData,
        reportYear: '2025',
      };

      const { error: updateError } = await supabase
        .from('inspections')
        .update({ form_data: updatedFormData })
        .eq('id', report.id);

      if (updateError) {
        console.error(`  ❌ Error updating report ${report.id}:`, updateError);
      } else {
        console.log(`  ✅ Successfully updated to 2025\n`);
      }
    }
  }

  console.log('\n=== Verification ===');
  console.log('Checking updated data...\n');

  // Verify the fix
  const { data: verifyData, error: verifyError } = await supabase
    .from('inspections')
    .select('*')
    .eq('inspection_type', 'manhours_report')
    .gte('inspection_date', '2025-02-01')
    .lte('inspection_date', '2025-03-31');

  if (!verifyError && verifyData) {
    verifyData.forEach(report => {
      const formData = report.form_data || {};
      console.log(`- ${formData.reportMonth} ${formData.reportYear}: ${formData.numEmployees} employees`);
    });
  }

  console.log('\n✅ Data cleanup complete!');
}

fixData().catch(console.error);
