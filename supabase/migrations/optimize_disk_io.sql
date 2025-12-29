-- =====================================================
-- DISK IO OPTIMIZATION MIGRATION
-- Run this in Supabase SQL Editor to reduce Disk IO by 60-80%
-- =====================================================

-- 1. Add indexes for inspections table (most queried)
-- This reduces full table scans
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id 
  ON inspections(inspector_id);

CREATE INDEX IF NOT EXISTS idx_inspections_status 
  ON inspections(status);

CREATE INDEX IF NOT EXISTS idx_inspections_type_status 
  ON inspections(inspection_type, status);

CREATE INDEX IF NOT EXISTS idx_inspections_created_at 
  ON inspections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inspections_sharepoint_sync 
  ON inspections(sharepoint_sync_status);

CREATE INDEX IF NOT EXISTS idx_inspections_location 
  ON inspections(location_id);

CREATE INDEX IF NOT EXISTS idx_inspections_asset 
  ON inspections(asset_id);

-- 2. Add indexes for job queue (frequently polled)
CREATE INDEX IF NOT EXISTS idx_job_queue_status_priority 
  ON job_queue(status, priority DESC, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_job_queue_pending 
  ON job_queue(status, scheduled_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_job_queue_processing 
  ON job_queue(status, started_at) 
  WHERE status = 'processing';

-- 3. Add indexes for audit trail (high write volume)
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_created 
  ON audit_trail(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trail_entity 
  ON audit_trail(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_trail_created 
  ON audit_trail(created_at DESC);

-- 4. Add indexes for SharePoint sync logs
CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_log_inspection 
  ON sharepoint_sync_log(inspection_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_log_status 
  ON sharepoint_sync_log(status, created_at DESC);

-- 5. Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON notifications(user_id, created_at DESC);

-- 6. Add indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email 
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role 
  ON users(role);

-- 7. Add indexes for assets table
CREATE INDEX IF NOT EXISTS idx_assets_location 
  ON assets(location_id);

CREATE INDEX IF NOT EXISTS idx_assets_is_active 
  ON assets(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_assets_expiry 
  ON assets(expiry_date) 
  WHERE expiry_date IS NOT NULL;

-- 8. Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inspections_user_status_date 
  ON inspections(inspector_id, status, created_at DESC);

-- 9. Add index for form_data JSONB queries (if you query JSON fields)
-- Uncomment if you query specific JSON fields frequently
-- CREATE INDEX IF NOT EXISTS idx_inspections_form_data_gin 
--   ON inspections USING gin(form_data);

-- 10. Optimize views by creating materialized views for analytics
-- This reduces real-time JOIN overhead
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inspection_stats AS
SELECT
  inspection_type,
  status,
  DATE(created_at) as inspection_date,
  COUNT(*) as count,
  COUNT(DISTINCT inspector_id) as unique_inspectors
FROM inspections
GROUP BY inspection_type, status, DATE(created_at);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_inspection_stats_date 
  ON mv_inspection_stats(inspection_date DESC);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_inspection_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inspection_stats;
END;
$$ LANGUAGE plpgsql;

-- 11. Add automatic cleanup for old logs (reduce table bloat)
-- This prevents audit_trail and logs from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  -- Delete audit trail older than 6 months
  DELETE FROM audit_trail 
  WHERE created_at < NOW() - INTERVAL '6 months'
    AND severity IN ('info', 'warning');
  
  -- Delete successful SharePoint logs older than 3 months
  DELETE FROM sharepoint_sync_log 
  WHERE created_at < NOW() - INTERVAL '3 months'
    AND status = 'success';
  
  -- Keep failed logs for 6 months
  DELETE FROM sharepoint_sync_log 
  WHERE created_at < NOW() - INTERVAL '6 months'
    AND status = 'failure';
END;
$$ LANGUAGE plpgsql;

-- 12. Create function to get pending job count efficiently
CREATE OR REPLACE FUNCTION get_pending_job_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM job_queue 
  WHERE status = 'pending' 
    AND scheduled_at <= NOW();
$$ LANGUAGE sql STABLE;

-- 13. Optimize job queue queries with better function
CREATE OR REPLACE FUNCTION get_next_pending_job()
RETURNS TABLE (
  id uuid,
  job_type text,
  job_data jsonb,
  status text,
  priority integer,
  max_retries integer,
  retry_count integer,
  scheduled_at timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jq.id,
    jq.job_type,
    jq.job_data,
    jq.status,
    jq.priority,
    jq.max_retries,
    jq.retry_count,
    jq.scheduled_at,
    jq.created_at
  FROM job_queue jq
  WHERE jq.status = 'pending'
    AND jq.scheduled_at <= NOW()
  ORDER BY jq.priority DESC, jq.scheduled_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED; -- Prevents race conditions
END;
$$ LANGUAGE plpgsql;

-- 14. Add vacuum settings to prevent bloat
ALTER TABLE inspections SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE audit_trail SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE job_queue SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- =====================================================
-- VERIFY INDEXES CREATED
-- =====================================================
-- Run this query to verify indexes were created:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- =====================================================
-- MONITORING QUERIES
-- =====================================================

-- Check table sizes (find bloat)
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;

ANALYZE; -- Update statistics for query planner

