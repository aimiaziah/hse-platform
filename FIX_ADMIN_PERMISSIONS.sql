-- FIX ADMIN PERMISSIONS
-- Run this in your Supabase SQL Editor

-- Step 1: Check current state
SELECT
  u.id,
  u.name,
  u.pin,
  u.role,
  u.is_active,
  u.email,
  p.id as permission_id,
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
WHERE u.role = 'admin'
ORDER BY u.created_at DESC;

-- If the above shows NULL for permissions, run Step 2
-- If the above shows FALSE for permissions, run Step 3

-- Step 2: Create missing permission rows
-- (Only if user_permissions row doesn't exist)
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
  true, -- can_manage_users
  true, -- can_manage_forms
  true, -- can_create_inspections
  true, -- can_view_inspections
  true, -- can_review_inspections
  true, -- can_approve_inspections
  true, -- can_reject_inspections
  true, -- can_view_pending_inspections
  true  -- can_view_analytics
FROM users u
WHERE u.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions p WHERE p.user_id = u.id
  );

-- Step 3: Update existing permissions to TRUE
-- (If permission rows exist but are FALSE)
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
  updated_at = now()
WHERE user_id IN (
  SELECT id FROM users WHERE role = 'admin'
);

-- Step 4: Verify the fix
SELECT
  u.id,
  u.name,
  u.pin,
  u.role,
  p.can_manage_users,
  p.can_manage_forms,
  p.can_create_inspections,
  p.can_view_inspections
FROM users u
LEFT JOIN user_permissions p ON u.id = p.user_id
WHERE u.role = 'admin';

-- Expected output:
-- All permission columns should show 'true'

-- Step 5: If you don't have any admin user at all, create one
-- (Uncomment and modify as needed)
/*
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create admin user
  INSERT INTO users (name, pin, role, email, is_active)
  VALUES ('Admin User', '1234', 'admin', 'admin@inspection.local', true)
  RETURNING id INTO v_user_id;

  -- Create admin permissions
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
  ) VALUES (
    v_user_id,
    true, true, true, true, true, true, true, true, true
  );

  RAISE NOTICE 'Admin user created with ID: %', v_user_id;
END $$;
*/
