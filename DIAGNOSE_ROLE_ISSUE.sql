-- =====================================================
-- DIAGNOSE: Check Role Issue
-- =====================================================
-- Run this in Supabase SQL Editor first to understand the problem
-- =====================================================

-- Check 1: What enum values are defined?
SELECT 'Defined enum values for user_role:' as check_name;
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumlabel;

-- Check 2: What roles are actually in the users table?
SELECT 'Actual role values in users table:' as check_name;
SELECT role::text as role_value, COUNT(*) as user_count
FROM users
GROUP BY role::text
ORDER BY role_value;

-- Check 3: Show all users with their details
SELECT 'All users:' as check_name;
SELECT
  id,
  name,
  email,
  pin,
  role::text as role,
  is_active
FROM users
ORDER BY created_at;

-- Check 4: Check if there are any permission records
SELECT 'User permissions:' as check_name;
SELECT
  up.*,
  u.name,
  u.role::text as user_role
FROM user_permissions up
JOIN users u ON u.id = up.user_id
ORDER BY u.name;
