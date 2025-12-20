// Download Excel templates from Supabase Storage to local public/templates
// Run with: npm run download:templates

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Template mappings: Supabase filename → Local filename
const TEMPLATES = {
  // Try common Supabase naming patterns
  'fire extinguisher form.xlsx': 'fire-extinguisher-template.xlsx',
  'fire-extinguisher-template.xlsx': 'fire-extinguisher-template.xlsx',
  'first aid form.xlsx': 'first-aid-template.xlsx',
  'first-aid-template.xlsx': 'first-aid-template.xlsx',
  'hse inspection form.xlsx': 'hse-inspection-template.xlsx',
  'hse-inspection-template.xlsx': 'hse-inspection-template.xlsx',
  'monthly manhours.xlsx': 'manhours-template.xlsx',
  'manhours-template.xlsx': 'manhours-template.xlsx',
  'observation form.xlsx': 'observation-template.xlsx',
  'observation-template.xlsx': 'observation-template.xlsx',
};

async function listSupabaseTemplates() {
  console.log('📋 Listing templates in Supabase storage...\n');

  const { data, error } = await supabase.storage.from('templates').list();

  if (error) {
    console.error('❌ Error listing templates:', error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No templates found in Supabase storage bucket "templates"');
    return [];
  }

  console.log('Found templates:');
  data.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
  });
  console.log('');

  return data.map((file) => file.name);
}

async function downloadTemplate(supabaseFileName, localFileName) {
  try {
    console.log(`📥 Downloading: ${supabaseFileName}`);

    const { data, error } = await supabase.storage.from('templates').download(supabaseFileName);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return false;
    }

    if (!data) {
      console.error(`   ❌ No data received`);
      return false;
    }

    // Save to public/templates/
    const outputPath = path.join(__dirname, 'public', 'templates', localFileName);
    const buffer = Buffer.from(await data.arrayBuffer());

    fs.writeFileSync(outputPath, buffer);

    console.log(`   ✅ Saved as: ${localFileName} (${(buffer.length / 1024).toFixed(2)} KB)`);
    return true;
  } catch (error) {
    console.error(`   ❌ Exception: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Template Download Script');
  console.log('============================\n');

  // Ensure public/templates directory exists
  const templatesDir = path.join(__dirname, 'public', 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
    console.log('✅ Created public/templates directory\n');
  }

  // List all templates in Supabase
  const supabaseFiles = await listSupabaseTemplates();

  if (supabaseFiles.length === 0) {
    console.log('\n💡 Tip: Upload your branded templates to Supabase Storage first:');
    console.log('   1. Go to Supabase Dashboard → Storage → templates bucket');
    console.log('   2. Upload your Excel templates with Theta logo');
    console.log('   3. Run this script again');
    process.exit(0);
  }

  console.log('⬇️  Starting downloads...\n');

  let successCount = 0;
  let failCount = 0;

  // Download each template
  for (const supabaseFile of supabaseFiles) {
    // Skip non-Excel files
    if (!supabaseFile.endsWith('.xlsx')) {
      console.log(`⏭️  Skipping non-Excel file: ${supabaseFile}`);
      continue;
    }

    // Determine local filename
    const localFileName = TEMPLATES[supabaseFile] || supabaseFile;

    const success = await downloadTemplate(supabaseFile, localFileName);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    console.log('');
  }

  // Summary
  console.log('============================');
  console.log('📊 Summary:');
  console.log(`   ✅ Downloaded: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('============================\n');

  if (successCount > 0) {
    console.log('✨ Templates downloaded successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Your app will now use these local templates (with Theta logo)');
    console.log('  2. This reduces Supabase egress to near zero');
    console.log('  3. Templates are deployed with your app to DigitalOcean');
    console.log('');
    console.log('💡 You can now safely remove templates from Supabase Storage if you want.');
  }
}

main().catch(console.error);
