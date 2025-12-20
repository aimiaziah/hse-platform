-- Migration: Create announcements table
-- Description: Allows admins to post announcements visible to employees

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,

  -- Publishing control
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,

  -- Author tracking
  created_by UUID NOT NULL REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_announcements_is_published ON announcements(is_published);
CREATE INDEX idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX idx_announcements_created_by ON announcements(created_by);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- RLS Policies
-- Note: API routes use service role key which bypasses RLS
-- These policies provide additional security for direct client access
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read published announcements
CREATE POLICY "Anyone can view published announcements"
  ON announcements FOR SELECT
  USING (is_published = true);

-- Only admins can create, update, or delete announcements
-- This policy checks user role from the users table
CREATE POLICY "Only admins can manage announcements"
  ON announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'admin'
    )
  );
