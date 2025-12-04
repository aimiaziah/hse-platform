// scripts/create-sample-data.ts
// Generate sample Excel file for testing the import

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function createSampleFireExtinguisherData() {
  const sampleData = [
    {
      'Serial No': 'FE-001',
      'Location': 'Main Entrance - Level 1',
      'Type/Size': 'ABC 9kg',
      'Inspection Date': '2024-06-15',
      'Shell': '✓',
      'Hose': '✓',
      'Nozzle': '✓',
      'Pressure Gauge': '✓',
      'Safety Pin': '✓',
      'Pin Seal': '✓',
      'Accessible': '✓',
      'Missing': 'NA',
      'Empty/Pressure Low': 'NA',
      'Servicing Tags': '✓',
      'Expiry Date': '2025-12-31',
      'Remarks': 'Good condition',
      'Inspected By': 'John Doe',
      'Designation': 'Safety Officer',
    },
    {
      'Serial No': 'FE-002',
      'Location': 'Kitchen Area - Level 2',
      'Type/Size': 'CO2 5kg',
      'Inspection Date': '2024-06-15',
      'Shell': '✓',
      'Hose': 'X',
      'Nozzle': '✓',
      'Pressure Gauge': '✓',
      'Safety Pin': '✓',
      'Pin Seal': '✓',
      'Accessible': '✓',
      'Missing': 'NA',
      'Empty/Pressure Low': 'NA',
      'Servicing Tags': '✓',
      'Expiry Date': '2025-06-30',
      'Remarks': 'Hose needs replacement',
      'Inspected By': 'John Doe',
      'Designation': 'Safety Officer',
    },
    {
      'Serial No': 'FE-003',
      'Location': 'Server Room - Level 3',
      'Type/Size': 'CO2 5kg',
      'Inspection Date': '2024-07-20',
      'Shell': '✓',
      'Hose': '✓',
      'Nozzle': '✓',
      'Pressure Gauge': '✓',
      'Safety Pin': '✓',
      'Pin Seal': '✓',
      'Accessible': '✓',
      'Missing': 'NA',
      'Empty/Pressure Low': 'NA',
      'Servicing Tags': '✓',
      'Expiry Date': '2026-01-15',
      'Remarks': '',
      'Inspected By': 'Jane Smith',
      'Designation': 'HSE Supervisor',
    },
    {
      'Serial No': 'FE-004',
      'Location': 'Warehouse - Ground Floor',
      'Type/Size': 'ABC 12kg',
      'Inspection Date': '2024-08-05',
      'Shell': '✓',
      'Hose': '✓',
      'Nozzle': '✓',
      'Pressure Gauge': 'X',
      'Safety Pin': '✓',
      'Pin Seal': '✓',
      'Accessible': 'X',
      'Missing': 'NA',
      'Empty/Pressure Low': 'X',
      'Servicing Tags': '✓',
      'Expiry Date': '2025-03-31',
      'Remarks': 'Pressure low, obstructed by boxes',
      'Inspected By': 'Alex Wong',
      'Designation': 'Safety Officer',
    },
    {
      'Serial No': 'FE-005',
      'Location': 'Production Area A',
      'Type/Size': 'ABC 9kg',
      'Inspection Date': '2024-09-12',
      'Shell': '✓',
      'Hose': '✓',
      'Nozzle': '✓',
      'Pressure Gauge': '✓',
      'Safety Pin': '✓',
      'Pin Seal': '✓',
      'Accessible': '✓',
      'Missing': 'NA',
      'Empty/Pressure Low': 'NA',
      'Servicing Tags': '✓',
      'Expiry Date': '2025-09-30',
      'Remarks': 'Excellent condition',
      'Inspected By': 'Sarah Lee',
      'Designation': 'HSE Manager',
    },
  ];

  return sampleData;
}

function createSampleFirstAidData() {
  const sampleData = [
    {
      'Model': 'Wall-Mounted Kit',
      'Location': 'Office Floor 2',
      'Model No': 'FAK-001',
      'Inspection Date': '2024-06-15',
      'Remarks': 'All items present and in date',
      'Inspected By': 'Jane Smith',
      'Designation': 'HSE Supervisor',
    },
    {
      'Model': 'Portable First Aid Kit',
      'Location': 'Production Area A',
      'Model No': 'FAK-002',
      'Inspection Date': '2024-07-20',
      'Remarks': 'Need to restock bandages',
      'Inspected By': 'Alex Wong',
      'Designation': 'Safety Officer',
    },
    {
      'Model': 'Emergency Kit',
      'Location': 'Warehouse',
      'Model No': 'FAK-003',
      'Inspection Date': '2024-08-10',
      'Remarks': 'Good condition',
      'Inspected By': 'John Doe',
      'Designation': 'Safety Officer',
    },
  ];

  return sampleData;
}

function createSampleHSEData() {
  const sampleData = [
    {
      'Location': 'Production Area A',
      'Inspection Date': '2024-06-15',
      'Observations': 'Housekeeping maintained, PPE usage compliant',
      'Hazards': 'None identified',
      'Recommendations': 'Continue monitoring',
      'Remarks': 'Good safety culture observed',
      'Inspected By': 'Sarah Lee',
      'Designation': 'HSE Manager',
    },
    {
      'Location': 'Warehouse',
      'Inspection Date': '2024-07-20',
      'Observations': 'Some clutter near emergency exits',
      'Hazards': 'Exit obstruction',
      'Recommendations': 'Clear emergency exits immediately',
      'Remarks': 'Corrective action required',
      'Inspected By': 'Alex Wong',
      'Designation': 'Safety Officer',
    },
    {
      'Location': 'Office Floor 2',
      'Inspection Date': '2024-08-05',
      'Observations': 'Cable management good, no trip hazards',
      'Hazards': 'None',
      'Recommendations': 'Maintain current standards',
      'Remarks': '',
      'Inspected By': 'Jane Smith',
      'Designation': 'HSE Supervisor',
    },
  ];

  return sampleData;
}

// Create sample files
console.log('📝 Creating sample data files...\n');

const dataDir = path.join(process.cwd(), 'sample-data');

// Create directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Fire Extinguisher Sample
const fireExtWorkbook = XLSX.utils.book_new();
const fireExtSheet = XLSX.utils.json_to_sheet(createSampleFireExtinguisherData());
XLSX.utils.book_append_sheet(fireExtWorkbook, fireExtSheet, 'Fire Extinguisher Data');
XLSX.writeFile(fireExtWorkbook, path.join(dataDir, 'sample-fire-extinguisher.xlsx'));
console.log('✓ Created: sample-data/sample-fire-extinguisher.xlsx');

// First Aid Sample
const firstAidWorkbook = XLSX.utils.book_new();
const firstAidSheet = XLSX.utils.json_to_sheet(createSampleFirstAidData());
XLSX.utils.book_append_sheet(firstAidWorkbook, firstAidSheet, 'First Aid Data');
XLSX.writeFile(firstAidWorkbook, path.join(dataDir, 'sample-first-aid.xlsx'));
console.log('✓ Created: sample-data/sample-first-aid.xlsx');

// HSE General Sample
const hseWorkbook = XLSX.utils.book_new();
const hseSheet = XLSX.utils.json_to_sheet(createSampleHSEData());
XLSX.utils.book_append_sheet(hseWorkbook, hseSheet, 'HSE Inspection Data');
XLSX.writeFile(hseWorkbook, path.join(dataDir, 'sample-hse-general.xlsx'));
console.log('✓ Created: sample-data/sample-hse-general.xlsx');

console.log('\n✅ Sample data files created successfully!');
console.log('\nNext steps:');
console.log('  1. Test with dry run:');
console.log('     npm run import-data -- sample-data/sample-fire-extinguisher.xlsx fire_extinguisher --dry-run');
console.log('');
console.log('  2. Import the sample data:');
console.log('     npm run import-data -- sample-data/sample-fire-extinguisher.xlsx fire_extinguisher');
console.log('');
