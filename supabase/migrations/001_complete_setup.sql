-- =====================================================
-- COMPLETE SETUP MIGRATION
-- =====================================================
-- This migration sets up the complete database
-- Run this AFTER running schema.sql
-- =====================================================

-- =====================================================
-- CREATE DEFAULT ADMIN USER
-- =====================================================

-- First, check if admin exists and delete if present (for clean setup)
DELETE FROM user_permissions WHERE user_id IN (
  SELECT id FROM users WHERE email = 'admin@inspection.local'
);
DELETE FROM users WHERE email = 'admin@inspection.local';

-- Create admin user
INSERT INTO users (
  id,
  email,
  name,
  pin,
  role,
  is_active,
  created_at
) VALUES (
  'af85f349-4b90-42e9-984a-fa8758df88a5',
  'admin@inspection.local',
  'System Administrator',
  '1234',
  'admin',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  pin = EXCLUDED.pin,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Create admin permissions (full access)
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
) VALUES (
  'af85f349-4b90-42e9-984a-fa8758df88a5',
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  can_manage_users = EXCLUDED.can_manage_users,
  can_manage_forms = EXCLUDED.can_manage_forms,
  can_create_inspections = EXCLUDED.can_create_inspections,
  can_view_inspections = EXCLUDED.can_view_inspections,
  can_review_inspections = EXCLUDED.can_review_inspections,
  can_approve_inspections = EXCLUDED.can_approve_inspections,
  can_reject_inspections = EXCLUDED.can_reject_inspections,
  can_view_pending_inspections = EXCLUDED.can_view_pending_inspections,
  can_view_analytics = EXCLUDED.can_view_analytics;

-- =====================================================
-- CREATE SAMPLE USERS FOR TESTING
-- =====================================================

-- Inspector user
INSERT INTO users (
  email,
  name,
  pin,
  role,
  is_active,
  created_by
) VALUES (
  'inspector@inspection.local',
  'John Inspector',
  '2345',
  'inspector',
  true,
  'af85f349-4b90-42e9-984a-fa8758df88a5'
) ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Get inspector ID and create permissions
DO $$
DECLARE
  inspector_id UUID;
BEGIN
  SELECT id INTO inspector_id FROM users WHERE email = 'inspector@inspection.local';

  IF inspector_id IS NOT NULL THEN
    INSERT INTO user_permissions (
      user_id,
      can_create_inspections,
      can_view_inspections
    ) VALUES (
      inspector_id,
      true,
      true
    ) ON CONFLICT (user_id) DO UPDATE SET
      can_create_inspections = EXCLUDED.can_create_inspections,
      can_view_inspections = EXCLUDED.can_view_inspections;
  END IF;
END $$;

-- Supervisor user
INSERT INTO users (
  email,
  name,
  pin,
  role,
  is_active,
  created_by
) VALUES (
  'supervisor@inspection.local',
  'Jane Supervisor',
  '3456',
  'supervisor',
  true,
  'af85f349-4b90-42e9-984a-fa8758df88a5'
) ON CONFLICT (email) DO NOTHING;

-- Get supervisor ID and create permissions
DO $$
DECLARE
  supervisor_id UUID;
BEGIN
  SELECT id INTO supervisor_id FROM users WHERE email = 'supervisor@inspection.local';

  IF supervisor_id IS NOT NULL THEN
    INSERT INTO user_permissions (
      user_id,
      can_view_inspections,
      can_review_inspections,
      can_approve_inspections,
      can_reject_inspections,
      can_view_pending_inspections
    ) VALUES (
      supervisor_id,
      true,
      true,
      true,
      true,
      true
    ) ON CONFLICT (user_id) DO UPDATE SET
      can_view_inspections = EXCLUDED.can_view_inspections,
      can_review_inspections = EXCLUDED.can_review_inspections,
      can_approve_inspections = EXCLUDED.can_approve_inspections,
      can_reject_inspections = EXCLUDED.can_reject_inspections,
      can_view_pending_inspections = EXCLUDED.can_view_pending_inspections;
  END IF;
END $$;

-- =====================================================
-- CREATE SAMPLE ASSETS FOR TESTING
-- =====================================================

-- Get location IDs
DO $$
DECLARE
  ground_floor_id UUID;
  level_1_id UUID;
BEGIN
  SELECT id INTO ground_floor_id FROM locations WHERE name = 'Ground Floor';
  SELECT id INTO level_1_id FROM locations WHERE name = 'Level 1';

  -- Fire extinguishers
  INSERT INTO assets (
    asset_type,
    serial_number,
    asset_number,
    location_id,
    type_size,
    expiry_date,
    is_active
  ) VALUES
    ('fire_extinguisher', 'FE-2024-001', 1, ground_floor_id, 'ABC 9kg', (CURRENT_DATE + INTERVAL '2 years')::date, true),
    ('fire_extinguisher', 'FE-2024-002', 2, ground_floor_id, 'ABC 9kg', (CURRENT_DATE + INTERVAL '18 months')::date, true),
    ('fire_extinguisher', 'FE-2024-003', 3, level_1_id, 'ABC 9kg', (CURRENT_DATE + INTERVAL '1 year')::date, true),
    ('fire_extinguisher', 'FE-2024-004', 4, level_1_id, 'CO2 5kg', (CURRENT_DATE + INTERVAL '2 years')::date, true)
  ON CONFLICT (serial_number) DO NOTHING;

  -- First aid kits
  INSERT INTO assets (
    asset_type,
    serial_number,
    asset_number,
    location_id,
    type_size,
    expiry_date,
    is_active
  ) VALUES
    ('first_aid_kit', 'FA-2024-001', 1, ground_floor_id, 'Standard Kit', (CURRENT_DATE + INTERVAL '1 year')::date, true),
    ('first_aid_kit', 'FA-2024-002', 2, level_1_id, 'Standard Kit', (CURRENT_DATE + INTERVAL '1 year')::date, true)
  ON CONFLICT (serial_number) DO NOTHING;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify users
SELECT
  name,
  email,
  role,
  pin,
  is_active,
  (SELECT count(*) FROM user_permissions WHERE user_id = users.id) as has_permissions
FROM users
ORDER BY created_at;

-- Verify permissions
SELECT
  u.name,
  u.role,
  up.*
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
ORDER BY u.created_at;

-- Verify assets
SELECT
  asset_type,
  serial_number,
  l.name as location,
  type_size,
  expiry_date,
  is_active
FROM assets a
LEFT JOIN locations l ON a.location_id = l.id
ORDER BY asset_type, asset_number;

-- Summary
SELECT
  'Users' as entity,
  count(*)::text as count
FROM users
UNION ALL
SELECT
  'Active Locations',
  count(*)::text
FROM locations
WHERE is_active = true
UNION ALL
SELECT
  'Active Assets',
  count(*)::text
FROM assets
WHERE is_active = true;
