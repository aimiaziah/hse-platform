// upload-hse-template.js
// Script to upload updated HSE Inspection template to Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadTemplate() {
  const templatePath = path.join(__dirname, 'public', 'templates', 'hse-inspection-template.xlsx');
  const supabaseName = 'hse inspection form.xlsx';

  console.log('\n🚀 Uploading Updated HSE Inspection Template to Supabase\n');

  try {
    // Read the file
    console.log('📖 Reading template file...');
    const fileBuffer = fs.readFileSync(templatePath);
    console.log(`   ✅ File loaded (${(fileBuffer.length / 1024).toFixed(1)} KB)`);

    // Verify it has 2 sheets
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);
    console.log(`\n📋 Template verification:`);
    console.log(`   Sheets: ${workbook.worksheets.length}`);
    workbook.worksheets.forEach((sheet, index) => {
      console.log(`     ${index + 1}. ${sheet.name} (${sheet.rowCount} rows)`);
    });

    if (workbook.worksheets.length !== 2) {
      throw new Error(`Expected 2 sheets, found ${workbook.worksheets.length}`);
    }

    // Upload to Supabase (will replace existing file)
    console.log(`\n📤 Uploading to Supabase storage...`);
    console.log(`   Bucket: templates`);
    console.log(`   Path: ${supabaseName}`);

    const { data, error } = await supabase.storage
      .from('templates')
      .upload(supabaseName, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true // Replace existing file
      });

    if (error) {
      throw error;
    }

    console.log(`   ✅ Upload successful!`);

    // Verify the upload
    console.log(`\n🔍 Verifying upload...`);
    const { data: listData, error: listError } = await supabase.storage
      .from('templates')
      .list();

    if (listError) {
      throw listError;
    }

    const uploadedFile = listData.find(f => f.name === supabaseName);
    if (uploadedFile) {
      console.log(`   ✅ File verified in Supabase`);
      console.log(`   Size: ${(uploadedFile.metadata?.size / 1024).toFixed(1)} KB`);
      console.log(`   Updated: ${uploadedFile.updated_at || uploadedFile.created_at}`);
    } else {
      console.log(`   ⚠️  File not found in listing (but upload succeeded)`);
    }

    console.log('\n✅ Success! Template uploaded to Supabase');
    console.log('\n📋 What changed:');
    console.log('   - HSE Inspection template now has 2 sheets');
    console.log('   - Sheet 1: HSE Inspection Checklist');
    console.log('   - Sheet 2: HSE Observations');
    console.log('\n📋 Next steps:');
    console.log('   1. Clear browser cache if needed');
    console.log('   2. Test the export functionality in the app');
    console.log('   3. Verify both sheets appear in exported reports');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

uploadTemplate();
