-- Migration: Add SharePoint export tracking
-- Description: Adds columns to track SharePoint export status and creates audit log for SharePoint sync operations
-- Date: 2025-12-25

-- Add SharePoint tracking columns to inspections table
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS sharepoint_file_id TEXT,
ADD COLUMN IF NOT EXISTS sharepoint_file_url TEXT,
ADD COLUMN IF NOT EXISTS sharepoint_exported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sharepoint_last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sharepoint_sync_status TEXT DEFAULT 'pending'
  CHECK (sharepoint_sync_status IN ('pending', 'synced', 'failed', 'retrying'));

-- Add comment to explain the status values
COMMENT ON COLUMN inspections.sharepoint_sync_status IS 'Status of SharePoint sync: pending (not yet synced), synced (successfully synced), failed (sync failed), retrying (retry in progress)';

-- Create index for performance on SharePoint sync queries
CREATE INDEX IF NOT EXISTS idx_inspections_sharepoint_sync
  ON inspections(sharepoint_sync_status, sharepoint_exported_at);

-- Create audit log table for SharePoint sync operations
CREATE TABLE IF NOT EXISTS sharepoint_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('create', 'update')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments to explain the table
COMMENT ON TABLE sharepoint_sync_log IS 'Audit log for SharePoint synchronization operations';
COMMENT ON COLUMN sharepoint_sync_log.sync_type IS 'Type of sync operation: create (new upload) or update (metadata update)';
COMMENT ON COLUMN sharepoint_sync_log.status IS 'Result of sync operation: success or failure';
COMMENT ON COLUMN sharepoint_sync_log.error_message IS 'Error message if sync failed';
COMMENT ON COLUMN sharepoint_sync_log.metadata IS 'Additional metadata about the sync operation (e.g., fileId, webhook response)';

-- Create index for efficient querying by inspection
CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_log_inspection
  ON sharepoint_sync_log(inspection_id, created_at DESC);

-- Create index for querying failures
CREATE INDEX IF NOT EXISTS idx_sharepoint_sync_log_failures
  ON sharepoint_sync_log(status, created_at DESC)
  WHERE status = 'failure';
