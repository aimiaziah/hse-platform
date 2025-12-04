// Detailed test to check template access and diagnose the issue
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Detailed Template Access Test\n');
console.log('='.repeat(60));
console.log('');

async function main() {
  const client = createClient(supabaseUrl, anonKey);

  // Test 1: List files
  console.log('Test 1: Listing files in templates bucket...');
  const { data: files, error: listError } = await client.storage
    .from('templates')
    .list('', { limit: 10 });

  if (listError) {
    console.log(`❌ List failed: ${listError.message}`);
    console.log('Full error:', JSON.stringify(listError, null, 2));
  } else {
    console.log(`✅ Found ${files.length} files:`);
    files.forEach(f => console.log(`   - ${f.name}`));
  }

  console.log('');

  // Test 2: Try different filename variations
  const filenames = [
    'monthly manhours.xlsx',
    'monthly%20manhours.xlsx',
  ];

  for (const filename of filenames) {
    console.log(`Test 2: Downloading "${filename}"...`);
    const { data, error } = await client.storage
      .from('templates')
      .download(filename);

    if (error) {
      console.log(`❌ Download failed`);
      console.log('Error message:', error.message);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Success! Size: ${(data.size / 1024).toFixed(2)} KB`);
    }
    console.log('');
  }

  // Test 3: Try getting public URL
  console.log('Test 3: Getting public URL...');
  const { data: urlData } = client.storage
    .from('templates')
    .getPublicUrl('monthly manhours.xlsx');

  console.log('Public URL:', urlData.publicUrl);
  console.log('');

  // Test 4: Try to fetch the public URL directly
  console.log('Test 4: Fetching via public URL...');
  try {
    const response = await fetch(urlData.publicUrl);
    console.log('Status:', response.status, response.statusText);
    if (response.ok) {
      const blob = await response.blob();
      console.log(`✅ Success! Size: ${(blob.size / 1024).toFixed(2)} KB`);
    } else {
      const text = await response.text();
      console.log('❌ Failed. Response:', text.substring(0, 200));
    }
  } catch (err) {
    console.log('❌ Fetch error:', err.message);
  }

  console.log('');
  console.log('='.repeat(60));
}

main().catch(console.error);
