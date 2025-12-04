-- Create default admin user
-- This migration creates a default admin user with PIN 0000

-- Insert default admin user
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
ON CONFLICT (id) DO NOTHING;

-- Insert admin permissions
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
ON CONFLICT (user_id) DO NOTHING;
