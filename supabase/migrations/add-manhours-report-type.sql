-- Add manhours_report to inspection_type enum
-- This allows storing manhours reports in the inspections table

-- Add the new type to the enum
ALTER TYPE inspection_type ADD VALUE IF NOT EXISTS 'manhours_report';

-- Create an index for faster queries on manhours reports
CREATE INDEX IF NOT EXISTS idx_inspections_type_manhours
ON inspections(inspection_type)
WHERE inspection_type = 'manhours_report';

-- Create an index for faster queries by report month/year
CREATE INDEX IF NOT EXISTS idx_inspections_manhours_month_year
ON inspections((form_data->>'reportMonth'), (form_data->>'reportYear'))
WHERE inspection_type = 'manhours_report';

-- Comment to document the table
COMMENT ON COLUMN inspections.inspection_type IS
'Type of inspection: fire_extinguisher, first_aid, hse_general, or manhours_report';
