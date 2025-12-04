-- ================================================
-- SIMPLE STORAGE FIX - Only fixes what you can access
-- Run this in Supabase SQL Editor
-- ================================================

-- Step 1: Ensure the bucket exists (this should work)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  false,
  5242880,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing object policies to start fresh
DROP POLICY IF EXISTS "Authenticated users can read templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON storage.objects;

-- Step 3: Allow authenticated users to SELECT (read/download) from templates bucket
CREATE POLICY "Authenticated users can read templates"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'templates' );

-- Step 4: Allow authenticated users to INSERT (upload) to templates bucket
CREATE POLICY "Authenticated users can upload templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'templates' );

-- Step 5: Allow authenticated users to UPDATE templates
CREATE POLICY "Authenticated users can update templates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'templates' );

-- Step 6: Allow authenticated users to DELETE templates
CREATE POLICY "Authenticated users can delete templates"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'templates' );

-- ================================================
-- VERIFICATION QUERIES - Run these separately
-- ================================================

-- 1. Check if bucket exists
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'templates';

-- 2. Check object policies for templates
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname LIKE '%template%';

-- 3. List files in templates bucket
SELECT name, metadata->>'size' as size_bytes
FROM storage.objects
WHERE bucket_id = 'templates';
