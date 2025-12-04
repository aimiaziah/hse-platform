-- Fix Admin User Permissions
-- Run this in your Supabase SQL Editor to ensure admin has all permissions

-- First, let's check if the admin user exists
SELECT id, name, email, pin, role, is_active FROM users WHERE pin = '0000';

-- Check admin's current permissions
SELECT * FROM user_permissions
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- If admin doesn't exist, create it
INSERT INTO users (id, name, email, pin, role, is_active, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin User',
  'admin@inspection.local',
  '0000',
  'admin',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  is_active = true,
  role = 'admin';

-- Update or insert admin permissions with ALL permissions enabled
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
  true,  -- can_manage_users
  true,  -- can_manage_forms
  true,  -- can_create_inspections
  true,  -- can_view_inspections
  true,  -- can_review_inspections
  true,  -- can_approve_inspections
  true,  -- can_reject_inspections
  true,  -- can_view_pending_inspections
  true   -- can_view_analytics
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
  can_view_analytics = true;

-- Verify the fix
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
WHERE u.pin = '0000';
