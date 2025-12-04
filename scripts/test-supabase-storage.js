/**
 * Supabase Storage Diagnostic Script
 *
 * This script tests your Supabase connection and checks if the template exists.
 *
 * Usage: node scripts/test-supabase-storage.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Colors for console output
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

async function runDiagnostics() {
  console.log('\n' + '='.repeat(70));
  log('🔍 SUPABASE STORAGE DIAGNOSTIC TOOL', 'cyan');
  console.log('='.repeat(70) + '\n');

  // Step 1: Check environment variables
  log('Step 1: Checking Environment Variables...', 'blue');
  console.log('─'.repeat(70));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    log('❌ NEXT_PUBLIC_SUPABASE_URL is not set!', 'red');
    log('   Add it to .env.local', 'yellow');
    process.exit(1);
  } else {
    log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`, 'green');
  }

  if (!supabaseKey) {
    log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set!', 'red');
    log('   Add it to .env.local', 'yellow');
    process.exit(1);
  } else {
    log(`✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey.substring(0, 20)}...`, 'green');
  }

  console.log();

  // Step 2: Initialize Supabase client
  log('Step 2: Initializing Supabase Client...', 'blue');
  console.log('─'.repeat(70));

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    log('✅ Supabase client initialized successfully', 'green');
  } catch (error) {
    log(`❌ Failed to initialize Supabase client: ${error.message}`, 'red');
    process.exit(1);
  }

  console.log();

  // Step 3: List all storage buckets
  log('Step 3: Listing Storage Buckets...', 'blue');
  console.log('─'.repeat(70));

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      log(`❌ Error listing buckets: ${error.message}`, 'red');
      console.log();
      log('Possible causes:', 'yellow');
      log('  • Invalid API credentials', 'yellow');
      log('  • Network connectivity issues', 'yellow');
      log('  • Supabase service is down', 'yellow');
      process.exit(1);
    }

    if (!buckets || buckets.length === 0) {
      log('⚠️  No storage buckets found!', 'yellow');
      log('   You need to create the "templates" bucket first.', 'yellow');
      console.log();
      log('Run this SQL in Supabase SQL Editor:', 'cyan');
      console.log('─'.repeat(70));
      console.log(`
insert into storage.buckets (id, name, public)
values ('templates', 'templates', false)
on conflict (id) do nothing;
      `);
      process.exit(1);
    }

    log(`✅ Found ${buckets.length} bucket(s):`, 'green');
    buckets.forEach(bucket => {
      const isPublic = bucket.public ? '🌐 Public' : '🔒 Private';
      console.log(`   • ${bucket.name} (${bucket.id}) - ${isPublic}`);
    });

    // Check if 'templates' bucket exists
    const templatesBucket = buckets.find(b => b.id === 'templates' || b.name === 'templates');
    if (!templatesBucket) {
      log('\n⚠️  "templates" bucket not found!', 'yellow');
      log('   You need to create it first.', 'yellow');
      process.exit(1);
    }

  } catch (error) {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  }

  console.log();

  // Step 4: List files in templates bucket
  log('Step 4: Checking Templates Bucket...', 'blue');
  console.log('─'.repeat(70));

  try {
    const { data: files, error } = await supabase.storage
      .from('templates')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      log(`❌ Error listing files in templates bucket: ${error.message}`, 'red');
      console.log();

      if (error.message.includes('not found') || error.statusCode === '404') {
        log('The "templates" bucket does not exist!', 'yellow');
        log('Create it via Supabase Dashboard or run setup SQL script.', 'yellow');
      } else if (error.message.includes('permission') || error.statusCode === '401') {
        log('Permission denied! Check bucket policies.', 'yellow');
        log('Run: supabase/setup-template-storage.sql', 'yellow');
      }

      process.exit(1);
    }

    if (!files || files.length === 0) {
      log('⚠️  Templates bucket is empty!', 'yellow');
      console.log();
      log('📤 Upload your template file:', 'cyan');
      log('   1. Go to Supabase Dashboard → Storage → templates', 'yellow');
      log('   2. Click "Upload file"', 'yellow');
      log('   3. Upload your Excel file as: "fire extinguisher form.xlsx"', 'yellow');
      process.exit(1);
    }

    log(`✅ Found ${files.length} file(s) in templates bucket:`, 'green');
    files.forEach(file => {
      const size = (file.metadata?.size || 0) / 1024;
      console.log(`   • ${file.name} (${size.toFixed(2)} KB)`);
    });

    // Check for the specific template file
    const templateFile = files.find(f =>
      f.name === 'fire extinguisher form.xlsx' ||
      f.name === 'form - fire extinguisher.xlsx'
    );

    if (!templateFile) {
      log('\n⚠️  Expected template file not found!', 'yellow');
      log('   Looking for: "fire extinguisher form.xlsx"', 'yellow');
      log('   Available files:', 'yellow');
      files.forEach(f => log(`      - ${f.name}`, 'yellow'));
      console.log();
      log('💡 Solution:', 'cyan');
      log('   Upload your file with the exact name: "fire extinguisher form.xlsx"', 'yellow');
      log('   OR update templateExport.ts line 185 to match your filename', 'yellow');
      process.exit(1);
    }

    log(`\n✅ Template file found: ${templateFile.name}`, 'green');

  } catch (error) {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  }

  console.log();

  // Step 5: Test downloading the template
  log('Step 5: Testing Template Download...', 'blue');
  console.log('─'.repeat(70));

  try {
    const { data, error } = await supabase.storage
      .from('templates')
      .download('fire extinguisher form.xlsx');

    if (error) {
      log(`❌ Failed to download template: ${error.message}`, 'red');
      console.log();

      if (error.message.includes('not found')) {
        log('File not found! Check the filename exactly matches:', 'yellow');
        log('   Expected: "fire extinguisher form.xlsx"', 'yellow');
      } else if (error.message.includes('permission')) {
        log('Permission denied! Run setup SQL to fix policies:', 'yellow');
        log('   File: supabase/setup-template-storage.sql', 'yellow');
      }

      process.exit(1);
    }

    if (!data) {
      log('❌ Downloaded data is empty!', 'red');
      process.exit(1);
    }

    const sizeKB = (data.size / 1024).toFixed(2);
    log(`✅ Template downloaded successfully!`, 'green');
    log(`   Size: ${sizeKB} KB`, 'green');
    log(`   Type: ${data.type}`, 'green');

  } catch (error) {
    log(`❌ Unexpected error during download: ${error.message}`, 'red');
    console.log();
    if (error.stack) {
      console.log('Stack trace:');
      console.log(error.stack);
    }
    process.exit(1);
  }

  console.log();

  // Step 6: Check storage policies
  log('Step 6: Verifying Storage Policies...', 'blue');
  console.log('─'.repeat(70));

  log('ℹ️  To check policies, run this SQL query:', 'cyan');
  console.log(`
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
  `);

  console.log();
  console.log('='.repeat(70));
  log('✅ ALL DIAGNOSTICS PASSED!', 'green');
  console.log('='.repeat(70));
  console.log();
  log('Your Supabase Storage is configured correctly.', 'green');
  log('The template export feature should work now.', 'green');
  console.log();
  log('Next steps:', 'cyan');
  log('  1. Try the export feature in your app', 'yellow');
  log('  2. If still failing, check browser console for errors', 'yellow');
  log('  3. Verify the cell mapping in templateExport.ts matches your template', 'yellow');
  console.log();
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
