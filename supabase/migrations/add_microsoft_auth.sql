-- Migration: Add Microsoft Authentication Support
-- Description: Adds columns to users table to support Microsoft OAuth login
-- Date: 2025-11-28

-- Add Microsoft authentication columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS microsoft_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS microsoft_access_token TEXT,
ADD COLUMN IF NOT EXISTS microsoft_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS microsoft_token_expires_at TIMESTAMP;

-- Add comment to document the columns
COMMENT ON COLUMN users.email IS 'User email address from Microsoft account';
COMMENT ON COLUMN users.microsoft_id IS 'Microsoft Graph user ID (unique identifier)';
COMMENT ON COLUMN users.microsoft_access_token IS 'Microsoft OAuth access token for Graph API calls';
COMMENT ON COLUMN users.microsoft_refresh_token IS 'Microsoft OAuth refresh token for renewing access';
COMMENT ON COLUMN users.microsoft_token_expires_at IS 'Timestamp when the access token expires';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update last_login column to be nullable if it isn't already
ALTER TABLE users ALTER COLUMN last_login DROP NOT NULL;

-- Make sure pin column is nullable (since Microsoft users might not have a PIN initially)
ALTER TABLE users ALTER COLUMN pin DROP NOT NULL;

-- Add a check constraint to ensure users have either PIN or Microsoft ID
ALTER TABLE users
ADD CONSTRAINT users_auth_method_check
CHECK (
  (pin IS NOT NULL AND pin != '') OR
  (microsoft_id IS NOT NULL AND microsoft_id != '')
);

-- Create a function to automatically refresh expired tokens
-- This is a placeholder - you'll need to implement token refresh logic in your app
CREATE OR REPLACE FUNCTION is_microsoft_token_expired(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  token_expires_at TIMESTAMP;
BEGIN
  SELECT microsoft_token_expires_at INTO token_expires_at
  FROM users
  WHERE id = user_id;

  IF token_expires_at IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN token_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_microsoft_token_expired TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Microsoft authentication support added successfully!';
  RAISE NOTICE 'Users can now login with Microsoft accounts.';
  RAISE NOTICE 'Remember to set NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID in your .env file';
END $$;
