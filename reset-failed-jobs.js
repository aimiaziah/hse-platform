// Reset failed jobs back to pending for retry
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetJobs() {
  console.log('Resetting failed jobs to pending...\n');

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
    .eq('status', 'failed')
    .select();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Reset ${data.length} jobs to pending status\n`);
  data.forEach((job, idx) => {
    console.log(`${idx + 1}. ${job.id.substring(0, 8)}... - ${job.job_type}`);
  });
}

resetJobs();
