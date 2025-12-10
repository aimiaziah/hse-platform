// src/utils/firstAidExcelExport.ts
// First Aid Inspection Excel Export - Uses Template from local/Supabase storage

import ExcelJS from 'exceljs';
import { loadTemplate } from './templateLoader';

interface CapturedImage {
  dataUrl: string;
  timestamp: number;
}

interface FirstAidItem {
  id: string;
  name: string;
  expiryDateOption: 'NA' | 'date';
  expiryDate: string;
  quantity: string;
  status: '✓' | 'X' | 'NA' | null;
}

interface FirstAidKitInspection {
  id: string;
  no: number;
  model: string;
  location: string;
  modelNo: string;
  items: FirstAidItem[];
  remarks: string;
  capturedImages?: CapturedImage[];
}

interface FirstAidInspectionData {
  inspectedBy: string;
  designation: string;
  inspectionDate: string;
  signature?: string;
  kits: FirstAidKitInspection[];
}

/**
 * Fetch Excel template from local storage (with Supabase fallback and caching)
 */
async function fetchTemplateFromStorage(
  bucketName: string,
  filePath: string,
): Promise<ArrayBuffer> {
  try {
    return await loadTemplate(bucketName, filePath);
  } catch (error) {
    throw error;
  }
}

/**
 * Format expiry date (e.g., "02/29")
 */
function formatExpiryDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${year}`;
  } catch {
    return 'N/A';
  }
}

/**
 * Format date to DD/MM/YYYY
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Generate First Aid Inspection Excel file using template
 */
export async function generateFirstAidExcel(
  data: FirstAidInspectionData,
): Promise<ExcelJS.Workbook> {
  try {
    // Load the template file from storage
    const templateBuffer = await fetchTemplateFromStorage('templates', 'first-aid-template.xlsx');

    // Load the template with ExcelJS
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(templateBuffer);

    // Get the first worksheet
    const ws = wb.worksheets[0];

    if (!ws) {
      throw new Error('No worksheet found in template');
    }

    // ==========================================
    // HEADER SECTION - Fill inspector info
    // ==========================================

    // Row 9: Inspector info (columns P-X for Inspected by, Y-AH for Date)
    if (data.inspectedBy) {
      const inspectedByCell = ws.getCell('P9');
      inspectedByCell.value = `Inspected by :\n${data.inspectedBy}`;
    }

    if (data.inspectionDate) {
      const dateCell = ws.getCell('Y9');
      dateCell.value = `Date of Inspection :\n${formatDate(data.inspectionDate)}`;
    }

    // Row 11: Designation and Signature
    if (data.designation) {
      const designationCell = ws.getCell('P11');
      designationCell.value = `Designation  :\n${data.designation}`;
    }

    // ==========================================
    // DATA SECTION - Fill kit data
    // ==========================================

    // Data starts at row 16 (after headers in rows 14-15)
    let currentRow = 16;

    data.kits.forEach((kit, kitIndex) => {
      // Add empty separator row between kits (except before first kit)
      if (kitIndex > 0) {
        currentRow += 1;
      }

      // Status row
      ws.getCell(`A${currentRow}`).value = kit.no;
      ws.getCell(`B${currentRow}`).value = kit.model;
      ws.getCell(`C${currentRow}`).value = kit.location;
      ws.getCell(`D${currentRow}`).value = kit.modelNo;

      // Fill status for each item (columns E onwards)
      kit.items.forEach((item, itemIdx) => {
        const colIndex = 4 + itemIdx; // Column E = 4
        const col = String.fromCharCode(65 + colIndex); // A=65

        let statusValue = '';
        if (item.status === '✓') statusValue = '√';
        else if (item.status === 'X') statusValue = 'X';
        else if (item.status === 'NA') statusValue = 'N/A';

        ws.getCell(`${col}${currentRow}`).value = statusValue;
      });

      currentRow += 1;

      // Expiry Date row
      ws.getCell(`C${currentRow}`).value = 'Expiry Date';
      kit.items.forEach((item, itemIdx) => {
        if (item.expiryDateOption === 'date' && item.expiryDate) {
          const colIndex = 4 + itemIdx;
          const col = String.fromCharCode(65 + colIndex);
          ws.getCell(`${col}${currentRow}`).value = formatExpiryDate(item.expiryDate);
        }
      });

      currentRow += 1;

      // Quantity row
      ws.getCell(`C${currentRow}`).value = 'Quantity';
      kit.items.forEach((item, itemIdx) => {
        const colIndex = 4 + itemIdx;
        const col = String.fromCharCode(65 + colIndex);
        ws.getCell(`${col}${currentRow}`).value = item.quantity || '';
      });

      // Remarks at column AH (index 33)
      ws.getCell(`AH${currentRow}`).value = kit.remarks || '';

      currentRow += 1;
    });

    // ==========================================
    // KIT IMAGES SHEET (if images exist)
    // Similar to Fire Extinguisher's "AI Scan Images" sheet
    // ==========================================

    const kitsWithImages = data.kits.filter(
      (kit) => kit.capturedImages && kit.capturedImages.length > 0,
    );

    if (kitsWithImages.length > 0) {
      // Create a new worksheet for kit images
      const imgWs = wb.addWorksheet('Kit Images');

      const date = new Date(data.inspectionDate);
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(
        date.getMonth() + 1,
      ).padStart(2, '0')}/${date.getFullYear()}`;

      // Row 1: Title
      imgWs.getCell('A1').value = 'KIT IMAGES - FIRST AID INSPECTION';
      imgWs.getCell('A1').font = { bold: true, size: 14 };
      imgWs.getCell('A1').alignment = { horizontal: 'center' };
      imgWs.mergeCells('A1:F1');

      // Row 2: Blank

      // Row 3: Metadata
      imgWs.getCell('A3').value = 'Inspection Date:';
      imgWs.getCell('B3').value = formattedDate;
      imgWs.getCell('D3').value = 'Inspector:';
      imgWs.getCell('E3').value = data.inspectedBy;

      // Row 4: Blank

      // Row 5: Note
      imgWs.getCell('A5').value =
        'Note: This sheet contains image metadata with timestamps. Images are embedded as base64 data URLs.';
      imgWs.mergeCells('A5:F5');

      // Row 6: Blank

      // Row 7: Headers
      imgWs.getCell('A7').value = 'Kit #';
      imgWs.getCell('B7').value = 'Model';
      imgWs.getCell('C7').value = 'Location';
      imgWs.getCell('D7').value = 'Model No.';
      imgWs.getCell('E7').value = 'Capture Time';
      imgWs.getCell('F7').value = 'Image Data (Base64)';

      // Style headers
      ['A7', 'B7', 'C7', 'D7', 'E7', 'F7'].forEach((cell) => {
        imgWs.getCell(cell).font = { bold: true };
        imgWs.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' },
        };
      });

      // Set column widths
      imgWs.getColumn('A').width = 10; // Kit #
      imgWs.getColumn('B').width = 20; // Model
      imgWs.getColumn('C').width = 15; // Location
      imgWs.getColumn('D').width = 15; // Model No.
      imgWs.getColumn('E').width = 22; // Capture Time
      imgWs.getColumn('F').width = 50; // Image Data

      // Add image data starting from row 8
      let imageRow = 8;
      kitsWithImages.forEach((kit) => {
        if (kit.capturedImages) {
          kit.capturedImages.forEach((image) => {
            imgWs.getCell(`A${imageRow}`).value = kit.no;
            imgWs.getCell(`B${imageRow}`).value = kit.model;
            imgWs.getCell(`C${imageRow}`).value = kit.location;
            imgWs.getCell(`D${imageRow}`).value = kit.modelNo;
            imgWs.getCell(`E${imageRow}`).value = new Date(image.timestamp).toLocaleString();
            imgWs.getCell(`F${imageRow}`).value = image.dataUrl; // Full base64 data URL
            imageRow += 1;
          });
        }
      });

      // Add summary section
      imageRow += 1;
      imgWs.getCell(`A${imageRow}`).value = 'Total Images:';
      imgWs.getCell(`B${imageRow}`).value = kitsWithImages.reduce(
        (sum, kit) => sum + (kit.capturedImages?.length || 0),
        0,
      );
      imgWs.getCell(`A${imageRow}`).font = { bold: true };

      imageRow += 1;
      imgWs.getCell(`A${imageRow}`).value = 'Kits Photographed:';
      imgWs.getCell(`B${imageRow}`).value = kitsWithImages.length;
      imgWs.getCell(`A${imageRow}`).font = { bold: true };
    }

    return wb;
  } catch (error) {
    throw new Error(
      'Could not load First Aid template. Please ensure "first-aid-template.xlsx" exists in the templates storage.',
    );
  }
}

/**
 * Download the Excel file
 */
export async function downloadFirstAidExcel(data: FirstAidInspectionData, filename?: string) {
  try {
    const wb = await generateFirstAidExcel(data);
    const date = new Date(data.inspectionDate);
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
    const defaultFilename = `First_Aid_Checklist_${
      monthNames[date.getMonth()]
    }_${date.getFullYear()}.xlsx`;

    // Generate buffer and download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

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

    // First Aid checklist downloaded successfully
  } catch (error) {
    // Error generating First Aid Excel
    throw error;
  }
}
