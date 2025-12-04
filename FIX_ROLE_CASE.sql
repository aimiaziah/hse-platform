-- =====================================================
-- QUICK FIX: Role Case Sensitivity Issue
-- =====================================================
-- INSTRUCTIONS:
-- 1. Go to https://app.supabase.com/project/ooriqpeqtfmgfynlbsxb/sql
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
-- =====================================================

-- Step 1: Check current roles (BEFORE fix)
SELECT 'BEFORE FIX - Current roles:' as status;
SELECT DISTINCT role, COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY role;

-- Step 2: Update all roles to lowercase (cast enum to text)
UPDATE users
SET role = LOWER(role::text)::user_role
WHERE role::text != LOWER(role::text);

-- Step 3: Check roles again (AFTER fix)
SELECT 'AFTER FIX - Current roles:' as status;
SELECT DISTINCT role, COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY role;

-- Step 4: Now fix admin permissions (migration 006)
-- Update all admin users to have full permissions
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

-- Step 5: For any admin users without permissions record, create one
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

-- Step 6: Verify admin permissions
SELECT 'VERIFICATION - Admin users with permissions:' as status;
SELECT
  u.id,
  u.name,
  u.email,
  u.role,
  u.is_active,
  up.can_manage_users,
  up.can_manage_forms,
  up.can_view_analytics
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.role = 'admin';

-- Success!
SELECT '✅ FIX COMPLETE! All roles are now lowercase and admin permissions are set!' AS status;
