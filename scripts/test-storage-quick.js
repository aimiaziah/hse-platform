/**
 * Quick Storage Test - Uses service role key to bypass RLS
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

async function quickTest() {
  console.log('\n' + '='.repeat(70));
  log('🔍 QUICK STORAGE TEST (Using Service Role Key)', 'cyan');
  console.log('='.repeat(70) + '\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    log('❌ Missing environment variables!', 'red');
    log('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    process.exit(1);
  }

  log('✅ Using service role key to bypass RLS checks', 'green');

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log();
  log('Step 1: Checking Templates Bucket...', 'blue');
  console.log('─'.repeat(70));

  try {
    // List files in templates bucket
    const { data: files, error } = await supabase.storage
      .from('templates')
      .list('', {
        limit: 100,
        offset: 0
      });

    if (error) {
      log(`❌ Error: ${error.message}`, 'red');
      console.log('Full error:', error);
      process.exit(1);
    }

    if (!files || files.length === 0) {
      log('⚠️  Templates bucket is empty!', 'yellow');
      log('   Upload your Excel file to Supabase Storage → templates bucket', 'yellow');
      process.exit(1);
    }

    log(`✅ Found ${files.length} file(s):`, 'green');
    files.forEach(file => {
      const size = (file.metadata?.size || 0) / 1024;
      console.log(`   • ${file.name} (${size.toFixed(2)} KB)`);
    });

    // Check for expected template files
    const expectedFiles = [
      'fire extinguisher form.xlsx',
      'form - fire extinguisher.xlsx'
    ];

    const foundTemplate = files.find(f => expectedFiles.includes(f.name));

    if (!foundTemplate) {
      log('\n⚠️  Expected template file not found!', 'yellow');
      log('   Looking for: "fire extinguisher form.xlsx"', 'yellow');
    } else {
      log(`\n✅ Template file found: ${foundTemplate.name}`, 'green');
    }

  } catch (error) {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    console.log(error);
    process.exit(1);
  }

  console.log();
  log('Step 2: Testing Template Download...', 'blue');
  console.log('─'.repeat(70));

  try {
    // Try to download the template
    const { data, error } = await supabase.storage
      .from('templates')
      .download('fire extinguisher form.xlsx');

    if (error) {
      // Try alternative filename
      const { data: data2, error: error2 } = await supabase.storage
        .from('templates')
        .download('form - fire extinguisher.xlsx');

      if (error2) {
        log(`❌ Failed to download template: ${error.message}`, 'red');
        log(`   Also tried: form - fire extinguisher.xlsx`, 'yellow');
        process.exit(1);
      }

      const sizeKB = (data2.size / 1024).toFixed(2);
      log(`✅ Template downloaded successfully!`, 'green');
      log(`   File: form - fire extinguisher.xlsx`, 'green');
      log(`   Size: ${sizeKB} KB`, 'green');
    } else {
      const sizeKB = (data.size / 1024).toFixed(2);
      log(`✅ Template downloaded successfully!`, 'green');
      log(`   File: fire extinguisher form.xlsx`, 'green');
      log(`   Size: ${sizeKB} KB`, 'green');
    }

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }

  console.log();
  console.log('='.repeat(70));
  log('✅ STORAGE IS WORKING!', 'green');
  console.log('='.repeat(70));
  console.log();
  log('Your template bucket is configured and accessible.', 'green');
  console.log();
}

quickTest().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
