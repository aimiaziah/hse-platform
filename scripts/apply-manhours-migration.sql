-- ==============================================
-- MANHOURS REPORT - DATABASE MIGRATION
-- ==============================================
-- Run this script in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query -> Paste & Run

-- Step 1: Add manhours_report to inspection_type enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'manhours_report'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inspection_type')
    ) THEN
        ALTER TYPE inspection_type ADD VALUE 'manhours_report';
        RAISE NOTICE 'Added manhours_report to inspection_type enum';
    ELSE
        RAISE NOTICE 'manhours_report already exists in inspection_type enum';
    END IF;
END$$;

-- Step 2: Create index for faster manhours queries
CREATE INDEX IF NOT EXISTS idx_inspections_type_manhours
ON inspections(inspection_type)
WHERE inspection_type = 'manhours_report';

-- Step 3: Create index for filtering by month/year
CREATE INDEX IF NOT EXISTS idx_inspections_manhours_month_year
ON inspections((form_data->>'reportMonth'), (form_data->>'reportYear'))
WHERE inspection_type = 'manhours_report';

-- Step 4: Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_inspections_manhours_status
ON inspections(status, inspection_type)
WHERE inspection_type = 'manhours_report';

-- Verify the migration
SELECT
    'inspection_type' as enum_name,
    enumlabel as value
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'inspection_type')
ORDER BY enumsortorder;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Manhours report migration completed successfully!';
    RAISE NOTICE '   You can now save manhours reports to Supabase.';
END$$;
