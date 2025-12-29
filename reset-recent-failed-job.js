// Reset the most recent failed job
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetRecentJob() {
  console.log('Resetting most recent failed job...\n');

  // Get the most recent job
  const { data: jobs, error: fetchError } = await supabase
    .from('job_queue')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchError || !jobs || jobs.length === 0) {
    console.log('No failed jobs found');
    return;
  }

  const job = jobs[0];
  console.log('Found job:', job.id.substring(0, 8) + '...');
  console.log('Type:', job.job_type);
  console.log('Error:', job.error_message);
  console.log('Created:', job.created_at);
  console.log('');

  // Reset to pending
  const { data, error } = await supabase
    .from('job_queue')
    .update({
      status: 'pending',
      retry_count: 0,
      error_message: null,
      error_details: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', job.id)
    .select();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('✅ Job reset to pending status');
  console.log('\nNow run: curl -X POST http://localhost:8080/api/jobs/process');
}

resetRecentJob();
