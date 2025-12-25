-- Check recent fire extinguisher inspections and their SharePoint sync status
SELECT
  id,
  inspection_number,
  inspection_type,
  inspected_by,
  inspection_date,
  status,
  sharepoint_sync_status,
  sharepoint_exported_at,
  sharepoint_file_url,
  created_at
FROM inspections
WHERE inspection_type = 'fire_extinguisher'
ORDER BY created_at DESC
LIMIT 10;

-- Check recent SharePoint sync logs for fire extinguisher inspections
SELECT
  sl.id,
  sl.inspection_id,
  i.inspection_number,
  sl.sync_type,
  sl.status,
  sl.error_message,
  sl.metadata,
  sl.created_at
FROM sharepoint_sync_log sl
JOIN inspections i ON sl.inspection_id = i.id
WHERE i.inspection_type = 'fire_extinguisher'
ORDER BY sl.created_at DESC
LIMIT 10;
