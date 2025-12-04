// Verify Template Download and Comparison
// This script downloads templates and verifies they match Supabase versions

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const templates = [
  { supabaseName: 'fire extinguisher form.xlsx', localName: 'fire-extinguisher-template.xlsx' },
  { supabaseName: 'first aid form.xlsx', localName: 'first-aid-template.xlsx' },
  { supabaseName: 'hse inspection form.xlsx', localName: 'hse-inspection-template.xlsx' },
  { supabaseName: 'monthly manhours.xlsx', localName: 'manhours-template.xlsx' },
  { supabaseName: 'observation form.xlsx', localName: 'observation-template.xlsx' },
];

async function checkTemplateHasImages(filePath, templateName) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    let totalImages = 0;
    workbook.worksheets.forEach(worksheet => {
      const images = worksheet.getImages();
      totalImages += images.length;
    });

    if (totalImages > 0) {
      console.log(`   🖼️  Found ${totalImages} image(s) (includes logos)`);
      return true;
    } else {
      console.log(`   ⚠️  No images found in template`);
      return false;
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check images: ${error.message}`);
    return false;
  }
}

async function downloadAndVerifyTemplate(supabaseName, localName) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📥 Processing: ${supabaseName}`);
  console.log(`${'='.repeat(70)}`);

  try {
    // Step 1: Download from Supabase
    console.log('1️⃣  Downloading from Supabase...');
    const { data, error } = await supabase.storage
      .from('templates')
      .download(supabaseName);

    if (error) throw error;
    if (!data) throw new Error('No data received');

    const buffer = Buffer.from(await data.arrayBuffer());
    console.log(`   ✅ Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);

    // Step 2: Save to local
    console.log('2️⃣  Saving to local folder...');
    const outputPath = path.join(__dirname, 'public', 'templates', localName);
    fs.writeFileSync(outputPath, buffer);
    console.log(`   ✅ Saved to: public/templates/${localName}`);

    // Step 3: Verify file exists and size matches
    console.log('3️⃣  Verifying file integrity...');
    const savedBuffer = fs.readFileSync(outputPath);
    if (savedBuffer.length === buffer.length) {
      console.log(`   ✅ File size matches: ${(savedBuffer.length / 1024).toFixed(1)} KB`);
    } else {
      console.log(`   ❌ File size mismatch!`);
      return false;
    }

    // Step 4: Check for images/logos
    console.log('4️⃣  Checking for images/logos...');
    await checkTemplateHasImages(outputPath, localName);

    console.log(`\n✅ SUCCESS: ${localName} ready to use!`);
    return true;

  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 Template Download & Verification Tool                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('\nThis will:');
  console.log('  1. Download templates from Supabase');
  console.log('  2. Save to public/templates/');
  console.log('  3. Verify file integrity');
  console.log('  4. Check for logos/images\n');

  // Ensure directory exists
  const templatesDir = path.join(__dirname, 'public', 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
    console.log('✅ Created public/templates/ directory\n');
  }

  let success = 0;
  let failed = 0;

  for (const template of templates) {
    const result = await downloadAndVerifyTemplate(template.supabaseName, template.localName);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  📊 SUMMARY                                                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Successfully downloaded: ${success}/${templates.length}`);
  console.log(`❌ Failed: ${failed}/${templates.length}\n`);

  if (success > 0) {
    console.log('🎉 Templates are now available locally!\n');
    console.log('📋 Next steps:');
    console.log('   1. Check the files in public/templates/ folder');
    console.log('   2. Open one in Excel to verify logos are present');
    console.log('   3. Run your dev server and test exports');
    console.log('   4. Turn Supabase bucket back to PRIVATE\n');
    console.log('💡 Templates will now load from:');
    console.log('   1st: Browser cache (after first use)');
    console.log('   2nd: Local files (public/templates/)');
    console.log('   3rd: Supabase (fallback only)\n');
  }

  if (failed > 0) {
    console.log('\n⚠️  Some templates failed:');
    console.log('   Possible reasons:');
    console.log('   - Templates bucket is still PRIVATE');
    console.log('   - Template file name mismatch');
    console.log('   - Network error\n');
    console.log('   💡 Make sure templates bucket is PUBLIC before running this script\n');
  }
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
