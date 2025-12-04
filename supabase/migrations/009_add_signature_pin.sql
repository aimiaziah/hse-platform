-- Migration: Add signature PIN for secure signature authorization
-- Description: Adds signature_pin column to users table for separate signature authorization
-- Date: 2024-12-02

-- Add signature_pin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_pin VARCHAR(10);

-- Add signature_created_at to track when signature was first set up
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_created_at TIMESTAMP WITH TIME ZONE;

-- Add comments to the columns
COMMENT ON COLUMN users.signature_pin IS 'Separate PIN for signature authorization (different from login PIN)';
COMMENT ON COLUMN users.signature_created_at IS 'Timestamp when user first created their signature';

-- Update the v_users_with_permissions view to exclude signature_pin for security
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
  u.signature_created_at,
  -- NOTE: signature_pin is intentionally excluded for security
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
