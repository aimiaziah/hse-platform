-- Verify and Fix Admin Permissions
-- Run this to debug and fix admin login issues

-- Step 1: Check if admin user exists
SELECT
  'Admin User Check' as check_type,
  id,
  name,
  email,
  pin,
  role,
  is_active,
  department,
  created_at
FROM users
WHERE pin = '0000' OR id = '00000000-0000-0000-0000-000000000001';

-- Step 2: Check admin permissions
SELECT
  'Admin Permissions Check' as check_type,
  up.*
FROM user_permissions up
WHERE up.user_id = '00000000-0000-0000-0000-000000000001';

-- Step 3: If permissions are missing or incorrect, update them
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
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Step 4: If admin user doesn't exist, create it
INSERT INTO users (
  id,
  name,
  email,
  pin,
  role,
  department,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin User',
  'admin@inspection.local',
  '0000',
  'admin',
  'Administration',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  pin = '0000',
  role = 'admin',
  is_active = true,
  department = 'Administration',
  updated_at = NOW();

-- Step 5: Ensure admin permissions exist
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
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
)
ON CONFLICT (user_id) DO UPDATE SET
  can_manage_users = true,
  can_manage_forms = true,
  can_create_inspections = true,
  can_view_inspections = true,
  can_review_inspections = true,
  can_approve_inspections = true,
  can_reject_inspections = true,
  can_view_pending_inspections = true,
  can_view_analytics = true,
  updated_at = NOW();

-- Step 6: Final verification - Show complete admin info
SELECT
  'FINAL VERIFICATION' as status,
  u.id,
  u.name,
  u.email,
  u.pin,
  u.role,
  u.department,
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
WHERE u.pin = '0000' OR u.id = '00000000-0000-0000-0000-000000000001';

-- Step 7: Test query (this is what the login API runs)
SELECT
  'LOGIN API QUERY TEST' as status,
  u.*,
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
WHERE u.pin = '0000' AND u.is_active = true;
