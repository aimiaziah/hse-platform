// Test script to debug HSE Inspection submission
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ooriqpeqtfmgfynlbsxb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcmlxcGVxdGZtZ2Z5bmxic3hiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg5NzU0NSwiZXhwIjoyMDc2NDczNTQ1fQ.tCbLZ_236VKS-DqClHzEJH_xAgco8A-iYXc1j5OWIg8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInspectionAPI() {
  console.log('=== Testing HSE Inspection API ===\n');

  // Test 1: Check if we can connect to Supabase
  console.log('Test 1: Checking Supabase connection...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, role')
    .limit(1);

  if (userError) {
    console.error('❌ Supabase connection error:', userError.message);
    return;
  }
  console.log('✅ Supabase connection successful');
  console.log('Sample user:', users[0]);
  console.log();

  // Test 2: Check if inspections table exists
  console.log('Test 2: Checking inspections table...');
  const { data: inspections, error: inspectionError } = await supabase
    .from('inspections')
    .select('id')
    .limit(1);

  if (inspectionError) {
    console.error('❌ Inspections table error:', inspectionError.message);
    console.error('Error details:', inspectionError);
    return;
  }
  console.log('✅ Inspections table accessible');
  console.log();

  // Test 3: Try to create a test inspection
  console.log('Test 3: Creating test inspection...');
  const testInspection = {
    inspection_type: 'hse_general',
    inspector_id: users[0].id,
    inspected_by: users[0].name,
    designation: users[0].role,
    location_id: null,
    asset_id: null,
    form_template_id: null,
    form_data: {
      contractor: 'Test Contractor',
      location: 'Test Location',
      date: '2025-01-01',
      inspectedBy: 'Test Inspector',
      workActivity: 'Test Activity',
      tablePersons: [],
      inspectionItems: [],
      commentsRemarks: 'Test remarks',
    },
    signature: null,
    status: 'pending_review',
    inspection_date: '2025-01-01',
    remarks: null,
  };

  const { data: newInspection, error: createError } = await supabase
    .from('inspections')
    .insert(testInspection)
    .select()
    .single();

  if (createError) {
    console.error('❌ Failed to create inspection:', createError.message);
    console.error('Error details:', createError);
    return;
  }

  console.log('✅ Test inspection created successfully!');
  console.log('Inspection ID:', newInspection.id);
  console.log('Inspection Number:', newInspection.inspection_number);
  console.log();

  // Test 4: Clean up - delete test inspection
  console.log('Test 4: Cleaning up test data...');
  const { error: deleteError } = await supabase
    .from('inspections')
    .delete()
    .eq('id', newInspection.id);

  if (deleteError) {
    console.error('⚠️ Failed to delete test inspection:', deleteError.message);
  } else {
    console.log('✅ Test inspection deleted successfully');
  }

  console.log('\n=== All tests completed ===');
}

testInspectionAPI().catch(console.error);
