// download-templates-from-supabase.js
// Script to download Excel templates from Supabase Storage to local public/templates folder
// Run this once to get your templates locally

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Templates to download
const templates = [
  { supabaseName: 'fire extinguisher form.xlsx', localName: 'fire-extinguisher-template.xlsx' },
  { supabaseName: 'first aid form.xlsx', localName: 'first-aid-template.xlsx' },
  { supabaseName: 'hse inspection form.xlsx', localName: 'hse-inspection-template.xlsx' },
  { supabaseName: 'monthly manhours.xlsx', localName: 'manhours-template.xlsx' },
];

async function downloadTemplate(supabaseName, localName) {
  console.log(`\n📥 Downloading: ${supabaseName}...`);

  try {
    const { data, error } = await supabase.storage
      .from('templates')
      .download(supabaseName);

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data received');
    }

    // Save to public/templates
    const outputPath = path.join(__dirname, 'public', 'templates', localName);
    const buffer = Buffer.from(await data.arrayBuffer());

    fs.writeFileSync(outputPath, buffer);

    console.log(`   ✅ Saved to: public/templates/${localName}`);
    console.log(`   📊 Size: ${(buffer.length / 1024).toFixed(1)} KB`);

    return true;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Downloading Templates from Supabase Storage\n');
  console.log('This will save templates to public/templates/ for local use');
  console.log('After this, templates will be served locally (zero egress cost!)\n');

  // Ensure public/templates exists
  const templatesDir = path.join(__dirname, 'public', 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
    console.log('✅ Created public/templates/ directory\n');
  }

  let success = 0;
  let failed = 0;

  for (const template of templates) {
    const result = await downloadTemplate(template.supabaseName, template.localName);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Downloaded: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (success > 0) {
    console.log('\n🎉 Success! Templates are now available locally.');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your dev server: npm run dev');
    console.log('   2. Templates will now be served from public/templates/');
    console.log('   3. Supabase only used as fallback if template not found locally');
    console.log('   4. First load will cache templates in browser');
    console.log('   5. Subsequent loads use cache (zero egress!)');
    console.log('\n💰 Expected egress reduction: ~90%');
  }

  if (failed > 0) {
    console.log('\n⚠️  Some templates failed to download.');
    console.log('   Possible reasons:');
    console.log('   - Template not found in Supabase Storage');
    console.log('   - Incorrect bucket name');
    console.log('   - Insufficient permissions');
    console.log('\n   The app will use Supabase as fallback for missing templates.');
  }
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
