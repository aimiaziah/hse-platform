-- Migration: Add Profile Picture Support
-- Description: Adds profile_picture field to users table for Microsoft profile photos
-- Date: 2025-12-21

-- Add profile_picture column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add comment to document the column
COMMENT ON COLUMN users.profile_picture IS 'User profile picture URL or base64 data (from Microsoft account or uploaded)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Profile picture support added successfully!';
  RAISE NOTICE 'Users will now have their Microsoft profile photos displayed.';
END $$;
