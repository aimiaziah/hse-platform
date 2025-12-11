// HSE Observation Form Export - Uses Template from local/Supabase storage with Photos

import ExcelJS from 'exceljs';
import { loadTemplate } from './templateLoader';

/**
 * Interface for observation data
 */
export interface ObservationData {
  id: string;
  itemNo: string;
  categoryId: number;
  categoryName: string;
  itemName: string;
  photos: string[];
  observation: string;
  location: string;
  actionNeeded: string;
  time: string;
  date: string;
  status: string;
  hazards: string;
  remarks: string;
}

/**
 * Interface for HSE Observation export data
 */
export interface HSEObservationFormData {
  contractor: string;
  location: string;
  date: string;
  inspectedBy: string;
  workActivity: string;
  observations: ObservationData[];
  preparedBy?: string;
  preparedDate?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  reviewerSignature?: string;
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
    console.error('Error fetching template:', error);
    throw error;
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
 * Generate HSE Observation Excel using template
 */
export async function generateHSEObservationExcel(
  data: HSEObservationFormData,
): Promise<ExcelJS.Workbook> {
  try {
    // Load the template file from storage
    console.log('Fetching HSE Observation template from storage...');
    const templateBuffer = await fetchTemplateFromStorage('templates', 'observation-template.xlsx');

    // Load the template with ExcelJS
    console.log('Loading template with ExcelJS...');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(templateBuffer);

    // Get the first worksheet
    const ws = wb.worksheets[0];

    if (!ws) {
      throw new Error('No worksheet found in template');
    }

    // ==========================================
    // HEADER SECTION - Fill inspection info
    // ==========================================

    // Fill header information (adjust cell references based on actual template)
    if (data.location) {
      ws.getCell('B4').value = data.location;
    }
    if (data.date) {
      ws.getCell('K4').value = formatDate(data.date);
    }
    if (data.inspectedBy) {
      ws.getCell('B5').value = data.inspectedBy;
    }
    if (data.workActivity) {
      ws.getCell('K5').value = data.workActivity;
    }

    // ==========================================
    // OBSERVATIONS DATA SECTION
    // ==========================================

    // Observation data starts around row 10 (adjust based on template)
    let currentRow = 10;

    data.observations.forEach((obs, index) => {
      // Item number
      ws.getCell(`A${currentRow}`).value = obs.itemNo;

      // Category
      ws.getCell(`B${currentRow}`).value = obs.categoryName;

      // Item Name
      ws.getCell(`C${currentRow}`).value = obs.itemName;

      // Observation
      ws.getCell(`D${currentRow}`).value = obs.observation;

      // Location
      ws.getCell(`E${currentRow}`).value = obs.location;

      // Action Needed
      ws.getCell(`F${currentRow}`).value = obs.actionNeeded;

      // Time
      ws.getCell(`G${currentRow}`).value = obs.time;

      // Date
      ws.getCell(`H${currentRow}`).value = formatDate(obs.date);

      // Status
      ws.getCell(`I${currentRow}`).value = obs.status;

      // Hazards
      ws.getCell(`J${currentRow}`).value = obs.hazards;

      // Remarks
      ws.getCell(`K${currentRow}`).value = obs.remarks;

      // Photo count
      ws.getCell(`L${currentRow}`).value =
        obs.photos.length > 0 ? `${obs.photos.length} photos` : '';

      currentRow++;
    });

    // ==========================================
    // FOOTER SECTION
    // ==========================================

    currentRow += 2;

    if (data.preparedBy) {
      ws.getCell(`B${currentRow}`).value = 'Prepared By:';
      ws.getCell(`C${currentRow}`).value = data.preparedBy;
      ws.getCell(`D${currentRow}`).value = data.preparedDate ? formatDate(data.preparedDate) : '';
    }

    currentRow++;

    if (data.reviewedBy) {
      ws.getCell(`B${currentRow}`).value = 'Reviewed By:';
      ws.getCell(`B${currentRow}`).font = { bold: true, size: 11 };
      ws.getCell(`C${currentRow}`).value = data.reviewedBy;
      ws.getCell(`D${currentRow}`).value = data.reviewedDate ? formatDate(data.reviewedDate) : '';

      // Add signature if available
      if (data.reviewerSignature) {
        try {
          // Convert base64 signature to image
          const base64Data = data.reviewerSignature.replace(/^data:image\/\w+;base64,/, '');
          const imageId = wb.addImage({
            base64: base64Data,
            extension: 'png',
          });

          wb.worksheets[0].addImage(imageId, {
            tl: { col: 6, row: currentRow - 1 }, // Column G
            ext: { width: 150, height: 50 },
          });

          ws.getCell(`G${currentRow}`).value = 'Supervisor Signature';
          ws.getCell(`G${currentRow}`).font = { size: 9, italic: true };
        } catch (error) {
          console.error('Error adding signature to Excel:', error);
        }
      }
    }

    // ==========================================
    // OBSERVATION PHOTOS SHEET (if photos exist)
    // Similar to Fire Extinguisher's "AI Scan Images" sheet
    // ==========================================

    const observationsWithPhotos = data.observations.filter(
      (obs) => obs.photos && obs.photos.length > 0,
    );

    if (observationsWithPhotos.length > 0) {
      // Create a new worksheet for observation photos
      const imgWs = wb.addWorksheet('Observation Photos');

      const formattedDate = formatDate(data.date);

      // Row 1: Title
      imgWs.getCell('A1').value = 'OBSERVATION PHOTOS - HSE INSPECTION';
      imgWs.getCell('A1').font = { bold: true, size: 14 };
      imgWs.getCell('A1').alignment = { horizontal: 'center' };
      imgWs.mergeCells('A1:G1');

      // Row 2: Blank

      // Row 3: Metadata
      imgWs.getCell('A3').value = 'Inspection Date:';
      imgWs.getCell('B3').value = formattedDate;
      imgWs.getCell('D3').value = 'Inspector:';
      imgWs.getCell('E3').value = data.inspectedBy;

      // Row 4: Blank

      // Row 5: Note
      imgWs.getCell('A5').value =
        'Note: This sheet contains photo metadata. Images are embedded as base64 data URLs.';
      imgWs.mergeCells('A5:G5');

      // Row 6: Blank

      // Row 7: Headers
      imgWs.getCell('A7').value = 'Item No.';
      imgWs.getCell('B7').value = 'Category';
      imgWs.getCell('C7').value = 'Location';
      imgWs.getCell('D7').value = 'Observation';
      imgWs.getCell('E7').value = 'Photo #';
      imgWs.getCell('F7').value = 'Timestamp';
      imgWs.getCell('G7').value = 'Image Data (Base64)';

      // Style headers
      ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7'].forEach((cell) => {
        imgWs.getCell(cell).font = { bold: true };
        imgWs.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' },
        };
      });

      // Set column widths
      imgWs.getColumn('A').width = 10; // Item No.
      imgWs.getColumn('B').width = 20; // Category
      imgWs.getColumn('C').width = 15; // Location
      imgWs.getColumn('D').width = 30; // Observation
      imgWs.getColumn('E').width = 10; // Photo #
      imgWs.getColumn('F').width = 20; // Timestamp
      imgWs.getColumn('G').width = 50; // Image Data

      // Add photo data starting from row 8
      let imageRow = 8;
      let totalPhotos = 0;

      observationsWithPhotos.forEach((obs) => {
        if (obs.photos) {
          obs.photos.forEach((photo, photoIndex) => {
            imgWs.getCell(`A${imageRow}`).value = obs.itemNo;
            imgWs.getCell(`B${imageRow}`).value = obs.categoryName;
            imgWs.getCell(`C${imageRow}`).value = obs.location;
            imgWs.getCell(`D${imageRow}`).value = obs.observation;
            imgWs.getCell(`E${imageRow}`).value = photoIndex + 1;
            imgWs.getCell(`F${imageRow}`).value = new Date().toLocaleString();
            imgWs.getCell(`G${imageRow}`).value = photo; // Full base64 data URL
            imageRow++;
            totalPhotos++;
          });
        }
      });

      // Add summary section
      imageRow++;
      imgWs.getCell(`A${imageRow}`).value = 'Total Photos:';
      imgWs.getCell(`B${imageRow}`).value = totalPhotos;
      imgWs.getCell(`A${imageRow}`).font = { bold: true };

      imageRow++;
      imgWs.getCell(`A${imageRow}`).value = 'Observations with Photos:';
      imgWs.getCell(`B${imageRow}`).value = observationsWithPhotos.length;
      imgWs.getCell(`A${imageRow}`).font = { bold: true };
    }

    console.log('HSE Observation template filled successfully');
    return wb;
  } catch (error) {
    console.error('Error loading HSE Observation template:', error);
    throw new Error(
      'Could not load HSE Observation template. Please ensure "observation-template.xlsx" exists in the templates storage.',
    );
  }
}

/**
 * Download the Excel file
 */
export async function downloadHSEObservationForm(
  data: HSEObservationFormData,
  filename?: string,
): Promise<void> {
  try {
    const wb = await generateHSEObservationExcel(data);
    const defaultFilename = `HSE_Observation_Form_${data.location.replace(/[^a-z0-9]/gi, '_')}_${
      data.date
    }.xlsx`;

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

    console.log('HSE Observation form downloaded successfully');
  } catch (error) {
    console.error('Error generating HSE Observation Excel:', error);
    throw error;
  }
}

/**
 * Print function (opens in new window) - Not applicable for Excel, kept for compatibility
 */
export async function printHSEObservationForm(data: HSEObservationFormData): Promise<void> {
  console.warn('Print function not supported for Excel format. Use download instead.');
  await downloadHSEObservationForm(data);
}
