// src/utils/firstAidExport.ts
// First Aid Inspection PDF Export - Matching Template Format

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
}

interface FirstAidInspectionData {
  inspectedBy: string;
  designation: string;
  inspectionDate: string;
  signature?: string;
  kits: FirstAidKitInspection[];
}

// Standardized first aid items list matching the template
const STANDARD_FIRST_AID_ITEMS = [
  'Model No.',
  'Cotton Wool',
  'Cotton Swabs',
  'Cotton Buds',
  'Cotton Balls',
  'Analgesic Cream (Flanil)',
  'Antiseptic Cream (Bacidin)',
  'Normal Saline Eye Drops (Rinz)',
  'Surgical Tape 1.25 cm',
  'Lint Dressing No. 8',
  'Wound Dressing',
  'Safety/ Cloth Pin',
  'Non-Adherent Wound Compress',
  'Gauze Swabs (5cmx5cmx8ply)',
  'Non-Woven Triangular Bandage',
  'Elastic Gauze Bandage 8cm',
  'W.O.W Bandage (2.5cm/5cm/7.5cm)',
  'Antibacterial Disinfectant (BactePro)',
  "Antibacterial Disinfectant (Dr Cleanol's)",
  'Losyen Kuning (Cap Kaki Tiga)',
  'Alcohol Swab',
  'Linemen Wintergreen',
  'Emergency Blanket',
  'CPR Face Shield',
  'Plastic Tweezers',
  'Scissors',
  "Assorted Plasters 50's",
  "Plaster Strips 10's",
  'Adhesive Plaster (Snowflake)',
  'Roll Bandage',
  'Remarks',
];

/**
 * Format date for display (e.g., "02 September 2025")
 */
function formatDateForDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
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
 * Format date for filename
 */
function formatDateForFilename(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date
      .toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
      .replace(' ', '_');
  } catch {
    return 'report';
  }
}

/**
 * Build the main inspection table with all kits and items
 */
function buildInspectionTable(doc: jsPDF, kits: FirstAidKitInspection[], startY: number) {
  // Prepare table headers
  const headers = ['No', 'Model', 'Location', ...STANDARD_FIRST_AID_ITEMS];

  // Prepare table body - each kit has 3 rows: status row, expiry date row, quantity row
  const tableBody: Array<Array<string | number>> = [];

  kits.forEach((kit) => {
    // Group kits by location for the template format
    // Each kit location gets 3 rows: checkmarks, expiry dates, quantities

    // Row 1: Location with checkmarks/status
    const statusRow = [
      kit.no.toString(),
      kit.model,
      kit.location,
      kit.modelNo, // Model No. column
      ...kit.items.map((item) => {
        if (item.status === '✓') return '√';
        if (item.status === 'X') return 'X';
        if (item.status === 'NA') return 'N/A';
        return 'N/A';
      }),
      '', // Remarks column
    ];

    // Row 2: Expiry dates
    const expiryRow = [
      '', // No
      '', // Model
      'Expiry Date',
      'N/A', // Model No. expiry
      ...kit.items.map((item) => {
        if (item.expiryDateOption === 'date' && item.expiryDate) {
          return formatExpiryDate(item.expiryDate);
        }
        return 'N/A';
      }),
      '', // Remarks
    ];

    // Row 3: Quantities
    const quantityRow = [
      '', // No
      '', // Model
      'Quantity',
      'N/A', // Model No. quantity
      ...kit.items.map((item) => item.quantity || 'N/A'),
      kit.remarks || '', // Remarks
    ];

    tableBody.push(statusRow, expiryRow, quantityRow);
  });

  // Create the table
  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [153, 50, 204],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8 }, // No
      1: { cellWidth: 18 }, // Model
      2: { cellWidth: 18 }, // Location
      // All item columns get equal small width
      ...Object.fromEntries(
        STANDARD_FIRST_AID_ITEMS.map((_, idx) => [
          idx + 3,
          { cellWidth: (297 - 44 - 20) / STANDARD_FIRST_AID_ITEMS.length }, // Remaining width divided
        ]),
      ),
    },
    didParseCell(cellData) {
      // Style the location/expiry/quantity label cells
      if (
        cellData.column.index === 2 &&
        (cellData.cell.raw === 'Expiry Date' || cellData.cell.raw === 'Quantity')
      ) {
        cellData.cell.styles.fontStyle = 'italic';
        cellData.cell.styles.fontSize = 5;
      }

      // Bold checkmarks
      if (cellData.cell.raw === '√') {
        cellData.cell.styles.textColor = [0, 128, 0];
        cellData.cell.styles.fontStyle = 'bold';
      }

      // Red X marks
      if (cellData.cell.raw === 'X') {
        cellData.cell.styles.textColor = [255, 0, 0];
        cellData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 10, right: 10 },
    tableWidth: 'auto',
  });
}

/**
 * Download the PDF
 */
export function downloadFirstAidPDF(data: FirstAidInspectionData, filename?: string) {
  // Note: PDF generation logic should be implemented or imported from templatePdfGenerator
  const defaultFilename = `First_Aid_Inspection_${formatDateForFilename(data.inspectionDate)}.pdf`;
  console.warn('generateFirstAidPDF not implemented in this module');
  // pdf.save(filename || defaultFilename);
}
