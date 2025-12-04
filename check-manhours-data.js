const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  // Query manhours reports
  const { data, error } = await supabase
    .from('inspections')
    .select('*')
    .eq('inspection_type', 'manhours_report')
    .order('inspection_date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total manhours reports:', data.length);
  console.log('\nReport breakdown:');

  data.forEach(report => {
    const formData = report.form_data || {};
    const month = formData.reportMonth || 'Unknown';
    const year = formData.reportYear || 'Unknown';
    const employees = formData.numEmployees || '0';
    const manHours = formData.monthlyManHours || '0';
    const date = report.inspection_date || 'No date';
    const status = report.status || 'unknown';

    console.log(`- ${month} ${year}: ${employees} employees, ${manHours} hours (date: ${date}, status: ${status})`);
  });

  // Check specifically for Feb and Mar 2025
  console.log('\n\n=== Checking Feb & Mar 2025 ===');
  const febMar = data.filter(report => {
    const formData = report.form_data || {};
    const month = formData.reportMonth;
    const year = formData.reportYear;
    return (month === 'Feb' || month === 'Mar') && year === '2025';
  });

  if (febMar.length > 0) {
    console.log('Found Feb/Mar 2025 reports:');
    febMar.forEach(report => {
      const formData = report.form_data || {};
      console.log('\nReport ID:', report.id);
      console.log('Month:', formData.reportMonth);
      console.log('Year:', formData.reportYear);
      console.log('Employees:', formData.numEmployees);
      console.log('Monthly Man Hours:', formData.monthlyManHours);
      console.log('Inspection Date:', report.inspection_date);
      console.log('Status:', report.status);
      console.log('Monthly Data:', JSON.stringify(formData.monthlyData, null, 2));
    });
  } else {
    console.log('No Feb/Mar 2025 reports found');
  }
}

checkData().catch(console.error);
