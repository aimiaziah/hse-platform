-- =====================================================
-- FORM TEMPLATES - Fire Extinguisher & First Aid
-- =====================================================
-- Run this SQL in Supabase SQL Editor to add form templates
-- =====================================================

-- First, we need to add the admin user ID
-- Replace 'YOUR_ADMIN_USER_ID' with your actual admin user ID from users table
-- You can find it by running: SELECT id FROM users WHERE role = 'admin';

-- =====================================================
-- FIRE EXTINGUISHER FORM TEMPLATE
-- =====================================================

INSERT INTO form_templates (
  name,
  inspection_type,
  description,
  fields,
  is_active,
  version,
  created_by
)
VALUES (
  'Fire Extinguisher Checklist 2025',
  'fire_extinguisher',
  'Standard fire extinguisher inspection checklist based on Excel template',
  '{
    "sections": [
      {
        "id": "section1",
        "title": "Section 1: General Information",
        "fields": [
          {
            "id": "company",
            "label": "Company",
            "type": "text",
            "required": true
          },
          {
            "id": "inspectedBy",
            "label": "Inspected by",
            "type": "text",
            "required": true
          },
          {
            "id": "dateOfInspection",
            "label": "Date of Inspection",
            "type": "date",
            "required": true
          },
          {
            "id": "designation",
            "label": "Designation",
            "type": "text",
            "required": false
          },
          {
            "id": "signature",
            "label": "Signature",
            "type": "signature",
            "required": true
          }
        ]
      },
      {
        "id": "section2",
        "title": "Section 2: Inspection Details",
        "type": "table",
        "legend": {
          "tick": "OK / Good Condition",
          "cross": "Not in good condition",
          "na": "Not Applicable"
        },
        "columns": [
          {"id": "no", "label": "No", "type": "number", "width": 50},
          {"id": "serialNo", "label": "Serial No", "type": "text", "width": 150},
          {"id": "location", "label": "Location", "type": "text", "width": 120},
          {"id": "typeSize", "label": "Type/Size (kg)", "type": "text", "width": 100},
          {"id": "shell", "label": "Shell", "type": "checkbox", "width": 80},
          {"id": "hose", "label": "Hose", "type": "checkbox", "width": 80},
          {"id": "nozzle", "label": "Nozzle", "type": "checkbox", "width": 80},
          {"id": "pressureGauge", "label": "Pressure Gauge", "type": "checkbox", "width": 100},
          {"id": "safetyPin", "label": "Safety Pin (Intactly fit?)", "type": "checkbox", "width": 100},
          {"id": "pinSeal", "label": "Pin Seal (Intactly fit?)", "type": "checkbox", "width": 100},
          {"id": "accessible", "label": "Accessible (Not Obstructed)", "type": "checkbox", "width": 120},
          {"id": "missing", "label": "Missing/Not in Place", "type": "checkbox", "width": 120},
          {"id": "empty", "label": "Empty", "type": "checkbox", "width": 80},
          {"id": "leaking", "label": "Leaking", "type": "checkbox", "width": 80},
          {"id": "servicing", "label": "Servicing/Repair in Place", "type": "checkbox", "width": 120},
          {"id": "expiryDate", "label": "Expiry Date", "type": "date", "width": 120},
          {"id": "remarks", "label": "Remarks", "type": "text", "width": 200}
        ],
        "allowMultipleRows": true,
        "minRows": 1
      }
    ]
  }'::jsonb,
  true,
  1,
  'af85f349-4b90-42e9-984a-fa8758df88a5'  -- Replace with your admin user ID
);

-- =====================================================
-- FIRST AID ITEMS FORM TEMPLATE
-- =====================================================

INSERT INTO form_templates (
  name,
  inspection_type,
  description,
  fields,
  is_active,
  version,
  created_by
)
VALUES (
  'First Aid Items Checklist 2025',
  'first_aid',
  'Standard first aid kit inspection checklist based on Excel template',
  '{
    "sections": [
      {
        "id": "section1",
        "title": "Section 1: General Information",
        "fields": [
          {
            "id": "company",
            "label": "Company",
            "type": "text",
            "required": true
          },
          {
            "id": "inspectedBy",
            "label": "Inspected by",
            "type": "text",
            "required": true
          },
          {
            "id": "dateOfInspection",
            "label": "Date of Inspection",
            "type": "date",
            "required": true
          },
          {
            "id": "designation",
            "label": "Designation",
            "type": "text",
            "required": false
          },
          {
            "id": "signature",
            "label": "Signature",
            "type": "signature",
            "required": true
          }
        ]
      },
      {
        "id": "section2",
        "title": "Section 2: Inspection Details",
        "type": "table",
        "legend": {
          "tick": "OK / Available",
          "cross": "Not available",
          "na": "Not Applicable"
        },
        "columns": [
          {"id": "no", "label": "No", "type": "number", "width": 50},
          {"id": "model", "label": "Model", "type": "text", "width": 120},
          {"id": "location", "label": "Location", "type": "text", "width": 120},
          {"id": "modelNo", "label": "Model No", "type": "text", "width": 100},
          {"id": "cottonWool", "label": "Cotton Wool", "type": "checkbox", "width": 90},
          {"id": "cottonSwabs", "label": "Cotton Swabs", "type": "checkbox", "width": 90},
          {"id": "contentBuds", "label": "Content Buds", "type": "checkbox", "width": 90},
          {"id": "analgesicCream", "label": "Analgesic Cream (Painkill)", "type": "checkbox", "width": 110},
          {"id": "analgesicCreamBottle", "label": "Analgesic Cream (Bottle)", "type": "checkbox", "width": 110},
          {"id": "normalSaline", "label": "Normal Saline 5 Tge (5 miz)", "type": "checkbox", "width": 120},
          {"id": "gauzeSwabs", "label": "Gauze Swabs (Usap Kain)", "type": "checkbox", "width": 120},
          {"id": "woundBandage", "label": "Wound Bandage (2.2cmV/2.2cm V)", "type": "checkbox", "width": 140},
          {"id": "antisepticDisinfectant", "label": "Antiseptic Disinfectant (Antiseptik)", "type": "checkbox", "width": 140},
          {"id": "dressingSterile", "label": "Dressing Sterile (Cpt Inti Vir)", "type": "checkbox", "width": 130},
          {"id": "alcoholSwab", "label": "Alcohol Swab", "type": "checkbox", "width": 100},
          {"id": "liniment", "label": "Liniment (Minyalurut)", "type": "checkbox", "width": 110},
          {"id": "uricSalve", "label": "Uric Salve", "type": "checkbox", "width": 90},
          {"id": "clothPin", "label": "Cloth Pin", "type": "checkbox", "width": 80},
          {"id": "scissors", "label": "Scissors", "type": "checkbox", "width": 80},
          {"id": "adhesivePlaster", "label": "Adhesive Plaster (S nonsilable)", "type": "checkbox", "width": 130},
          {"id": "adhesiveBandage", "label": "Adhesive Bandage", "type": "checkbox", "width": 120},
          {"id": "rollBandage", "label": "Roll Bandage", "type": "checkbox", "width": 100},
          {"id": "remarks", "label": "Remarks", "type": "text", "width": 200}
        ],
        "allowMultipleRows": true,
        "minRows": 1
      }
    ]
  }'::jsonb,
  true,
  1,
  'af85f349-4b90-42e9-984a-fa8758df88a5'  -- Replace with your admin user ID
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if templates were created successfully
SELECT
  id,
  name,
  inspection_type,
  description,
  is_active,
  created_at
FROM form_templates
ORDER BY created_at DESC;

-- Count fields in each template
SELECT
  name,
  jsonb_array_length(fields->'sections') as section_count
FROM form_templates;

COMMENT ON TABLE form_templates IS 'Dynamic form templates for different inspection types';
