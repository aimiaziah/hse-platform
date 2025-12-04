-- =====================================================
-- REMOVE DEPARTMENT FIELD
-- =====================================================
-- Description: Remove department field from users and inspections tables
-- Reason: Inspector and Supervisor are in the same department,
--         making this field redundant
-- =====================================================

-- Step 1: Drop dependent views first
DROP VIEW IF EXISTS v_users_with_permissions;
DROP VIEW IF EXISTS v_inspections_detailed;

-- Step 2: Remove department column from users table
ALTER TABLE users DROP COLUMN IF EXISTS department;

-- Step 3: Remove department column from inspections table
ALTER TABLE inspections DROP COLUMN IF EXISTS department;

-- Step 4: Recreate v_users_with_permissions view without department
CREATE OR REPLACE VIEW v_users_with_permissions AS
SELECT
  u.id,
  u.email,
  u.name,
  u.pin,
  u.role,
  u.is_active,
  u.created_at,
  u.updated_at,
  u.last_login,
  u.created_by,
  up.can_manage_users,
  up.can_manage_forms,
  up.can_create_inspections,
  up.can_view_inspections,
  up.can_review_inspections,
  up.can_approve_inspections,
  up.can_reject_inspections,
  up.can_view_pending_inspections,
  up.can_view_analytics
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id;

-- Step 5: Recreate v_inspections_detailed view without department
CREATE OR REPLACE VIEW v_inspections_detailed AS
SELECT
  i.id,
  i.inspection_number,
  i.inspection_type,
  i.inspector_id,
  i.inspected_by,
  i.designation,
  i.asset_id,
  i.location_id,
  i.inspection_date,
  i.submitted_at,
  i.reviewed_at,
  i.status,
  i.reviewer_id,
  i.review_comments,
  i.form_template_id,
  i.form_data,
  i.signature,
  i.remarks,
  i.created_at,
  i.updated_at,
  u.name as inspector_name,
  u.email as inspector_email,
  l.name as location_name,
  a.serial_number as asset_serial_number,
  a.asset_type as asset_type,
  rv.name as reviewer_name,
  rv.email as reviewer_email
FROM inspections i
LEFT JOIN users u ON i.inspector_id = u.id
LEFT JOIN locations l ON i.location_id = l.id
LEFT JOIN assets a ON i.asset_id = a.id
LEFT JOIN users rv ON i.reviewer_id = rv.id;

-- Success message
SELECT 'Department field successfully removed from users and inspections tables' AS status;
