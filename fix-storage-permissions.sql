-- ================================================
-- FIX STORAGE PERMISSIONS FOR TEMPLATES BUCKET
-- ================================================
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Ensure the bucket exists and is configured correctly
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  false,  -- Not public (requires authentication)
  5242880,  -- 5MB limit
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can read templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update templates" ON storage.objects;

-- Step 3: Create policies for reading templates
CREATE POLICY "Authenticated users can read templates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'templates'
  AND auth.role() = 'authenticated'
);

-- Step 4: Create policies for uploading templates
CREATE POLICY "Admins can upload templates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'templates'
  AND auth.role() = 'authenticated'
);

-- Step 5: Create policies for updating templates
CREATE POLICY "Admins can update templates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'templates'
  AND auth.role() = 'authenticated'
);

-- Step 6: Grant storage schema access
GRANT USAGE ON SCHEMA storage TO authenticated, anon;

-- ================================================
-- VERIFICATION
-- ================================================
-- Run these queries after to verify:

-- Check bucket exists:
SELECT * FROM storage.buckets WHERE id = 'templates';

-- Check policies:
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%templates%';

-- List files in bucket (you should see your file):
SELECT * FROM storage.objects WHERE bucket_id = 'templates';
