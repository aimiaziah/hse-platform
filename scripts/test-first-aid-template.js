/**
 * Test First Aid Template Setup
 * Verifies that the first aid template exists and can be downloaded
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testFirstAidTemplate() {
  console.log('\n' + '='.repeat(70));
  log('🧪 FIRST AID TEMPLATE TEST', 'cyan');
  console.log('='.repeat(70) + '\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    log('❌ Missing environment variables!', 'red');
    log('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  log('Step 1: Checking Templates Bucket...', 'blue');
  console.log('─'.repeat(70));

  try {
    const { data: files, error } = await supabase.storage
      .from('templates')
      .list('', {
        limit: 100,
        offset: 0
      });

    if (error) {
      log(`❌ Error: ${error.message}`, 'red');
      process.exit(1);
    }

    if (!files || files.length === 0) {
      log('⚠️  Templates bucket is empty!', 'yellow');
      process.exit(1);
    }

    log(`✅ Found ${files.length} template(s):`, 'green');
    files.forEach(file => {
      const size = (file.metadata?.size || 0) / 1024;
      const icon = file.name.includes('fire') ? '🔥' :
                   file.name.includes('first') || file.name.includes('aid') ? '🏥' : '📄';
      console.log(`   ${icon} ${file.name} (${size.toFixed(2)} KB)`);
    });
    console.log();

    // Check for fire extinguisher template
    const fireTemplate = files.find(f =>
      f.name.toLowerCase().includes('fire') &&
      f.name.toLowerCase().includes('extinguisher')
    );

    if (fireTemplate) {
      log('✅ Fire Extinguisher template found', 'green');
    } else {
      log('⚠️  Fire Extinguisher template NOT found', 'yellow');
    }

    // Check for first aid template
    const firstAidTemplate = files.find(f =>
      f.name.toLowerCase().includes('first') &&
      f.name.toLowerCase().includes('aid')
    );

    if (firstAidTemplate) {
      log(`✅ First Aid template found: ${firstAidTemplate.name}`, 'green');
    } else {
      log('❌ First Aid template NOT found!', 'red');
      console.log();
      log('You need to upload the first aid template:', 'yellow');
      log('  1. Go to Supabase Dashboard → Storage → templates', 'yellow');
      log('  2. Upload your Excel file as: "first aid form.xlsx"', 'yellow');
      process.exit(1);
    }

    console.log();
    log('Step 2: Testing First Aid Template Download...', 'blue');
    console.log('─'.repeat(70));

    // Try to download
    const { data, error: downloadError } = await supabase.storage
      .from('templates')
      .download(firstAidTemplate.name);

    if (downloadError) {
      log(`❌ Failed to download: ${downloadError.message}`, 'red');
      process.exit(1);
    }

    const sizeKB = (data.size / 1024).toFixed(2);
    log(`✅ Template downloaded successfully!`, 'green');
    log(`   File: ${firstAidTemplate.name}`, 'green');
    log(`   Size: ${sizeKB} KB`, 'green');
    log(`   Type: ${data.type}`, 'green');

    console.log();
    console.log('='.repeat(70));
    log('✅ ALL TESTS PASSED!', 'green');
    console.log('='.repeat(70));
    console.log();
    log('Your first aid template export is ready to use!', 'green');
    console.log();
    log('Next steps:', 'cyan');
    log('  1. Open your app at http://localhost:8082', 'yellow');
    log('  2. Go to First Aid Inspection page', 'yellow');
    log('  3. Fill in inspection data', 'yellow');
    log('  4. Click "Export" → "Export with Template"', 'yellow');
    log('  5. Download should start automatically!', 'yellow');
    console.log();

  } catch (error) {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    console.log(error);
    process.exit(1);
  }
}

testFirstAidTemplate().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
