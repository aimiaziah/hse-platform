// Script to apply the announcements migration to Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read the migration file
  const migrationPath = path.join(__dirname, 'supabase/migrations/010_create_announcements.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📝 Applying announcements migration...');
  console.log('Migration file:', migrationPath);
  console.log('');

  try {
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);

      // Execute via RPC or direct SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      }).catch(async () => {
        // If RPC doesn't exist, try using the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return { data: await response.json(), error: null };
      });

      if (error) {
        console.error(`   ❌ Error:`, error.message);
        throw error;
      }

      console.log(`   ✓ Success\n`);
    }

    console.log('✅ Migration applied successfully!');
    console.log('\nVerifying announcements table...');

    // Verify the table was created
    const { data: tableCheck, error: checkError } = await supabase
      .from('announcements')
      .select('count')
      .limit(1);

    if (checkError) {
      console.error('⚠️  Warning: Could not verify table:', checkError.message);
    } else {
      console.log('✅ Announcements table verified!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 You may need to run this SQL manually in Supabase Studio:');
    console.error('   1. Go to https://app.supabase.com/project/_/sql');
    console.error('   2. Paste the contents of:', migrationPath);
    console.error('   3. Click "Run"');
    process.exit(1);
  }
}

applyMigration();
