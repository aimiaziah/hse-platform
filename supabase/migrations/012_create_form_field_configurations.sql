-- =====================================================
-- FORM FIELD CONFIGURATIONS
-- =====================================================
-- This table stores the form field/column configurations
-- for fire extinguisher and first aid inspection forms
-- =====================================================

CREATE TABLE IF NOT EXISTS form_field_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type VARCHAR(50) NOT NULL, -- 'fire_extinguisher' or 'first_aid'

  -- Field identification
  field_key VARCHAR(100) NOT NULL, -- e.g., 'shell', 'hose', 'serialNo'
  field_label VARCHAR(255) NOT NULL, -- Display label e.g., 'Shell', 'Hose', 'Serial No'
  field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'rating', 'date', 'textarea'

  -- Display properties
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false,
  column_width INTEGER, -- For table display
  min_width INTEGER, -- Minimum column width

  -- Field-specific properties
  default_value TEXT,
  placeholder TEXT,
  help_text TEXT,

  -- Validation
  validation_rules JSONB, -- e.g., {"min": 0, "max": 100, "pattern": "..."}

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT form_field_configurations_type_check
    CHECK (form_type IN ('fire_extinguisher', 'first_aid')),
  CONSTRAINT form_field_configurations_field_type_check
    CHECK (field_type IN ('text', 'number', 'rating', 'date', 'textarea', 'select')),
  UNIQUE(form_type, field_key, is_active) -- Only one active version per field
);

-- Indexes
CREATE INDEX idx_form_field_configurations_form_type ON form_field_configurations(form_type);
CREATE INDEX idx_form_field_configurations_active ON form_field_configurations(is_active);
CREATE INDEX idx_form_field_configurations_order ON form_field_configurations(display_order);

-- RLS Policies
ALTER TABLE form_field_configurations ENABLE ROW LEVEL SECURITY;

-- Anyone can read active configurations
CREATE POLICY "Anyone can read active configurations"
ON form_field_configurations FOR SELECT
USING (is_active = true);

-- Admins can manage configurations
CREATE POLICY "Admins can manage configurations"
ON form_field_configurations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_form_field_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_form_field_configurations_updated_at
BEFORE UPDATE ON form_field_configurations
FOR EACH ROW
EXECUTE FUNCTION update_form_field_configurations_updated_at();

-- Insert default fire extinguisher form fields
INSERT INTO form_field_configurations (form_type, field_key, field_label, field_type, display_order, is_required, column_width, min_width, is_active)
VALUES
  ('fire_extinguisher', 'no', 'No', 'number', 1, true, 60, 60, true),
  ('fire_extinguisher', 'serialNo', 'Serial No', 'text', 2, true, 140, 120, true),
  ('fire_extinguisher', 'location', 'Location', 'text', 3, true, 100, 80, true),
  ('fire_extinguisher', 'typeSize', 'Type/Size (kg)', 'text', 4, false, 100, 80, true),
  ('fire_extinguisher', 'shell', 'Shell', 'rating', 5, false, 60, 60, true),
  ('fire_extinguisher', 'hose', 'Hose', 'rating', 6, false, 60, 60, true),
  ('fire_extinguisher', 'nozzle', 'Nozzle', 'rating', 7, false, 60, 60, true),
  ('fire_extinguisher', 'pressureGauge', 'Pressure Gauge', 'rating', 8, false, 80, 70, true),
  ('fire_extinguisher', 'safetyPin', 'Safety Pin', 'rating', 9, false, 80, 70, true),
  ('fire_extinguisher', 'pinSeal', 'Pin Seal', 'rating', 10, false, 80, 70, true),
  ('fire_extinguisher', 'accessible', 'Accessible', 'rating', 11, false, 80, 70, true),
  ('fire_extinguisher', 'missingNotInPlace', 'Missing/Not in Place', 'rating', 12, false, 120, 100, true),
  ('fire_extinguisher', 'emptyPressureLow', 'Empty/Pressure Low', 'rating', 13, false, 120, 100, true),
  ('fire_extinguisher', 'servicingTags', 'Servicing Tags', 'rating', 14, false, 100, 80, true),
  ('fire_extinguisher', 'expiryDate', 'Expiry Date', 'date', 15, false, 100, 80, true),
  ('fire_extinguisher', 'remarks', 'Remarks', 'textarea', 16, false, 200, 150, true)
ON CONFLICT (form_type, field_key, is_active) DO NOTHING;

-- Insert default first aid form fields (these are the item columns)
INSERT INTO form_field_configurations (form_type, field_key, field_label, field_type, display_order, is_required, column_width, min_width, is_active)
VALUES
  ('first_aid', 'item_id', 'Item ID', 'text', 1, true, 100, 80, true),
  ('first_aid', 'item_name', 'Item Name', 'text', 2, true, 200, 150, true),
  ('first_aid', 'quantity', 'Quantity', 'text', 3, false, 100, 80, true),
  ('first_aid', 'expiryDateOption', 'Expiry Date Option', 'select', 4, false, 120, 100, true),
  ('first_aid', 'expiryDate', 'Expiry Date', 'date', 5, false, 120, 100, true),
  ('first_aid', 'status', 'Status', 'rating', 6, false, 80, 70, true)
ON CONFLICT (form_type, field_key, is_active) DO NOTHING;

COMMENT ON TABLE form_field_configurations IS 'Configuration for form fields/columns in inspection forms that can be managed by admins';
