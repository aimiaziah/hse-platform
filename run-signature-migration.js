// Script to run the signature migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigration() {
  console.log('=== Running Signature Migration ===\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      'supabase',
      'migrations',
      '008_add_user_signature.sql'
    );

    console.log('📂 Reading migration file:', migrationPath);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute the migration
    console.log('🔄 Running migration...');

    // Split SQL by semicolons to execute each statement separately
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.toUpperCase().includes('COMMENT ON')) {
        // Skip COMMENT ON statements as they might not work via API
        console.log(`   Skipping COMMENT statement (${i + 1}/${statements.length})`);
        continue;
      }

      console.log(`   Executing statement (${i + 1}/${statements.length})...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // If rpc doesn't work, try direct query
        console.log('   RPC failed, trying direct execution...');

        // For ALTER TABLE, we can't use .from(), so we'll need to execute via a custom query
        // Let's try using the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (!response.ok) {
          console.error(`   ⚠️  Could not execute: ${statement.substring(0, 100)}...`);
        }
      }
    }

    // Verify the migration worked
    console.log('\n🔍 Verifying migration...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, signature')
      .limit(1);

    if (testError) {
      console.error('❌ Migration verification failed:', testError.message);
      console.log('\n💡 Manual steps required:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Open the SQL Editor');
      console.log('3. Copy and paste the contents of: supabase/migrations/008_add_user_signature.sql');
      console.log('4. Click "Run" to execute the migration');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('✅ Signature column is now available in the users table\n');

    console.log('🎉 Next Steps:');
    console.log('1. Restart your development server');
    console.log('2. Login as a supervisor user');
    console.log('3. Try saving your signature - it should work now!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n💡 Manual Migration Required:');
    console.log('Please run the migration manually in Supabase Dashboard:');
    console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('2. Copy contents of: supabase/migrations/008_add_user_signature.sql');
    console.log('3. Paste and run in SQL Editor');
  }
}

runMigration();
