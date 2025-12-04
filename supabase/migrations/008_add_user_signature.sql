-- Migration: Add signature field to users table
-- Description: Adds a signature column to store user signatures (as base64 image data)
-- Date: 2024-12-02

-- Add signature column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature TEXT;

-- Add comment to the column
COMMENT ON COLUMN users.signature IS 'Base64-encoded signature image for supervisors and other users who need to sign documents';

-- Update the v_users_with_permissions view to include signature
DROP VIEW IF EXISTS v_users_with_permissions;

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
  u.signature,
  p.can_manage_users,
  p.can_manage_forms,
  p.can_create_inspections,
  p.can_view_inspections,
  p.can_review_inspections,
  p.can_approve_inspections,
  p.can_reject_inspections,
  p.can_view_pending_inspections,
  p.can_view_analytics
FROM users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.is_active = true;

-- Grant appropriate permissions
GRANT SELECT ON v_users_with_permissions TO authenticated;
GRANT SELECT ON v_users_with_permissions TO service_role;
