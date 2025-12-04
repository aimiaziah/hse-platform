-- Fix Storage Policies for Templates Bucket
-- This allows public read access to templates while keeping write operations restricted

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for templates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads from templates" ON storage.objects;

-- Create policy to allow anyone to view/list templates
CREATE POLICY "Public read access for templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'templates');

-- Create policy to allow anyone to download templates
CREATE POLICY "Allow public downloads from templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'templates');

-- Ensure the bucket is marked as public
UPDATE storage.buckets
SET public = true
WHERE name = 'templates';

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%templates%';
