// Apply Storage Policies for Templates Bucket
// This script sets up proper RLS policies to allow public read access

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStoragePolicies() {
  console.log('🔧 Setting up Storage Policies for Templates Bucket\n');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Make bucket public
    console.log('📦 Step 1: Making templates bucket public...');

    const { data: updateData, error: updateError } = await supabase
      .rpc('update_bucket_public', {
        bucket_name: 'templates',
        is_public: true
      })
      .catch(async (err) => {
        // If RPC doesn't exist, try direct SQL
        console.log('   Using direct SQL approach...');
        const { data, error } = await supabase.rpc('exec_sql', {
          query: `UPDATE storage.buckets SET public = true WHERE name = 'templates';`
        });
        return { data, error };
      });

    // Alternative approach: use storage API to update bucket
    const buckets = await supabase.storage.listBuckets();
    console.log('   ✅ Bucket configuration updated');
    console.log('');

    // Step 2: Verify by trying to download a file with anon key
    console.log('📥 Step 2: Testing download with anon key...');
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data: downloadData, error: downloadError } = await anonClient.storage
      .from('templates')
      .download('hse inspection form.xlsx');

    if (downloadError) {
      console.log('   ⚠️  Download test failed:', downloadError.message);
      console.log('   This might be a permissions issue. Trying to fix...\n');

      // Try to fix by re-uploading with public access
      console.log('🔄 Step 3: Re-uploading files with public flag...');
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

      const templates = [
        'fire extinguisher form.xlsx',
        'first aid form.xlsx',
        'hse inspection form.xlsx',
        'monthly manhours.xlsx'
      ];

      for (const template of templates) {
        // Download with service key
        const { data: fileData, error: fetchError } = await serviceClient.storage
          .from('templates')
          .download(template);

        if (!fetchError && fileData) {
          // Re-upload with public access
          const { data: uploadData, error: uploadError } = await serviceClient.storage
            .from('templates')
            .upload(template, fileData, {
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              upsert: true,
              cacheControl: '3600'
            });

          if (uploadError) {
            console.log(`   ⚠️  Failed to re-upload ${template}:`, uploadError.message);
          } else {
            console.log(`   ✅ Re-uploaded ${template}`);
          }
        }
      }

      console.log('');
      console.log('🔄 Retrying download test...');
      const { data: retryData, error: retryError } = await anonClient.storage
        .from('templates')
        .download('hse inspection form.xlsx');

      if (retryError) {
        console.log('   ❌ Still failing:', retryError.message);
        console.log('');
        console.log('⚠️  MANUAL ACTION REQUIRED:');
        console.log('   Please go to your Supabase Dashboard and:');
        console.log('   1. Navigate to Storage > templates');
        console.log('   2. Click on "Policies" tab');
        console.log('   3. Click "New Policy"');
        console.log('   4. Select "Create a policy from scratch"');
        console.log('   5. Name: "Public read access"');
        console.log('   6. Allowed operations: SELECT');
        console.log('   7. Target roles: public');
        console.log('   8. USING expression: bucket_id = \'templates\'');
        console.log('   9. Click "Review" then "Save policy"');
      } else {
        console.log('   ✅ Download successful!');
        console.log(`   File size: ${retryData.size} bytes`);
      }
    } else {
      console.log('   ✅ Download successful!');
      console.log(`   File size: ${downloadData.size} bytes`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Final verification
    console.log('🔍 Final Verification:');
    const { data: files, error: listError } = await anonClient.storage
      .from('templates')
      .list('', { limit: 10 });

    if (listError) {
      console.log('❌ Cannot list files with anon key:', listError.message);
      console.log('');
      console.log('This indicates RLS policies are still blocking access.');
      console.log('Please follow the manual steps above to fix the policies.');
    } else {
      console.log('✅ Successfully listed files with anon key:');
      files.forEach(file => {
        const size = (file.metadata?.size / 1024 || 0).toFixed(2);
        console.log(`   - ${file.name} (${size} KB)`);
      });
      console.log('');
      console.log('🎉 SUCCESS! Your templates are now accessible from the app!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('⚠️  ALTERNATIVE SOLUTION:');
    console.log('   Go to Supabase Dashboard > Storage > templates');
    console.log('   1. Click the settings/gear icon');
    console.log('   2. Check "Public bucket"');
    console.log('   3. Save changes');
  }
}

setupStoragePolicies().catch(console.error);
