// Unified Excel Exporter for Inspections
// This utility provides a single interface for generating Excel files for all inspection types

import { InspectionType } from '@/types/database';
import { exportFireExtinguisherWithTemplate } from '@/utils/templateExport';
import { generateFirstAidExcel } from '@/utils/firstAidExcelExport';
import { generateHSEInspectionChecklistExcel } from '@/utils/hseChecklistExport';
import { generateManhoursExcel } from '@/utils/manhoursExcelExport';

/**
 * Metadata to be included with the inspection export
 */
export interface InspectionExportMetadata {
  inspectionNumber: string;
  inspectorName: string;
  inspectionDate: string;
  status: string;
}

/**
 * Generate Excel file for any inspection type
 * Returns a Blob ready for download or upload to SharePoint
 *
 * @param inspectionType - Type of inspection (fire_extinguisher, first_aid, hse_general, manhours_report)
 * @param formData - The form data for the inspection
 * @param metadata - Additional metadata (inspection number, inspector name, etc.)
 * @returns Promise<Blob> - Excel file as Blob
 */
export async function generateInspectionExcel(
  inspectionType: InspectionType,
  formData: any,
  metadata: InspectionExportMetadata,
): Promise<Blob> {
  try {
    switch (inspectionType) {
      case 'fire_extinguisher':
        return await generateFireExtinguisherExcel(formData, metadata);

      case 'first_aid':
        return await generateFirstAidExcelBlob(formData, metadata);

      case 'hse_general':
        return await generateHSEInspectionExcelBlob(formData, metadata);

      case 'manhours_report':
        return await generateManhoursExcelBlob(formData, metadata);

      default:
        throw new Error(`Unknown inspection type: ${inspectionType}`);
    }
  } catch (error) {
    console.error(`Failed to generate Excel for ${inspectionType}:`, error);
    throw new Error(
      `Excel generation failed for ${inspectionType}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

/**
 * Generate Fire Extinguisher Excel
 * Already returns Blob from the template export function
 */
async function generateFireExtinguisherExcel(
  formData: any,
  metadata: InspectionExportMetadata,
): Promise<Blob> {
  return await exportFireExtinguisherWithTemplate(formData);
}

/**
 * Generate First Aid Excel and convert to Blob
 */
async function generateFirstAidExcelBlob(
  formData: any,
  metadata: InspectionExportMetadata,
): Promise<Blob> {
  const workbook = await generateFirstAidExcel(formData);
  return await workbookToBlob(workbook);
}

/**
 * Generate HSE Inspection Excel and convert to Blob
 */
async function generateHSEInspectionExcelBlob(
  formData: any,
  metadata: InspectionExportMetadata,
): Promise<Blob> {
  const workbook = await generateHSEInspectionChecklistExcel(formData);
  return await workbookToBlob(workbook);
}

/**
 * Generate Manhours Report Excel and convert to Blob
 */
async function generateManhoursExcelBlob(
  formData: any,
  metadata: InspectionExportMetadata,
): Promise<Blob> {
  const workbook = await generateManhoursExcel(formData);
  return await workbookToBlob(workbook);
}

/**
 * Convert ExcelJS Workbook to Blob
 * @param workbook - ExcelJS Workbook instance
 * @returns Promise<Blob> - Excel file as Blob
 */
async function workbookToBlob(workbook: any): Promise<Blob> {
  // Generate buffer from workbook
  const buffer = await workbook.xlsx.writeBuffer();

  // Convert buffer to Blob
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Get the appropriate file name for an inspection Excel export
 * Format: {InspectionType}_{Month}_{Year}_{InspectionNumber}.xlsx
 *
 * @param inspectionType - Type of inspection
 * @param metadata - Inspection metadata
 * @returns Formatted file name
 */
export function getInspectionExcelFileName(
  inspectionType: InspectionType,
  metadata: InspectionExportMetadata,
): string {
  const date = new Date(metadata.inspectionDate);
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
  const monthYear = `${monthNames[date.getMonth()]}_${date.getFullYear()}`;

  // Format inspection type: fire_extinguisher -> Fire_Extinguisher
  const typePrefix = inspectionType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('_');

  return `${typePrefix}_${monthYear}_${metadata.inspectionNumber}`;
}
