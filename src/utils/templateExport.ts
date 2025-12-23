// Template-based Excel Export Utility
// Fetches Excel templates from local storage (with Supabase fallback) and fills them with form data
// while preserving original formatting, logos, and layout

import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { loadTemplate } from './templateLoader';

/**
 * Interface for fire extinguisher form data
 */
export interface FireExtinguisherFormData {
  inspectedBy: string;
  inspectionDate: string;
  designation: string;
  signature?: string;
  extinguishers: Array<{
    no: number;
    serialNo: string;
    location: string;
    typeSize: string;
    shell: '✓' | 'X' | 'NA' | null;
    hose: '✓' | 'X' | 'NA' | null;
    nozzle: '✓' | 'X' | 'NA' | null;
    pressureGauge: '✓' | 'X' | 'NA' | null;
    safetyPin: '✓' | 'X' | 'NA' | null;
    pinSeal: '✓' | 'X' | 'NA' | null;
    accessible: '✓' | 'X' | 'NA' | null;
    missingNotInPlace: '✓' | 'X' | 'NA' | null;
    emptyPressureLow: '✓' | 'X' | 'NA' | null;
    servicingTags: '✓' | 'X' | 'NA' | null;
    expiryDate: string;
    remarks: string;
  }>;
}

/**
 * Configuration for template cell mappings
 */
interface TemplateCellMapping {
  inspectedBy: string;
  inspectionDate: string;
  designation: string;
  signature?: string;
  dataStartRow: number;
  columns: {
    no: string;
    serialNo: string;
    location: string;
    typeSize: string;
    shell: string;
    hose: string;
    nozzle: string;
    pressureGauge: string;
    safetyPin: string;
    pinSeal: string;
    accessible: string;
    missingNotInPlace: string;
    emptyPressureLow: string;
    servicingTags: string;
    expiryDate: string;
    remarks: string;
  };
}

/**
 * Default cell mapping for fire extinguisher template
 * Adjust these based on your actual template structure
 */
const FIRE_EXTINGUISHER_MAPPING: TemplateCellMapping = {
  inspectedBy: 'J9',
  inspectionDate: 'O9',
  designation: 'J10',
  signature: 'O10',
  dataStartRow: 14, // Row where data entries start
  columns: {
    no: 'A',
    serialNo: 'B',
    location: 'C',
    typeSize: 'D',
    shell: 'E',
    hose: 'F',
    nozzle: 'G',
    pressureGauge: 'H',
    safetyPin: 'I',
    pinSeal: 'J',
    accessible: 'K',
    missingNotInPlace: 'L',
    emptyPressureLow: 'M',
    servicingTags: 'N',
    expiryDate: 'O',
    remarks: 'P',
  },
};

/**
 * Fetch Excel template from local storage (with Supabase fallback and caching)
 * This replaces direct Supabase downloads to reduce egress costs
 */
async function fetchTemplateFromStorage(
  bucketName: string,
  filePath: string,
): Promise<ArrayBuffer> {
  try {
    // Use the new template loader which:
    // 1. Checks browser cache first
    // 2. Tries local /public/templates folder
    // 3. Falls back to Supabase if needed
    // 4. Caches the result for future use
    return await loadTemplate(bucketName, filePath);
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
}

/**
 * Fill Excel template with fire extinguisher form data
 */
async function fillFireExtinguisherTemplate(
  workbook: ExcelJS.Workbook,
  formData: FireExtinguisherFormData,
  mapping: TemplateCellMapping = FIRE_EXTINGUISHER_MAPPING,
): Promise<void> {
  // Get the first worksheet (or specify sheet name if needed)
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('No worksheet found in template');
  }

  // Fill header information
  const inspectedByCell = worksheet.getCell(mapping.inspectedBy);
  inspectedByCell.value = `Inspected by :\n${formData.inspectedBy}`;

  const inspectionDateCell = worksheet.getCell(mapping.inspectionDate);
  const formattedDate = new Date(formData.inspectionDate).toLocaleDateString('en-GB');
  inspectionDateCell.value = `Date of Inspection :\n${formattedDate}`;

  const designationCell = worksheet.getCell(mapping.designation);
  designationCell.value = `Designation  :\n${formData.designation}`;

  // Fill extinguisher data rows
  formData.extinguishers.forEach((extinguisher, index) => {
    const rowNumber = mapping.dataStartRow + index;

    // Fill each column for this extinguisher
    worksheet.getCell(`${mapping.columns.no}${rowNumber}`).value = extinguisher.no;
    worksheet.getCell(`${mapping.columns.serialNo}${rowNumber}`).value = extinguisher.serialNo;
    worksheet.getCell(`${mapping.columns.location}${rowNumber}`).value = extinguisher.location;
    worksheet.getCell(`${mapping.columns.typeSize}${rowNumber}`).value = extinguisher.typeSize;
    worksheet.getCell(`${mapping.columns.shell}${rowNumber}`).value = extinguisher.shell || '';
    worksheet.getCell(`${mapping.columns.hose}${rowNumber}`).value = extinguisher.hose || '';
    worksheet.getCell(`${mapping.columns.nozzle}${rowNumber}`).value = extinguisher.nozzle || '';
    worksheet.getCell(`${mapping.columns.pressureGauge}${rowNumber}`).value =
      extinguisher.pressureGauge || '';
    worksheet.getCell(`${mapping.columns.safetyPin}${rowNumber}`).value =
      extinguisher.safetyPin || '';
    worksheet.getCell(`${mapping.columns.pinSeal}${rowNumber}`).value = extinguisher.pinSeal || '';
    worksheet.getCell(`${mapping.columns.accessible}${rowNumber}`).value =
      extinguisher.accessible || '';
    worksheet.getCell(`${mapping.columns.missingNotInPlace}${rowNumber}`).value =
      extinguisher.missingNotInPlace || '';
    worksheet.getCell(`${mapping.columns.emptyPressureLow}${rowNumber}`).value =
      extinguisher.emptyPressureLow || '';
    worksheet.getCell(`${mapping.columns.servicingTags}${rowNumber}`).value =
      extinguisher.servicingTags || '';
    worksheet.getCell(`${mapping.columns.expiryDate}${rowNumber}`).value = extinguisher.expiryDate;
    worksheet.getCell(`${mapping.columns.remarks}${rowNumber}`).value = extinguisher.remarks;
  });
}

/**
 * Main export function: Fetch template, fill with data, and download
 */
export async function exportFireExtinguisherWithTemplate(
  formData: FireExtinguisherFormData,
  templateBucket = 'templates',
  templatePath = 'fire extinguisher form.xlsx',
  customMapping?: TemplateCellMapping,
): Promise<Blob> {
  try {
    // Step 1: Fetch the template from Supabase Storage
    console.log('Fetching template from Supabase Storage...');
    const templateBuffer = await fetchTemplateFromStorage(templateBucket, templatePath);

    // Step 2: Load the template with ExcelJS
    console.log('Loading template with ExcelJS...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    // Step 3: Fill the template with form data
    console.log('Filling template with form data...');
    await fillFireExtinguisherTemplate(workbook, formData, customMapping);

    // Step 4: Generate the filled workbook as a buffer
    console.log('Generating filled Excel file...');
    const buffer = await workbook.xlsx.writeBuffer();

    // Step 5: Convert to Blob for download
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return blob;
  } catch (error) {
    console.error('Error exporting with template:', error);
    throw new Error(
      `Template export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Download the filled Excel file
 */
export async function downloadFireExtinguisherReport(
  formData: FireExtinguisherFormData,
  filename?: string,
): Promise<void> {
  try {
    const blob = await exportFireExtinguisherWithTemplate(formData);

    // Generate filename if not provided
    const date = new Date(formData.inspectionDate);
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const defaultFilename = `Fire_Extinguisher_Checklist_${
      monthNames[date.getMonth()]
    }_${date.getFullYear()}.xlsx`;

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || defaultFilename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('File downloaded successfully');
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
}

/**
 * Upload filled template back to Supabase Storage (optional)
 */
export async function uploadFilledTemplate(
  formData: FireExtinguisherFormData,
  uploadBucket = 'filled-reports',
  uploadPath?: string,
): Promise<string> {
  try {
    const blob = await exportFireExtinguisherWithTemplate(formData);

    // Generate upload path if not provided
    const date = new Date(formData.inspectionDate);
    const timestamp = date.toISOString().split('T')[0];
    const defaultPath = `fire-extinguisher/${timestamp}_${formData.inspectedBy.replace(
      /\s+/g,
      '_',
    )}.xlsx`;

    const finalPath = uploadPath || defaultPath;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(uploadBucket).upload(finalPath, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });

    if (error) {
      throw new Error(`Failed to upload filled template: ${error.message}`);
    }

    console.log('Filled template uploaded successfully:', data.path);
    return data.path;
  } catch (error) {
    console.error('Error uploading filled template:', error);
    throw error;
  }
}

/**
 * Get public URL for uploaded filled template
 */
export function getFilledTemplateUrl(bucketName: string, filePath: string): string {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return data.publicUrl;
}
