-- Migration: Add is_pinned column to announcements table
-- Description: Allows admins to pin important announcements (like welcome posts) to the top

-- Add is_pinned column
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Create index for better performance when sorting by pinned status
CREATE INDEX IF NOT EXISTS idx_announcements_is_pinned ON announcements(is_pinned DESC, published_at DESC);

-- Add comment to document the column
COMMENT ON COLUMN announcements.is_pinned IS 'Whether this announcement is pinned to the top of the list';

