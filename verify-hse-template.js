// verify-hse-template.js
// Script to verify the updated HSE Inspection template in Supabase

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verify() {
  console.log('📥 Downloading and verifying updated template from Supabase...\n');

  try {
    const { data, error } = await supabase.storage
      .from('templates')
      .download('hse inspection form.xlsx');

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await data.arrayBuffer());

    console.log('✅ Template verified in Supabase:\n');
    console.log(`Total sheets: ${workbook.worksheets.length}\n`);

    workbook.worksheets.forEach((sheet, i) => {
      console.log(`Sheet ${i + 1}: "${sheet.name}"`);
      console.log(`  Rows: ${sheet.rowCount}`);
      console.log(`  Columns: ${sheet.columnCount}`);
      console.log('');
    });

    if (workbook.worksheets.length === 2) {
      console.log('✅ Success! Template has 2 sheets as expected.');
      console.log('\n📋 Summary:');
      console.log('   Sheet 1: HSE Inspection Checklist');
      console.log('   Sheet 2: HSE Observations');
    } else {
      console.log(`⚠️  Warning: Expected 2 sheets, found ${workbook.worksheets.length}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
