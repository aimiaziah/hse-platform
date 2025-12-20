-- Migration: Clear All Users
-- Description: Removes all user records to start fresh with Microsoft authentication
-- Date: 2025-12-21

-- Delete all user permissions first (due to foreign key constraint)
DELETE FROM user_permissions;

-- Delete all users
DELETE FROM users;

-- Reset any sequences if needed
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All users have been cleared from the database.';
  RAISE NOTICE 'You can now login with Microsoft authentication with a clean slate.';
  RAISE NOTICE 'Email roles will be assigned based on .env configuration:';
  RAISE NOTICE '  - ADMIN_EMAIL_WHITELIST: hse-platform@theta-edge.com';
  RAISE NOTICE '  - SUPERVISOR_EMAIL_WHITELIST: supervisor@theta-edge.com';
  RAISE NOTICE '  - INSPECTOR_EMAIL_WHITELIST: aimi.azizul@theta-edge.com';
END $$;
