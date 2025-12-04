-- =====================================================
-- PWA SAFETY INSPECTION PLATFORM - DATABASE SCHEMA
-- =====================================================
-- Author: Backend Expert
-- Description: Complete PostgreSQL schema for Supabase
-- Version: 1.0
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CUSTOM TYPES
-- =====================================================

-- User role enum
CREATE TYPE user_role AS ENUM ('admin', 'inspector', 'supervisor', 'employee');

-- Inspection status enum
CREATE TYPE inspection_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'completed'
);

-- Inspection type enum
CREATE TYPE inspection_type AS ENUM (
  'fire_extinguisher',
  'first_aid',
  'hse_general'
);

-- Rating type enum
CREATE TYPE rating_type AS ENUM ('✓', 'X', 'NA');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  pin VARCHAR(10) NOT NULL, -- For quick login
  role user_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),

  -- Indexes
  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- USER PERMISSIONS TABLE (for fine-grained control)
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Admin permissions
  can_manage_users BOOLEAN DEFAULT false,
  can_manage_forms BOOLEAN DEFAULT false,

  -- Inspector permissions
  can_create_inspections BOOLEAN DEFAULT false,
  can_view_inspections BOOLEAN DEFAULT false,

  -- Supervisor permissions
  can_review_inspections BOOLEAN DEFAULT false,
  can_approve_inspections BOOLEAN DEFAULT false,
  can_reject_inspections BOOLEAN DEFAULT false,
  can_view_pending_inspections BOOLEAN DEFAULT false,

  -- Employee permissions
  can_view_analytics BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT user_permissions_user_id_unique UNIQUE(user_id)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);

-- LOCATIONS TABLE
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT locations_name_unique UNIQUE(name)
);

CREATE INDEX idx_locations_is_active ON locations(is_active);

-- ASSETS TABLE (Fire Extinguishers, First Aid Kits, etc.)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_type VARCHAR(50) NOT NULL, -- 'fire_extinguisher', 'first_aid_kit', etc.
  serial_number VARCHAR(255) NOT NULL,
  asset_number INTEGER,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  -- Asset-specific fields
  type_size VARCHAR(100), -- e.g., "ABC 9kg" for fire extinguisher
  expiry_date DATE,
  last_inspection_date DATE,

  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- For flexible asset-specific data

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT assets_serial_number_unique UNIQUE(serial_number)
);

CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_location_id ON assets(location_id);
CREATE INDEX idx_assets_is_active ON assets(is_active);
CREATE INDEX idx_assets_expiry_date ON assets(expiry_date);
CREATE INDEX idx_assets_metadata ON assets USING GIN(metadata);

-- FORM TEMPLATES TABLE
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  inspection_type inspection_type NOT NULL,
  description TEXT,
  fields JSONB NOT NULL, -- Array of form fields configuration
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_form_templates_inspection_type ON form_templates(inspection_type);
CREATE INDEX idx_form_templates_is_active ON form_templates(is_active);

-- INSPECTIONS TABLE (Main inspection records)
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated inspection number
  inspection_type inspection_type NOT NULL,

  -- Inspector info
  inspector_id UUID NOT NULL REFERENCES users(id),
  inspected_by VARCHAR(255) NOT NULL, -- Name for record keeping
  designation VARCHAR(100),

  -- Asset & Location
  asset_id UUID REFERENCES assets(id),
  location_id UUID REFERENCES locations(id),

  -- Dates
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Status & Review
  status inspection_status DEFAULT 'draft',
  reviewer_id UUID REFERENCES users(id),
  review_comments TEXT,

  -- Form data
  form_template_id UUID REFERENCES form_templates(id),
  form_data JSONB NOT NULL, -- Complete inspection form data

  -- Additional info
  signature TEXT, -- Base64 signature
  remarks TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT inspections_check_reviewer CHECK (
    (status IN ('approved', 'rejected') AND reviewer_id IS NOT NULL) OR
    (status NOT IN ('approved', 'rejected'))
  )
);

CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_inspection_type ON inspections(inspection_type);
CREATE INDEX idx_inspections_asset_id ON inspections(asset_id);
CREATE INDEX idx_inspections_location_id ON inspections(location_id);
CREATE INDEX idx_inspections_inspection_date ON inspections(inspection_date);
CREATE INDEX idx_inspections_reviewer_id ON inspections(reviewer_id);
CREATE INDEX idx_inspections_form_data ON inspections USING GIN(form_data);

-- INSPECTION ITEMS TABLE (Individual checklist items)
CREATE TABLE inspection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  item_number INTEGER NOT NULL,
  label VARCHAR(500) NOT NULL,
  answer rating_type,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT inspection_items_unique_per_inspection UNIQUE(inspection_id, item_number)
);

CREATE INDEX idx_inspection_items_inspection_id ON inspection_items(inspection_id);

-- =====================================================
-- ANALYTICS & REPORTING TABLES
-- =====================================================

-- ANALYTICS SUMMARY TABLE (Pre-computed analytics)
CREATE TABLE analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metrics
  total_inspections INTEGER DEFAULT 0,
  completed_inspections INTEGER DEFAULT 0,
  pending_inspections INTEGER DEFAULT 0,
  approved_inspections INTEGER DEFAULT 0,
  rejected_inspections INTEGER DEFAULT 0,

  -- By type
  fire_extinguisher_count INTEGER DEFAULT 0,
  first_aid_count INTEGER DEFAULT 0,
  hse_general_count INTEGER DEFAULT 0,

  -- Performance metrics
  average_review_time_hours DECIMAL(10, 2),
  compliance_rate DECIMAL(5, 2),

  -- Breakdown by location
  metrics_by_location JSONB,
  metrics_by_inspector JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT analytics_summary_period_unique UNIQUE(period_start, period_end)
);

CREATE INDEX idx_analytics_summary_period ON analytics_summary(period_start, period_end);

-- =====================================================
-- AUDIT & SECURITY TABLES
-- =====================================================

-- AUDIT TRAIL TABLE
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  user_role user_role,

  -- What
  action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.
  entity_type VARCHAR(100) NOT NULL, -- 'user', 'inspection', 'asset', etc.
  entity_id UUID,

  -- Details
  description TEXT,
  old_values JSONB,
  new_values JSONB,

  -- When & Where
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Request info
  request_method VARCHAR(10),
  request_path TEXT,

  -- Severity
  severity VARCHAR(20) DEFAULT 'info' -- 'info', 'warning', 'error', 'critical'
);

CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_entity_type ON audit_trail(entity_type);
CREATE INDEX idx_audit_trail_entity_id ON audit_trail(entity_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_trail_severity ON audit_trail(severity);

-- SECURITY LOGS TABLE (DevSecOps)
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  event_type VARCHAR(100) NOT NULL, -- 'FAILED_LOGIN', 'UNAUTHORIZED_ACCESS', etc.
  severity VARCHAR(20) DEFAULT 'info',

  user_id UUID REFERENCES users(id),
  ip_address INET,
  user_agent TEXT,

  description TEXT NOT NULL,
  metadata JSONB,

  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Risk assessment
  risk_level INTEGER DEFAULT 0, -- 0-10 scale
  requires_action BOOLEAN DEFAULT false,
  actioned_by UUID REFERENCES users(id),
  actioned_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_risk_level ON security_logs(risk_level DESC);
CREATE INDEX idx_security_logs_requires_action ON security_logs(requires_action);

-- =====================================================
-- NOTIFICATION & ALERTS TABLES
-- =====================================================

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'error', 'success'

  related_entity_type VARCHAR(100),
  related_entity_id UUID,

  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON user_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspection_items_updated_at BEFORE UPDATE ON inspection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_summary_updated_at BEFORE UPDATE ON analytics_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate inspection number
CREATE OR REPLACE FUNCTION generate_inspection_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count FROM inspections;
  new_number := 'INS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((count + 1)::TEXT, 5, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate inspection number
CREATE OR REPLACE FUNCTION set_inspection_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inspection_number IS NULL OR NEW.inspection_number = '' THEN
    NEW.inspection_number := generate_inspection_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_inspection_number_trigger BEFORE INSERT ON inspections
  FOR EACH ROW EXECUTE FUNCTION set_inspection_number();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Inspections table policies
CREATE POLICY "Inspectors can view their own inspections" ON inspections
  FOR SELECT USING (inspector_id = auth.uid());

CREATE POLICY "Supervisors can view all inspections" ON inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('supervisor', 'admin')
    )
  );

CREATE POLICY "Inspectors can create inspections" ON inspections
  FOR INSERT WITH CHECK (
    inspector_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid() AND up.can_create_inspections = true
    )
  );

CREATE POLICY "Inspectors can update their own draft inspections" ON inspections
  FOR UPDATE USING (
    inspector_id = auth.uid() AND status = 'draft'
  );

CREATE POLICY "Supervisors can update inspection status" ON inspections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_permissions up
      WHERE up.user_id = auth.uid() AND up.can_review_inspections = true
    )
  );

-- Audit trail policies (read-only for non-admins)
CREATE POLICY "Admins can view all audit logs" ON audit_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Security logs policies (admin only)
CREATE POLICY "Admins can view security logs" ON security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: User with permissions
CREATE OR REPLACE VIEW v_users_with_permissions AS
SELECT
  u.*,
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
LEFT JOIN user_permissions up ON u.id = up.user_id;

-- View: Inspections with details
CREATE OR REPLACE VIEW v_inspections_detailed AS
SELECT
  i.id,
  i.inspection_number,
  i.inspection_type,
  i.inspector_id,
  i.inspected_by,
  i.designation,
  i.asset_id,
  i.location_id,
  i.inspection_date,
  i.submitted_at,
  i.reviewed_at,
  i.status,
  i.reviewer_id,
  i.review_comments,
  i.form_template_id,
  i.form_data,
  i.signature,
  i.remarks,
  i.created_at,
  i.updated_at,
  u.name as inspector_name,
  u.email as inspector_email,
  l.name as location_name,
  a.serial_number as asset_serial_number,
  a.asset_type as asset_type,
  rv.name as reviewer_name,
  rv.email as reviewer_email
FROM inspections i
LEFT JOIN users u ON i.inspector_id = u.id
LEFT JOIN locations l ON i.location_id = l.id
LEFT JOIN assets a ON i.asset_id = a.id
LEFT JOIN users rv ON i.reviewer_id = rv.id;

-- View: Pending inspections for supervisors
CREATE OR REPLACE VIEW v_pending_inspections AS
SELECT
  i.id,
  i.inspection_number,
  i.inspection_type,
  i.inspector_id,
  i.inspected_by,
  i.inspection_date,
  i.submitted_at,
  i.status,
  l.name as location_name,
  a.serial_number as asset_serial_number,
  EXTRACT(EPOCH FROM (NOW() - i.submitted_at))/3600 as hours_pending
FROM inspections i
LEFT JOIN locations l ON i.location_id = l.id
LEFT JOIN assets a ON i.asset_id = a.id
WHERE i.status = 'pending_review'
ORDER BY i.submitted_at ASC;

-- View: Assets requiring inspection
CREATE OR REPLACE VIEW v_assets_requiring_inspection AS
SELECT
  a.*,
  l.name as location_name,
  CASE
    WHEN a.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN a.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    WHEN a.last_inspection_date IS NULL THEN 'never_inspected'
    WHEN a.last_inspection_date < CURRENT_DATE - INTERVAL '90 days' THEN 'overdue'
    ELSE 'ok'
  END as status
FROM assets a
LEFT JOIN locations l ON a.location_id = l.id
WHERE a.is_active = true;

-- =====================================================
-- INITIAL DATA / SEED DATA
-- =====================================================

-- Insert default locations
INSERT INTO locations (name, description) VALUES
  ('Ground Floor', 'Ground floor of main building'),
  ('Level 1', 'First floor of main building'),
  ('Level 2', 'Second floor of main building'),
  ('Level 3', 'Third floor of main building')
ON CONFLICT (name) DO NOTHING;

-- Note: Users will be created via Supabase Auth, then synced to this table
-- The application will handle initial admin user creation

COMMENT ON TABLE users IS 'User accounts synced with Supabase Auth';
COMMENT ON TABLE user_permissions IS 'Fine-grained permissions per user based on their role';
COMMENT ON TABLE inspections IS 'Main inspection records for all types of safety inspections';
COMMENT ON TABLE audit_trail IS 'Complete audit trail for compliance and security';
COMMENT ON TABLE security_logs IS 'Security events for DevSecOps monitoring';
