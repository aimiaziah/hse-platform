-- Diagnostic SQL to check fire extinguisher submission issues
-- Run this in Supabase SQL Editor to diagnose the problem

-- 1. Check recent fire extinguisher inspections (last 7 days)
SELECT
  id,
  inspection_number,
  inspection_type,
  inspected_by,
  inspection_date,
  status,
  sharepoint_sync_status,
  sharepoint_file_url,
  created_at,
  submitted_at
FROM inspections
WHERE inspection_type = 'fire_extinguisher'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check SharePoint sync errors
SELECT
  sl.id,
  sl.inspection_id,
  i.inspection_number,
  i.inspection_type,
  sl.sync_type,
  sl.status,
  sl.error_message,
  sl.metadata,
  sl.created_at
FROM sharepoint_sync_log sl
LEFT JOIN inspections i ON sl.inspection_id = i.id
WHERE sl.status = 'failure'
  AND sl.created_at > NOW() - INTERVAL '7 days'
ORDER BY sl.created_at DESC
LIMIT 20;

-- 3. Check all inspections by your user (replace with your actual inspector_id)
-- First, find your user ID:
SELECT id, email, name, role FROM users WHERE email LIKE '%aimi%' OR name LIKE '%Aimi%';

-- Then check your inspections (replace 'YOUR_USER_ID' with actual ID from above)
-- SELECT * FROM inspections WHERE inspector_id = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 10;

-- 4. Check for draft fire extinguisher inspections
SELECT
  id,
  inspection_number,
  inspected_by,
  status,
  created_at
FROM inspections
WHERE inspection_type = 'fire_extinguisher'
  AND status = 'draft'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 5. Count inspections by status
SELECT
  status,
  COUNT(*) as count
FROM inspections
WHERE inspection_type = 'fire_extinguisher'
GROUP BY status
ORDER BY count DESC;
