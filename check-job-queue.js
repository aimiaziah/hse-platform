// Check job queue status
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkJobQueue() {
  console.log('Checking job queue...\n');

  // Check if table exists
  const { data: tables, error: tableError } = await supabase
    .from('job_queue')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Job queue table error:', tableError.message);
    console.log('\n💡 The job_queue table may not exist. Run the migration:');
    console.log('   supabase/migrations/20240115000000_create_job_queue.sql');
    return;
  }

  console.log('✅ Job queue table exists\n');

  // Get recent jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('job_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
    return;
  }

  console.log(`Found ${jobs.length} recent jobs:\n`);

  jobs.forEach((job, idx) => {
    console.log(`${idx + 1}. Job ${job.id.substring(0, 8)}...`);
    console.log(`   Type: ${job.job_type}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Priority: ${job.priority}`);
    console.log(`   Retries: ${job.retry_count}/${job.max_retries}`);
    if (job.error_message) {
      console.log(`   Error: ${job.error_message}`);
    }
    console.log(`   Created: ${job.created_at}`);
    console.log('');
  });

  // Check inspections with sharepoint_sync_status
  const { data: inspections, error: inspError } = await supabase
    .from('inspections')
    .select('id, inspection_number, sharepoint_sync_status, sharepoint_exported_at')
    .not('sharepoint_sync_status', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!inspError && inspections) {
    console.log('\n📋 Recent inspections with SharePoint status:\n');
    inspections.forEach((insp, idx) => {
      console.log(`${idx + 1}. ${insp.inspection_number}`);
      console.log(`   Sync Status: ${insp.sharepoint_sync_status || 'none'}`);
      console.log(`   Exported At: ${insp.sharepoint_exported_at || 'never'}`);
      console.log('');
    });
  }
}

checkJobQueue().catch(console.error);
