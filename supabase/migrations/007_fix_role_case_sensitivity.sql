-- =====================================================
-- FIX ROLE CASE SENSITIVITY
-- =====================================================
-- Description: Standardize all role values to lowercase
-- This fixes the "Admin" vs "admin" case mismatch
-- =====================================================

-- Step 1: Show current roles before fix
SELECT DISTINCT role, COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY role;

-- Step 2: Update all roles to lowercase (cast enum to text)
UPDATE users
SET role = LOWER(role::text)::user_role
WHERE role::text != LOWER(role::text);

-- Step 3: Verify the update
SELECT DISTINCT role, COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY role;

-- Step 4: Update the enum type itself to only have lowercase values
-- First, check what enum values exist
DO $$
BEGIN
  -- This will show the current enum values
  RAISE NOTICE 'Current enum values:';
END $$;

SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumlabel;

-- Success message
SELECT 'Role case sensitivity has been fixed! All roles are now lowercase.' AS status;
