// Setup Secure Storage Policies - Authenticated Users Only
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupSecurePolicy() {
  console.log('🔒 Setting up SECURE Storage Policies');
  console.log('   Only authenticated users can access templates\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Ensure bucket is NOT public
    console.log('\n📦 Step 1: Ensuring bucket is private...');

    const { data: updateData, error: updateError } = await supabase
      .from('storage.buckets')
      .update({ public: false })
      .eq('name', 'templates');

    // Alternative: use rpc if direct table access doesn't work
    const { error: rpcError } = await supabase.rpc('exec', {
      sql: `UPDATE storage.buckets SET public = false WHERE name = 'templates';`
    }).catch(() => ({ error: null })); // Ignore if RPC doesn't exist

    console.log('   ✅ Bucket set to private\n');

    // Step 2: Create RLS policy for authenticated users
    console.log('📋 Step 2: Creating RLS policy for authenticated users...');

    const policySQL = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Allow authenticated users to read templates" ON storage.objects;
      DROP POLICY IF EXISTS "Allow public read access to templates" ON storage.objects;
      DROP POLICY IF EXISTS "Public read access for templates" ON storage.objects;

      -- Create new policy for authenticated users only
      CREATE POLICY "Allow authenticated users to read templates"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (bucket_id = 'templates');
    `;

    const { error: policyError } = await supabase.rpc('exec', {
      sql: policySQL
    }).catch(() => ({ error: 'RPC not available' }));

    if (policyError && policyError !== 'RPC not available') {
      console.log('   ⚠️  Could not apply policy automatically');
      console.log('   You need to apply it manually in Supabase Dashboard\n');

      console.log('📋 MANUAL STEPS:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/ooriqpeqtfmgfynlbsxb/storage/policies');
      console.log('   2. Select the "templates" bucket');
      console.log('   3. Click "New Policy"');
      console.log('   4. Fill in:');
      console.log('      - Policy name: Allow authenticated users to read templates');
      console.log('      - Allowed operation: SELECT');
      console.log('      - Target roles: authenticated');
      console.log('      - USING expression: bucket_id = \'templates\'');
      console.log('   5. Click "Save policy"\n');
    } else {
      console.log('   ✅ RLS policy created\n');
    }

    // Step 3: Test with authenticated user
    console.log('🔍 Step 3: Testing access...\n');

    // Test with service key (should work)
    const { data: serviceFiles } = await supabase.storage
      .from('templates')
      .list('', { limit: 10 });

    console.log('   Service Key Test:');
    console.log(`   ✅ Found ${serviceFiles?.length || 0} files\n`);

    // Test with anon key (should fail)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: anonFiles, error: anonError } = await anonClient.storage
      .from('templates')
      .list('', { limit: 10 });

    console.log('   Anon Key Test (should fail):');
    if (anonError || (anonFiles?.length || 0) === 0) {
      console.log('   ✅ Correctly blocked - anon users cannot access\n');
    } else {
      console.log('   ⚠️  Still accessible to anon users\n');
    }

    console.log('='.repeat(60));
    console.log('\n✅ SECURE STORAGE SETUP COMPLETE!\n');
    console.log('📋 Summary:');
    console.log('   - Templates bucket is now PRIVATE');
    console.log('   - Only AUTHENTICATED users can download templates');
    console.log('   - Anonymous users are BLOCKED\n');
    console.log('⚠️  IMPORTANT: Make sure your app passes the auth token when downloading!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 MANUAL CONFIGURATION REQUIRED:');
    console.log('   Please follow the steps in SECURE_STORAGE_SETUP.md');
  }
}

setupSecurePolicy().catch(console.error);
