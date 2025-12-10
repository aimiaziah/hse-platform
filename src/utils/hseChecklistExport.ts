// HSE Inspection Checklist Export - Uses Template from local/Supabase storage

import ExcelJS from 'exceljs';
import { loadTemplate } from './templateLoader';

/**
 * Interface for HSE Inspection data
 */
export interface HSEInspectionChecklistData {
  contractor: string;
  location: string;
  date: string;
  inspectedBy: string;
  workActivity: string;
  tablePersons: Array<{
    no: number;
    name: string;
    designation: string;
    signature: string;
  }>;
  inspectionItems: Array<{
    key: string;
    categoryId: number;
    item: string;
    rating: string | null;
    comment: string;
  }>;
  commentsRemarks?: string;
}

/**
 * Category definitions matching the form
 */
const categories = [
  {
    id: 1,
    name: 'WORKING AREAS',
    items: [
      'Housekeeping',
      'Proper barrier/ safety signs',
      'Lighting adequacy',
      'Site layout arrangement',
      'Ventilation',
      'Floor/ ground-edge/ opening condition',
      'Escape/ working route condition',
      'Material storage/ stacking',
    ],
  },
  {
    id: 2,
    name: 'SITE OFFICE',
    items: [
      'Office ergonomics',
      'Location and maintenance',
      'Fire extinguishers condition',
      'First aid box facility',
      "Worker's legality / age",
      'Green card (CIDB)/ NIOSH cert.',
      'PMA/ PMT/ JBE/ DOE approval',
      'Competent scaffolder',
    ],
  },
  {
    id: 3,
    name: 'HOT WORK/ ELECTRICAL',
    items: [
      'Gas cylinders secured and upright',
      'Gauge functionality',
      'Flashback arrestors availability',
      'Cables insulation/ earthing',
      'Wiring condition-plugs, joints, DB',
    ],
  },
  {
    id: 4,
    name: 'PERSONAL PROTECTIVE EQUIPMENT',
    items: [
      'Safety helmets',
      'Safety footwear',
      'Safety vest',
      'Proper attire',
      'Other; as per job requirements',
    ],
  },
  {
    id: 5,
    name: 'EXCAVATIONS',
    items: [
      'Safely secured-sign, barrier covered',
      'No material at 1m from edge',
      'Proper & adequate access & egress',
      'Adequate slope protection',
      'Check for underground hazard',
      'Inspection checklist',
    ],
  },
  {
    id: 6,
    name: 'SCAFFOLDING',
    items: [
      'PE design requirement',
      'Access condition',
      'Walkways/ platform condition',
      'Adequate slope protection',
      'Means of fall protection',
      'Ground/base condition',
      'Inspection checklist',
    ],
  },
  {
    id: 7,
    name: 'MACHINERY & PLANT',
    items: [
      'Machinery guarding',
      'Machinery/ plant service record',
      'Properly and safely sited',
      'Skid tank condition',
      'Lifting process/ gear condition',
      "Vehicle's condition",
    ],
  },
  {
    id: 8,
    name: 'TRAFFIC MANAGEMENT',
    items: [
      'Flagman availability & adequacy',
      'Signages availability & adequacy',
      'Vehicle route maintenance',
      'Public road maintenance',
      'Loads protection',
      'Method of controlling',
    ],
  },
  {
    id: 9,
    name: 'HEALTH',
    items: [
      'First aid box/ facility',
      'First aider availability',
      'Vector/ Pest control',
      'Washing/ clean water facility',
      'Toilet condition / availability',
    ],
  },
  {
    id: 10,
    name: 'ENVIRONMENTAL',
    items: [
      'Control of oil pollution',
      'Control of dust pollution / emission',
      'Control of noise pollution / emission',
      'Control of open burning',
      'Control of debris / rubbish',
      'Silt trap/drainage/culvert maintenance',
    ],
  },
  {
    id: 11,
    name: 'SECURITY',
    items: [
      'Security personal adequacy',
      'Security sign condition/ availability',
      'Control of site access/ exit',
      'Hoarding/ fencing condition',
      'Emergency contact list',
    ],
  },
  {
    id: 12,
    name: 'PUBLIC SAFETY',
    items: [
      'Warning signs',
      'Control of public entry',
      'Proper work planning toward public safety',
      'Communication establishment',
      'Training on public safety to worker',
      'Catch platform',
      'Pedestrian protection',
    ],
  },
];

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
 * Generate HSE Inspection Checklist Excel using template
 */
export async function generateHSEInspectionChecklistExcel(
  data: HSEInspectionChecklistData,
): Promise<ExcelJS.Workbook> {
  try {
    // Load the template file from storage
    const templateBuffer = await fetchTemplateFromStorage(
      'templates',
      'hse-inspection-template.xlsx',
    );

    // Load the template with ExcelJS
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

    // Fill basic information (adjust cell references based on actual template)
    // Row 4: Contractor and Date
    if (data.contractor) {
      ws.getCell('B4').value = data.contractor;
    }
    if (data.date) {
      ws.getCell('K4').value = formatDate(data.date);
    }

    // Row 5: Location and Inspected By
    if (data.location) {
      ws.getCell('B5').value = data.location;
    }
    if (data.inspectedBy) {
      ws.getCell('K5').value = data.inspectedBy;
    }

    // Row 6: Work Activity
    if (data.workActivity) {
      ws.getCell('B6').value = data.workActivity;
    }

    // ==========================================
    // PERSONNEL TABLE (if applicable)
    // ==========================================

    // Personnel table starts around row 9-10 (adjust based on template)
    const personnelStartRow = 10;
    data.tablePersons.forEach((person, index) => {
      if (person.name || person.designation) {
        const row = personnelStartRow + index;
        ws.getCell(`A${row}`).value = person.no;
        ws.getCell(`B${row}`).value = person.name;
        ws.getCell(`C${row}`).value = person.designation;
        ws.getCell(`D${row}`).value = person.signature ? 'Signed' : '';
      }
    });

    // ==========================================
    // INSPECTION ITEMS SECTION
    // ==========================================

    // Inspection items start around row 15 (adjust based on template)
    let currentRow = 15;

    categories.forEach((category) => {
      // Category header row
      currentRow += 1;
      ws.getCell(`A${currentRow}`).value = `${category.id}. ${category.name}`;
      ws.getCell(`A${currentRow}`).font = { bold: true };

      // Items for this category
      category.items.forEach((item) => {
        currentRow += 1;
        const key = `${category.id}-${item}`;
        const itemData = data.inspectionItems.find((i) => i.key === key);
        const rating = itemData?.rating;
        const comment = itemData?.comment || '';

        // Fill item name and ratings
        ws.getCell(`A${currentRow}`).value = item;

        // Rating columns (adjust based on template: G, A, P, I, SIN, SPS, SWO)
        ws.getCell(`B${currentRow}`).value = rating === 'G' ? '✓' : '';
        ws.getCell(`C${currentRow}`).value = rating === 'A' ? '✓' : '';
        ws.getCell(`D${currentRow}`).value = rating === 'P' ? '✓' : '';
        ws.getCell(`E${currentRow}`).value = rating === 'I' ? '✓' : '';
        ws.getCell(`F${currentRow}`).value = rating === 'SIN' ? '✓' : '';
        ws.getCell(`G${currentRow}`).value = rating === 'SPS' ? '✓' : '';
        ws.getCell(`H${currentRow}`).value = rating === 'SWO' ? '✓' : '';
        ws.getCell(`I${currentRow}`).value = comment;
      });
    });

    // ==========================================
    // COMMENTS/REMARKS SECTION
    // ==========================================

    if (data.commentsRemarks) {
      currentRow += 3;
      ws.getCell(`A${currentRow}`).value = 'Comments/Remarks:';
      ws.getCell(`A${currentRow}`).font = { bold: true };
      currentRow += 1;
      ws.getCell(`A${currentRow}`).value = data.commentsRemarks;
    }

    return wb;
  } catch (error) {
    throw new Error(
      'Could not load HSE Inspection template. Please ensure "hse-inspection-template.xlsx" exists in the templates storage.',
    );
  }
}

/**
 * Download the Excel file (Legacy - creates from scratch)
 */
export async function downloadHSEInspectionChecklist(
  formData: HSEInspectionChecklistData,
  filename?: string,
): Promise<void> {
  try {
    const wb = await generateHSEInspectionChecklistExcel(formData);
    const defaultFilename = `HSE_Inspection_Checklist_${formData.location.replace(
      /[^a-z0-9]/gi,
      '_',
    )}_${formData.date}.xlsx`;

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

    // HSE Inspection checklist downloaded successfully
  } catch (error) {
    // Error downloading HSE Inspection checklist
    throw error;
  }
}

/**
 * Download HSE Inspection Checklist using template from Supabase Storage
 */
export async function downloadHSEInspectionChecklistWithTemplate(
  formData: HSEInspectionChecklistData & { commentsRemarks?: string },
  format: 'excel' | 'pdf' = 'excel',
): Promise<void> {
  try {
    // For now, use the template-based approach for Excel
    if (format === 'excel') {
      return await downloadHSEInspectionChecklist(formData);
    }

    // For PDF, call the API endpoint
    const response = await fetch('/api/export/hse-inspection-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        format,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to generate export: ${response.statusText}`);
    }

    // Get the blob from response
    const blob = await response.blob();

    // Generate filename
    const extension = format === 'pdf' ? 'pdf' : 'xlsx';
    const filename = `HSE_Inspection_Checklist_${formData.location.replace(/[^a-z0-9]/gi, '_')}_${
      formData.date
    }.${extension}`;

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // HSE Inspection Checklist downloaded successfully
  } catch (error) {
    // Error downloading HSE Inspection checklist with template
    throw error;
  }
}
