// scripts/import-historical-data.ts
// Import Historical Inspection Data from Excel/CSV into Supabase
// Supports: Fire Extinguisher, First Aid, HSE General inspections

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/database';
import * as fs from 'fs';
import * as path from 'path';

// ========================================
// CONFIGURATION
// ========================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========================================
// TYPES & INTERFACES
// ========================================

type InspectionType = 'fire_extinguisher' | 'first_aid' | 'hse_general';
type InspectionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'completed';
type RatingType = '✓' | 'X' | 'NA';

interface ImportOptions {
  filePath: string;
  inspectionType: InspectionType;
  sheetName?: string;
  defaultInspectorEmail?: string;
  defaultStatus?: InspectionStatus;
  startDate?: string; // Filter: only import from this date onwards
  endDate?: string;   // Filter: only import up to this date
  batchSize?: number;
  dryRun?: boolean;   // If true, only validate without importing
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: { row: number; error: string }[];
  inspectionIds: string[];
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Parse Excel/CSV file
 */
function parseFile(filePath: string, sheetName?: string): any[] {
  const fileExt = path.extname(filePath).toLowerCase();

  if (!['.xlsx', '.xls', '.csv'].includes(fileExt)) {
    throw new Error(`Unsupported file format: ${fileExt}. Use .xlsx, .xls, or .csv`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = sheetName
    ? workbook.Sheets[sheetName]
    : workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    const available = workbook.SheetNames.join(', ');
    throw new Error(
      `Sheet "${sheetName}" not found. Available sheets: ${available}`
    );
  }

  // Convert to JSON with header row
  const data = XLSX.utils.sheet_to_json(sheet, {
    raw: false,
    defval: null
  });

  return data;
}

/**
 * Parse date from various formats
 */
function parseDate(dateValue: any): string | null {
  if (!dateValue) return null;

  try {
    // Handle Excel date numbers
    if (typeof dateValue === 'number') {
      const date = XLSX.SSF.parse_date_code(dateValue);
      return new Date(date.y, date.m - 1, date.d).toISOString();
    }

    // Handle string dates
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateValue}`);
  }

  return null;
}

/**
 * Normalize rating values
 */
function normalizeRating(value: any): RatingType | null {
  if (!value) return null;

  const str = String(value).trim().toUpperCase();

  if (['✓', '√', 'OK', 'YES', 'Y', 'PASS', 'GOOD'].includes(str)) return '✓';
  if (['X', '✗', 'NO', 'N', 'FAIL', 'BAD'].includes(str)) return 'X';
  if (['NA', 'N/A', 'NOT APPLICABLE', '-'].includes(str)) return 'NA';

  return null;
}

/**
 * Clean and normalize string
 */
function cleanString(value: any): string {
  if (!value) return '';
  return String(value).trim();
}

// ========================================
// USER MANAGEMENT
// ========================================

const userCache = new Map<string, string>(); // email -> id

/**
 * Get or create user by email
 */
async function getOrCreateUser(
  email: string,
  name?: string,
  role: 'inspector' | 'supervisor' | 'admin' = 'inspector'
): Promise<string | null> {
  // Check cache first
  if (userCache.has(email)) {
    return userCache.get(email)!;
  }

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      userCache.set(email, existingUser.id);
      return existingUser.id;
    }

    // Create new user with default PIN
    const defaultPin = '1234';
    const userName = name || email.split('@')[0];

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        name: userName,
        pin: defaultPin,
        role,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Failed to create user ${email}:`, error);
      return null;
    }

    userCache.set(email, newUser.id);
    console.log(`✓ Created user: ${email} (${userName})`);
    return newUser.id;
  } catch (error) {
    console.error(`Error managing user ${email}:`, error);
    return null;
  }
}

// ========================================
// LOCATION MANAGEMENT
// ========================================

const locationCache = new Map<string, string>(); // name -> id

/**
 * Get or create location by name
 */
async function getOrCreateLocation(locationName: string): Promise<string | null> {
  const normalized = cleanString(locationName).toUpperCase();

  if (!normalized) return null;
  if (locationCache.has(normalized)) {
    return locationCache.get(normalized)!;
  }

  try {
    // Check if location exists (case-insensitive)
    const { data: existingLocation } = await supabase
      .from('locations')
      .select('id')
      .ilike('name', normalized)
      .single();

    if (existingLocation) {
      locationCache.set(normalized, existingLocation.id);
      return existingLocation.id;
    }

    // Create new location
    const { data: newLocation, error } = await supabase
      .from('locations')
      .insert({
        name: normalized,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Failed to create location ${normalized}:`, error);
      return null;
    }

    locationCache.set(normalized, newLocation.id);
    console.log(`✓ Created location: ${normalized}`);
    return newLocation.id;
  } catch (error) {
    console.error(`Error managing location ${normalized}:`, error);
    return null;
  }
}

// ========================================
// ASSET MANAGEMENT
// ========================================

const assetCache = new Map<string, string>(); // serialNo -> id

/**
 * Get or create asset by serial number
 */
async function getOrCreateAsset(
  serialNo: string,
  assetType: string,
  locationId: string | null,
  typeSize?: string,
  expiryDate?: string | null
): Promise<string | null> {
  const normalized = cleanString(serialNo).toUpperCase();

  if (!normalized) return null;
  if (assetCache.has(normalized)) {
    return assetCache.get(normalized)!;
  }

  try {
    // Check if asset exists
    const { data: existingAsset } = await supabase
      .from('assets')
      .select('id')
      .eq('serial_number', normalized)
      .single();

    if (existingAsset) {
      assetCache.set(normalized, existingAsset.id);
      return existingAsset.id;
    }

    // Create new asset
    const { data: newAsset, error } = await supabase
      .from('assets')
      .insert({
        serial_number: normalized,
        asset_type: assetType,
        location_id: locationId,
        type_size: typeSize,
        expiry_date: expiryDate,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Failed to create asset ${normalized}:`, error);
      return null;
    }

    assetCache.set(normalized, newAsset.id);
    console.log(`✓ Created asset: ${normalized} (${assetType})`);
    return newAsset.id;
  } catch (error) {
    console.error(`Error managing asset ${normalized}:`, error);
    return null;
  }
}

// ========================================
// INSPECTION TYPE HANDLERS
// ========================================

/**
 * Import Fire Extinguisher Inspection
 */
async function importFireExtinguisher(
  row: any,
  inspectorId: string,
  defaultStatus: InspectionStatus
): Promise<{ success: boolean; inspectionId?: string; error?: string }> {
  try {
    // Extract data from row
    const serialNo = cleanString(row['Serial No'] || row['serial_no'] || row['SerialNo']);
    const location = cleanString(row['Location'] || row['location']);
    const typeSize = cleanString(row['Type/Size'] || row['Type'] || row['type_size']);
    const inspectionDate = parseDate(row['Inspection Date'] || row['inspection_date'] || row['Date']);
    const expiryDate = parseDate(row['Expiry Date'] || row['expiry_date']);
    const inspectedBy = cleanString(row['Inspected By'] || row['inspected_by'] || row['Inspector']);
    const designation = cleanString(row['Designation'] || row['designation']);

    // Validation
    if (!serialNo) {
      return { success: false, error: 'Missing Serial No' };
    }
    if (!location) {
      return { success: false, error: 'Missing Location' };
    }
    if (!inspectionDate) {
      return { success: false, error: 'Missing Inspection Date' };
    }

    // Get or create related entities
    const locationId = await getOrCreateLocation(location);
    const assetId = await getOrCreateAsset(serialNo, 'fire_extinguisher', locationId, typeSize, expiryDate);

    // Parse inspection items
    const formData = {
      shell: normalizeRating(row['Shell']),
      hose: normalizeRating(row['Hose']),
      nozzle: normalizeRating(row['Nozzle']),
      pressureGauge: normalizeRating(row['Pressure Gauge'] || row['pressure_gauge']),
      safetyPin: normalizeRating(row['Safety Pin'] || row['safety_pin']),
      pinSeal: normalizeRating(row['Pin Seal'] || row['pin_seal']),
      accessible: normalizeRating(row['Accessible']),
      missingNotInPlace: normalizeRating(row['Missing'] || row['missing_not_in_place']),
      emptyPressureLow: normalizeRating(row['Empty/Pressure Low'] || row['empty_pressure_low']),
      servicingTags: normalizeRating(row['Servicing Tags'] || row['servicing_tags']),
      expiryDate: expiryDate,
      remarks: cleanString(row['Remarks'] || row['remarks']),
    };

    // Insert inspection
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        inspection_type: 'fire_extinguisher',
        inspector_id: inspectorId,
        inspected_by: inspectedBy || 'Historical Import',
        designation: designation,
        asset_id: assetId,
        location_id: locationId,
        inspection_date: inspectionDate,
        status: defaultStatus,
        form_data: formData,
        submitted_at: defaultStatus !== 'draft' ? inspectionDate : null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, inspectionId: inspection.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Import First Aid Inspection
 */
async function importFirstAid(
  row: any,
  inspectorId: string,
  defaultStatus: InspectionStatus
): Promise<{ success: boolean; inspectionId?: string; error?: string }> {
  try {
    // Extract data from row
    const model = cleanString(row['Model'] || row['model'] || row['Kit Model']);
    const location = cleanString(row['Location'] || row['location']);
    const modelNo = cleanString(row['Model No'] || row['model_no'] || row['ModelNo']);
    const inspectionDate = parseDate(row['Inspection Date'] || row['inspection_date'] || row['Date']);
    const inspectedBy = cleanString(row['Inspected By'] || row['inspected_by'] || row['Inspector']);
    const designation = cleanString(row['Designation'] || row['designation']);

    // Validation
    if (!model && !modelNo) {
      return { success: false, error: 'Missing Model/Model No' };
    }
    if (!location) {
      return { success: false, error: 'Missing Location' };
    }
    if (!inspectionDate) {
      return { success: false, error: 'Missing Inspection Date' };
    }

    // Get or create related entities
    const locationId = await getOrCreateLocation(location);
    const assetId = modelNo
      ? await getOrCreateAsset(modelNo, 'first_aid_kit', locationId, model)
      : null;

    // Parse inspection data
    const formData = {
      model,
      modelNo,
      location,
      items: [], // You may need to customize this based on your Excel structure
      remarks: cleanString(row['Remarks'] || row['remarks']),
    };

    // Insert inspection
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        inspection_type: 'first_aid',
        inspector_id: inspectorId,
        inspected_by: inspectedBy || 'Historical Import',
        designation: designation,
        asset_id: assetId,
        location_id: locationId,
        inspection_date: inspectionDate,
        status: defaultStatus,
        form_data: formData,
        submitted_at: defaultStatus !== 'draft' ? inspectionDate : null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, inspectionId: inspection.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Import HSE General Inspection
 */
async function importHSEGeneral(
  row: any,
  inspectorId: string,
  defaultStatus: InspectionStatus
): Promise<{ success: boolean; inspectionId?: string; error?: string }> {
  try {
    // Extract data from row
    const location = cleanString(row['Location'] || row['location'] || row['Area']);
    const inspectionDate = parseDate(row['Inspection Date'] || row['inspection_date'] || row['Date']);
    const inspectedBy = cleanString(row['Inspected By'] || row['inspected_by'] || row['Inspector']);
    const designation = cleanString(row['Designation'] || row['designation']);

    // Validation
    if (!location) {
      return { success: false, error: 'Missing Location' };
    }
    if (!inspectionDate) {
      return { success: false, error: 'Missing Inspection Date' };
    }

    // Get or create related entities
    const locationId = await getOrCreateLocation(location);

    // Parse inspection data - customize based on your HSE checklist structure
    const formData = {
      location,
      observations: cleanString(row['Observations'] || row['observations']),
      hazards: cleanString(row['Hazards'] || row['hazards']),
      recommendations: cleanString(row['Recommendations'] || row['recommendations']),
      remarks: cleanString(row['Remarks'] || row['remarks']),
    };

    // Insert inspection
    const { data: inspection, error } = await supabase
      .from('inspections')
      .insert({
        inspection_type: 'hse_general',
        inspector_id: inspectorId,
        inspected_by: inspectedBy || 'Historical Import',
        designation: designation,
        location_id: locationId,
        inspection_date: inspectionDate,
        status: defaultStatus,
        form_data: formData,
        submitted_at: defaultStatus !== 'draft' ? inspectionDate : null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, inspectionId: inspection.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ========================================
// MAIN IMPORT FUNCTION
// ========================================

/**
 * Import historical inspection data
 */
export async function importHistoricalData(options: ImportOptions): Promise<ImportResult> {
  console.log('\n📊 Starting Historical Data Import...\n');
  console.log('Configuration:');
  console.log(`  File: ${options.filePath}`);
  console.log(`  Type: ${options.inspectionType}`);
  console.log(`  Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  const result: ImportResult = {
    success: false,
    totalRows: 0,
    importedRows: 0,
    skippedRows: 0,
    errors: [],
    inspectionIds: [],
  };

  try {
    // Parse file
    console.log('📂 Reading file...');
    const rows = parseFile(options.filePath, options.sheetName);
    result.totalRows = rows.length;
    console.log(`✓ Found ${rows.length} rows\n`);

    if (rows.length === 0) {
      throw new Error('No data found in file');
    }

    // Get or create default inspector
    const inspectorId = options.defaultInspectorEmail
      ? await getOrCreateUser(options.defaultInspectorEmail, 'Historical Inspector', 'inspector')
      : null;

    if (!inspectorId) {
      throw new Error('Failed to create/find default inspector');
    }

    const defaultStatus = options.defaultStatus || 'completed';
    const batchSize = options.batchSize || 50;

    // Filter by date range if specified
    const filteredRows = rows.filter((row, index) => {
      const inspectionDate = parseDate(
        row['Inspection Date'] || row['inspection_date'] || row['Date']
      );

      if (!inspectionDate) {
        result.errors.push({ row: index + 2, error: 'Missing inspection date' });
        return false;
      }

      if (options.startDate && inspectionDate < options.startDate) {
        return false;
      }

      if (options.endDate && inspectionDate > options.endDate) {
        return false;
      }

      return true;
    });

    console.log(`📅 Filtered to ${filteredRows.length} rows (within date range)\n`);

    // Process rows in batches
    console.log('⚙️  Processing rows...\n');

    for (let i = 0; i < filteredRows.length; i++) {
      const row = filteredRows[i];
      const rowNumber = rows.indexOf(row) + 2; // +2 for header row and 1-indexed

      try {
        if (options.dryRun) {
          // Dry run - just validate
          console.log(`[DRY RUN] Row ${rowNumber}: Would import ${options.inspectionType}`);
          result.importedRows++;
          continue;
        }

        // Import based on type
        let importResult;
        switch (options.inspectionType) {
          case 'fire_extinguisher':
            importResult = await importFireExtinguisher(row, inspectorId, defaultStatus);
            break;
          case 'first_aid':
            importResult = await importFirstAid(row, inspectorId, defaultStatus);
            break;
          case 'hse_general':
            importResult = await importHSEGeneral(row, inspectorId, defaultStatus);
            break;
          default:
            throw new Error(`Unsupported inspection type: ${options.inspectionType}`);
        }

        if (importResult.success) {
          result.importedRows++;
          if (importResult.inspectionId) {
            result.inspectionIds.push(importResult.inspectionId);
          }
          console.log(`✓ Row ${rowNumber}: Imported successfully`);
        } else {
          result.skippedRows++;
          result.errors.push({ row: rowNumber, error: importResult.error || 'Unknown error' });
          console.log(`✗ Row ${rowNumber}: ${importResult.error}`);
        }

        // Progress update every batch
        if ((i + 1) % batchSize === 0) {
          console.log(`\n📈 Progress: ${i + 1}/${filteredRows.length} rows processed\n`);
        }
      } catch (error: any) {
        result.skippedRows++;
        result.errors.push({ row: rowNumber, error: error.message });
        console.log(`✗ Row ${rowNumber}: ${error.message}`);
      }
    }

    result.success = result.importedRows > 0;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Rows:     ${result.totalRows}`);
    console.log(`Imported:       ${result.importedRows} ✓`);
    console.log(`Skipped:        ${result.skippedRows} ✗`);
    console.log(`Success Rate:   ${((result.importedRows / filteredRows.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');

    if (result.errors.length > 0 && result.errors.length <= 10) {
      console.log('❌ Errors:');
      result.errors.forEach((err) => {
        console.log(`   Row ${err.row}: ${err.error}`);
      });
      console.log('');
    } else if (result.errors.length > 10) {
      console.log(`❌ ${result.errors.length} errors occurred (showing first 10):`);
      result.errors.slice(0, 10).forEach((err) => {
        console.log(`   Row ${err.row}: ${err.error}`);
      });
      console.log('');
    }

    return result;
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    result.success = false;
    return result;
  }
}

// ========================================
// CLI EXECUTION
// ========================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🔧 Historical Data Import Tool

Usage:
  npm run import-data -- <file> <type> [options]

Arguments:
  <file>    Path to Excel/CSV file
  <type>    Inspection type: fire_extinguisher | first_aid | hse_general

Options:
  --sheet <name>           Sheet name (for Excel files)
  --inspector <email>      Default inspector email
  --status <status>        Default status (completed, approved, etc.)
  --start-date <date>      Import from this date (YYYY-MM-DD)
  --end-date <date>        Import up to this date (YYYY-MM-DD)
  --batch-size <number>    Batch size for processing (default: 50)
  --dry-run                Validate only, don't import

Examples:
  # Import fire extinguisher inspections
  npm run import-data -- ./data/fire-ext-2024.xlsx fire_extinguisher

  # Import with date range
  npm run import-data -- ./data/inspections.xlsx first_aid --start-date 2024-06-01 --end-date 2024-11-01

  # Dry run to test
  npm run import-data -- ./data/test.csv hse_general --dry-run
    `);
    process.exit(0);
  }

  // Parse CLI arguments
  const filePath = args[0];
  const inspectionType = args[1] as InspectionType;

  const options: ImportOptions = {
    filePath,
    inspectionType,
  };

  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--sheet':
        options.sheetName = args[++i];
        break;
      case '--inspector':
        options.defaultInspectorEmail = args[++i];
        break;
      case '--status':
        options.defaultStatus = args[++i] as InspectionStatus;
        break;
      case '--start-date':
        options.startDate = args[++i];
        break;
      case '--end-date':
        options.endDate = args[++i];
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  // Set default inspector if not provided
  if (!options.defaultInspectorEmail) {
    options.defaultInspectorEmail = 'historical-import@thetaedge.com';
  }

  // Run import
  importHistoricalData(options)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
