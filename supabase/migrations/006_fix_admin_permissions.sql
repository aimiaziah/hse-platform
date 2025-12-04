-- =====================================================
-- FIX ADMIN USER PERMISSIONS
-- =====================================================
-- Description: Ensure admin user has all necessary permissions
-- This script will verify and update admin permissions
-- =====================================================

-- Step 1: Check current admin user and permissions
SELECT
  u.id,
  u.name,
  u.email,
  u.pin,
  u.role,
  u.is_active,
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
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.role = 'admin';

-- Step 2: Update all admin users to have full permissions
-- This ensures any admin user has access to all features
UPDATE user_permissions
SET
  can_manage_users = true,
  can_manage_forms = true,
  can_create_inspections = true,
  can_view_inspections = true,
  can_review_inspections = true,
  can_approve_inspections = true,
  can_reject_inspections = true,
  can_view_pending_inspections = true,
  can_view_analytics = true,
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'admin'
);

-- Step 3: For any admin users without permissions record, create one
INSERT INTO user_permissions (
  user_id,
  can_manage_users,
  can_manage_forms,
  can_create_inspections,
  can_view_inspections,
  can_review_inspections,
  can_approve_inspections,
  can_reject_inspections,
  can_view_pending_inspections,
  can_view_analytics
)
SELECT
  u.id,
  true,  -- can_manage_users
  true,  -- can_manage_forms
  true,  -- can_create_inspections
  true,  -- can_view_inspections
  true,  -- can_review_inspections
  true,  -- can_approve_inspections
  true,  -- can_reject_inspections
  true,  -- can_view_pending_inspections
  true   -- can_view_analytics
FROM users u
WHERE u.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up WHERE up.user_id = u.id
  );

-- Step 4: Verify the update - Show all admin users with their permissions
SELECT
  u.id,
  u.name,
  u.email,
  u.pin,
  u.role,
  u.is_active,
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
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.role = 'admin';

-- Success message
SELECT 'Admin permissions have been updated successfully!' AS status;
