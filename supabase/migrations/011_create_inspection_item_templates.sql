-- =====================================================
-- INSPECTION ITEM TEMPLATES
-- =====================================================
-- This table stores the default items/kits for fire extinguisher
-- and first aid inspections that can be managed by admins
-- =====================================================

CREATE TABLE IF NOT EXISTS inspection_item_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL, -- 'fire_extinguisher' or 'first_aid'
  item_type VARCHAR(50) NOT NULL, -- 'extinguisher', 'first_aid_item', 'first_aid_kit'

  -- For fire extinguishers
  item_no INTEGER, -- The "no" field (1, 2, 3, etc.)
  serial_no VARCHAR(255), -- Serial number
  location VARCHAR(255), -- Location
  type_size VARCHAR(100), -- Type/Size

  -- For first aid items
  item_id VARCHAR(100), -- Item ID (e.g., 'item1', 'item2')
  item_name VARCHAR(255), -- Item name (e.g., 'Cotton Wool')

  -- For first aid kits
  kit_no INTEGER, -- Kit number
  model VARCHAR(255), -- Model (e.g., 'PVC Large')
  model_no VARCHAR(100), -- Model number (e.g., 'P-3')
  kit_location VARCHAR(255), -- Kit location

  -- Metadata
  display_order INTEGER DEFAULT 0, -- Order for display
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- For any additional data

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT inspection_item_templates_type_check
    CHECK (template_type IN ('fire_extinguisher', 'first_aid')),
  CONSTRAINT inspection_item_templates_item_type_check
    CHECK (item_type IN ('extinguisher', 'first_aid_item', 'first_aid_kit'))
);

-- Indexes
CREATE INDEX idx_inspection_item_templates_type ON inspection_item_templates(template_type);
CREATE INDEX idx_inspection_item_templates_item_type ON inspection_item_templates(item_type);
CREATE INDEX idx_inspection_item_templates_active ON inspection_item_templates(is_active);
CREATE INDEX idx_inspection_item_templates_order ON inspection_item_templates(display_order);

-- RLS Policies
ALTER TABLE inspection_item_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read active templates
CREATE POLICY "Anyone can read active templates"
ON inspection_item_templates FOR SELECT
USING (is_active = true);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
ON inspection_item_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_inspection_item_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inspection_item_templates_updated_at
BEFORE UPDATE ON inspection_item_templates
FOR EACH ROW
EXECUTE FUNCTION update_inspection_item_templates_updated_at();

-- Insert default fire extinguisher templates
INSERT INTO inspection_item_templates (template_type, item_type, item_no, serial_no, location, type_size, display_order, is_active)
VALUES
  ('fire_extinguisher', 'extinguisher', 1, 'FF022018Y002311', 'Ground Floor', '9', 1, true),
  ('fire_extinguisher', 'extinguisher', 2, 'FF022018Y002640', 'Ground Floor', '9', 2, true),
  ('fire_extinguisher', 'extinguisher', 3, 'FF022018Y002996', 'Ground Floor', '9', 3, true),
  ('fire_extinguisher', 'extinguisher', 4, 'FF022018Y002646', 'Ground Floor', '9', 4, true),
  ('fire_extinguisher', 'extinguisher', 5, 'SR092021Y176423', 'Ground Floor', '9', 5, true),
  ('fire_extinguisher', 'extinguisher', 6, 'SR092021Y176466', 'Ground Floor', '9', 6, true),
  ('fire_extinguisher', 'extinguisher', 7, 'FF022018Y002904', 'Ground Floor', '9', 7, true),
  ('fire_extinguisher', 'extinguisher', 8, 'FF022018Y002555', 'Ground Floor', '9', 8, true),
  ('fire_extinguisher', 'extinguisher', 9, 'FF022018Y002990', 'Ground Floor', '9', 9, true)
ON CONFLICT DO NOTHING;

-- Insert default first aid items
INSERT INTO inspection_item_templates (template_type, item_type, item_id, item_name, display_order, is_active)
VALUES
  ('first_aid', 'first_aid_item', 'item1', 'Cotton Wool', 1, true),
  ('first_aid', 'first_aid_item', 'item2', 'Cotton Swabs', 2, true),
  ('first_aid', 'first_aid_item', 'item3', 'Cotton Buds', 3, true),
  ('first_aid', 'first_aid_item', 'item4', 'Cotton Balls', 4, true),
  ('first_aid', 'first_aid_item', 'item5', 'Analgesic Cream (Flanil)', 5, true),
  ('first_aid', 'first_aid_item', 'item6', 'Antiseptic Cream (Bacidin)', 6, true),
  ('first_aid', 'first_aid_item', 'item7', 'Surgical Tape 1.25cm', 7, true),
  ('first_aid', 'first_aid_item', 'item8', 'Lint Dressing No. 8', 8, true),
  ('first_aid', 'first_aid_item', 'item9', 'Wound Dressing', 9, true),
  ('first_aid', 'first_aid_item', 'item10', 'Non-Adherent Wound Compress', 10, true),
  ('first_aid', 'first_aid_item', 'item11', 'Gauze Swabs (5cmx5cmx8ply)', 11, true),
  ('first_aid', 'first_aid_item', 'item12', 'Non-Woven Triangular Bandage', 12, true),
  ('first_aid', 'first_aid_item', 'item13', 'Elastic Gauze Bandage 8cm', 13, true),
  ('first_aid', 'first_aid_item', 'item14', 'W.O.W Bandage (2.5cm/5cm/7.5cm)', 14, true),
  ('first_aid', 'first_aid_item', 'item15', 'Antibacterial Disinfectant (BactePro)', 15, true),
  ('first_aid', 'first_aid_item', 'item16', 'Antibacterial Disinfectant (Dr Cleanol)', 16, true),
  ('first_aid', 'first_aid_item', 'item17', 'Losyen Kuning (Cap Kaki Tiga)', 17, true),
  ('first_aid', 'first_aid_item', 'item18', 'Alcohol Swab', 18, true),
  ('first_aid', 'first_aid_item', 'item19', 'Linemen Wintergreen', 19, true),
  ('first_aid', 'first_aid_item', 'item20', 'Safety/Cloth Pin', 20, true),
  ('first_aid', 'first_aid_item', 'item21', 'Emergency Blanket', 21, true),
  ('first_aid', 'first_aid_item', 'item22', 'CPR Face Shield', 22, true),
  ('first_aid', 'first_aid_item', 'item23', 'Plastic Tweezers', 23, true),
  ('first_aid', 'first_aid_item', 'item24', 'Scissors', 24, true),
  ('first_aid', 'first_aid_item', 'item25', 'Assorted Plasters 50s', 25, true),
  ('first_aid', 'first_aid_item', 'item26', 'Plastic Strips 10s', 26, true),
  ('first_aid', 'first_aid_item', 'item27', 'Adhesive Plaster (Snowflake)', 27, true),
  ('first_aid', 'first_aid_item', 'item28', 'Roll Bandage', 28, true)
ON CONFLICT DO NOTHING;

-- Insert default first aid kits
INSERT INTO inspection_item_templates (template_type, item_type, kit_no, model, model_no, kit_location, display_order, is_active)
VALUES
  ('first_aid', 'first_aid_kit', 1, 'PVC Large', 'P-3', 'Ground Floor', 1, true),
  ('first_aid', 'first_aid_kit', 2, 'AS Transparent Small', 'AS-3ET', 'Ground Floor', 2, true),
  ('first_aid', 'first_aid_kit', 3, 'AS Transparent Small', 'AS-3ET', 'Ground Floor', 3, true),
  ('first_aid', 'first_aid_kit', 4, 'PVC Large', 'P-3', 'First Floor', 4, true),
  ('first_aid', 'first_aid_kit', 5, 'AS Transparent Small', 'AS-3ET', 'First Floor', 5, true),
  ('first_aid', 'first_aid_kit', 6, 'AS Transparent Small', 'AS-3ET', 'First Floor', 6, true),
  ('first_aid', 'first_aid_kit', 7, 'AS Transparent Small', 'AS-3ET', 'Second Floor', 7, true),
  ('first_aid', 'first_aid_kit', 8, 'AS Transparent Small', 'AS-3ET', 'Second Floor', 8, true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE inspection_item_templates IS 'Templates for inspection items (fire extinguishers, first aid items, and first aid kits) that can be managed by admins';
