-- ================================================
-- COMPLETE STORAGE FIX - Run this in Supabase SQL Editor
-- ================================================

-- Step 1: Make sure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  false,
  5242880,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- Step 2: Enable RLS on storage.buckets (if not already enabled)
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow public to view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated to view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Anyone can view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Authenticated users can read templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update templates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete templates" ON storage.objects;

-- Step 4: Allow ANYONE (including anon users) to see that buckets exist
-- This is needed for listBuckets() to work
CREATE POLICY "Anyone can view buckets"
ON storage.buckets FOR SELECT
TO public
USING ( true );

-- Step 5: Allow authenticated users to SELECT (read/download) from templates bucket
CREATE POLICY "Authenticated users can read templates"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'templates' );

-- Step 6: Allow authenticated users to INSERT (upload) to templates bucket
CREATE POLICY "Authenticated users can upload templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'templates' );

-- Step 7: Allow authenticated users to UPDATE templates
CREATE POLICY "Authenticated users can update templates"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'templates' );

-- Step 8: Allow authenticated users to DELETE templates
CREATE POLICY "Authenticated users can delete templates"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'templates' );

-- Step 9: Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- 1. Check if bucket exists
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'templates';

-- 2. Check bucket policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'buckets' AND schemaname = 'storage';

-- 3. Check object policies for templates
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname LIKE '%template%';

-- 4. List files in templates bucket
SELECT name, metadata->>'size' as size_bytes
FROM storage.objects
WHERE bucket_id = 'templates';
