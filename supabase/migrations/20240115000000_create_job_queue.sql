-- Create job queue table for background processing
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  job_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_scheduled_at ON job_queue(scheduled_at);
CREATE INDEX idx_job_queue_job_type ON job_queue(job_type);
CREATE INDEX idx_job_queue_created_at ON job_queue(created_at DESC);

-- Create composite index for job processing query
CREATE INDEX idx_job_queue_processing ON job_queue(status, priority DESC, scheduled_at ASC)
WHERE status IN ('pending', 'failed');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_queue_updated_at
  BEFORE UPDATE ON job_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_job_queue_updated_at();

-- Add comment to table
COMMENT ON TABLE job_queue IS 'Queue for background jobs such as SharePoint exports';
COMMENT ON COLUMN job_queue.job_type IS 'Type of job (e.g., sharepoint_export, email_notification)';
COMMENT ON COLUMN job_queue.priority IS 'Higher number = higher priority';
COMMENT ON COLUMN job_queue.max_retries IS 'Maximum number of retry attempts';
COMMENT ON COLUMN job_queue.retry_count IS 'Current number of retry attempts';
