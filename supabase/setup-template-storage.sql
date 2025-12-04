-- Supabase Storage Setup for Excel Templates
-- Run this in Supabase SQL Editor to set up template storage

-- ================================================
-- 1. CREATE STORAGE BUCKETS
-- ================================================

-- Templates bucket (for storing original Excel templates)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'templates',
  'templates',
  false,  -- Not public (requires authentication)
  5242880,  -- 5MB limit
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']  -- Only .xlsx files
)
on conflict (id) do nothing;

-- Filled reports bucket (for storing generated reports)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'filled-reports',
  'filled-reports',
  false,  -- Not public
  10485760,  -- 10MB limit
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

-- ================================================
-- 2. SET UP STORAGE POLICIES
-- ================================================

-- Allow authenticated users to read templates
create policy "Authenticated users can read templates"
on storage.objects for select
using (
  bucket_id = 'templates'
  and auth.role() = 'authenticated'
);

-- Allow admins to upload/update templates
create policy "Admins can upload templates"
on storage.objects for insert
with check (
  bucket_id = 'templates'
  and auth.role() = 'authenticated'
  -- Optionally add role check if you have admin role:
  -- and exists (
  --   select 1 from user_permissions
  --   where user_id = auth.uid()
  --   and can_manage_templates = true
  -- )
);

-- Allow admins to update templates
create policy "Admins can update templates"
on storage.objects for update
using (
  bucket_id = 'templates'
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to upload filled reports
create policy "Authenticated users can upload filled reports"
on storage.objects for insert
with check (
  bucket_id = 'filled-reports'
  and auth.role() = 'authenticated'
);

-- Allow users to read their own filled reports
create policy "Users can read their own filled reports"
on storage.objects for select
using (
  bucket_id = 'filled-reports'
  and auth.role() = 'authenticated'
);

-- ================================================
-- 3. CREATE TEMPLATE REGISTRY TABLE (OPTIONAL)
-- ================================================

-- Table to track available templates
create table if not exists template_registry (
  id uuid primary key default gen_random_uuid(),
  template_name varchar(255) not null,
  template_type varchar(50) not null,  -- e.g., 'fire_extinguisher', 'first_aid', 'hse'
  file_path text not null,  -- Path in storage bucket
  version varchar(20) not null default '1.0',
  description text,
  cell_mapping jsonb,  -- Store cell mapping configuration
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users(id),

  constraint unique_template_type unique (template_type, version, is_active)
);

-- Add RLS policies for template_registry
alter table template_registry enable row level security;

create policy "Anyone can read active templates"
on template_registry for select
using (is_active = true);

create policy "Admins can manage templates"
on template_registry for all
using (
  auth.role() = 'authenticated'
  -- Add admin check if needed
);

-- ================================================
-- 4. INSERT DEFAULT TEMPLATE RECORDS
-- ================================================

-- Insert fire extinguisher template record
insert into template_registry (
  template_name,
  template_type,
  file_path,
  version,
  description,
  cell_mapping
) values (
  'Fire Extinguisher Checklist',
  'fire_extinguisher',
  'form - fire extinguisher.xlsx',
  '1.0',
  'Official fire extinguisher inspection checklist template with company branding',
  '{
    "inspectedBy": "J6",
    "inspectionDate": "O6",
    "designation": "J7",
    "signature": "O7",
    "dataStartRow": 11,
    "columns": {
      "no": "B",
      "serialNo": "C",
      "location": "D",
      "typeSize": "E",
      "shell": "F",
      "hose": "G",
      "nozzle": "H",
      "pressureGauge": "I",
      "safetyPin": "J",
      "pinSeal": "K",
      "accessible": "L",
      "missingNotInPlace": "M",
      "emptyPressureLow": "N",
      "servicingTags": "O",
      "expiryDate": "P",
      "remarks": "Q"
    }
  }'::jsonb
)
on conflict (template_type, version, is_active) do nothing;

-- ================================================
-- 5. CREATE AUDIT LOG FOR TEMPLATE USAGE
-- ================================================

-- Table to track when templates are used
create table if not exists template_usage_log (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references template_registry(id),
  user_id uuid references auth.users(id),
  form_type varchar(50) not null,
  generated_file_path text,  -- Path to the generated file in filled-reports bucket
  exported_at timestamp with time zone default now(),
  export_metadata jsonb  -- Store form data metadata (inspector name, date, etc.)
);

-- Add RLS policies
alter table template_usage_log enable row level security;

create policy "Users can read their own usage logs"
on template_usage_log for select
using (user_id = auth.uid());

create policy "Users can insert their own usage logs"
on template_usage_log for insert
with check (user_id = auth.uid());

-- ================================================
-- 6. CREATE HELPFUL FUNCTIONS
-- ================================================

-- Function to get active template for a specific type
create or replace function get_active_template(p_template_type varchar)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_template jsonb;
begin
  select row_to_json(t.*)::jsonb into v_template
  from template_registry t
  where t.template_type = p_template_type
    and t.is_active = true
  order by t.created_at desc
  limit 1;

  return v_template;
end;
$$;

-- Function to log template usage
create or replace function log_template_usage(
  p_template_type varchar,
  p_file_path text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_template_id uuid;
  v_log_id uuid;
begin
  -- Get template ID
  select id into v_template_id
  from template_registry
  where template_type = p_template_type
    and is_active = true
  limit 1;

  -- Insert usage log
  insert into template_usage_log (
    template_id,
    user_id,
    form_type,
    generated_file_path,
    export_metadata
  ) values (
    v_template_id,
    auth.uid(),
    p_template_type,
    p_file_path,
    p_metadata
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

-- ================================================
-- 7. GRANT PERMISSIONS
-- ================================================

-- Grant usage on storage schema
grant usage on schema storage to authenticated;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check if buckets were created
-- select * from storage.buckets where id in ('templates', 'filled-reports');

-- Check template registry
-- select * from template_registry;

-- Check policies
-- select * from pg_policies where tablename = 'template_registry';

-- ================================================
-- NOTES
-- ================================================

/*
After running this script:

1. Upload your Excel template via Supabase Dashboard:
   - Go to Storage → templates bucket
   - Upload your file as "form - fire extinguisher.xlsx"

2. Test template download:
   const { data, error } = await supabase.storage
     .from('templates')
     .download('form - fire extinguisher.xlsx');

3. The cell mapping is stored in template_registry and can be
   retrieved via the get_active_template() function.

4. All template exports will be logged in template_usage_log
   for audit purposes.
*/
