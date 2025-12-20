// Check if announcements table exists
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkTable() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔍 Checking announcements table...\n');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Table does not exist or error occurred:', error.message);
      console.error('\n📋 Error code:', error.code);
      console.error('📋 Error hint:', error.hint || 'N/A');

      console.log('\n💡 Next steps:');
      console.log('   1. Open Supabase Studio: https://app.supabase.com');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Run the migration: supabase/migrations/010_create_announcements.sql');
      return;
    }

    console.log('✅ Announcements table exists!');
    console.log('📊 Current announcements:', data);
    console.log('\n💡 The table exists but may be empty. The API should work now.');
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

checkTable();
