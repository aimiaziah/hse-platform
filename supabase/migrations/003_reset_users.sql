-- Reset Users Migration
-- This migration removes all existing users and recreates the admin user
-- Run this in your Supabase SQL Editor to fix login issues

-- Step 1: Delete all user permissions (cascade will handle this, but being explicit)
DELETE FROM user_permissions WHERE user_id NOT IN ('00000000-0000-0000-0000-000000000001');

-- Step 2: Delete all users except the admin placeholder
DELETE FROM users WHERE id != '00000000-0000-0000-0000-000000000001';

-- Step 3: Delete admin if exists (we'll recreate with correct data)
DELETE FROM user_permissions WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';

-- Step 4: Create fresh admin user
INSERT INTO users (
  id,
  name,
  email,
  pin,
  role,
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
  true,
  NOW(),
  NOW()
);

-- Step 5: Create admin permissions with ALL permissions enabled
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
  true,  -- can_manage_users - Admin can add/edit/delete users
  true,  -- can_manage_forms - Admin can manage form templates
  true,  -- can_create_inspections - Admin can create inspections
  true,  -- can_view_inspections - Admin can view all inspections
  true,  -- can_review_inspections - Admin can review inspections
  true,  -- can_approve_inspections - Admin can approve inspections
  true,  -- can_reject_inspections - Admin can reject inspections
  true,  -- can_view_pending_inspections - Admin can see pending inspections
  true   -- can_view_analytics - Admin can view analytics
);

-- Step 6: Verify the admin user was created correctly
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
WHERE u.id = '00000000-0000-0000-0000-000000000001';

-- Step 7: Show all users (should only be admin)
SELECT
  u.id,
  u.name,
  u.email,
  u.pin,
  u.role,
  u.is_active
FROM users u
ORDER BY u.created_at;
