// API endpoint for template-based first aid export
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { convertExcelToPDF } from '@/utils/excelToPdfConverter';

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
  format?: 'excel' | 'pdf';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerSignature?: string;
}

// Cell mapping for first aid template
const FIRST_AID_MAPPING = {
  inspectedBy: 'P10',
  inspectionDate: 'Y10',
  designation: 'P12',
  signature: 'Y12',
  dataStartRow: 16, // Row where first kit data starts
  columns: {
    no: 'A',
    model: 'B',
    location: 'C',
    modelNo: 'D',
    itemsStartColumn: 4, // Column E (items start from column index 4)
    remarks: 'AH', // Column 34 (index 33)
  },
};

// Standard first aid items matching template
const STANDARD_FIRST_AID_ITEMS = [
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
  'Safety/ Cloth Pin ',
  'Emergency Blanket',
  'CPR Face Shield',
  'Plastic Tweezers',
  'Scissors',
  "Assorted Plasters 50's",
  "Plaster Strips 10's ",
  'Adhesive Plaster (Snowflake)',
  'Roll Bandage',
];

// Helper function to convert column index to Excel column letter (0 = A, 25 = Z, 26 = AA, etc.)
function getColumnLetter(columnIndex: number): string {
  let columnLetter = '';
  let index = columnIndex;

  while (index >= 0) {
    columnLetter = String.fromCharCode((index % 26) + 65) + columnLetter;
    index = Math.floor(index / 26) - 1;
  }

  return columnLetter;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const formData: FirstAidInspectionData = req.body;
    const format = formData.format || 'excel';

    // Validate required fields
    if (!formData.inspectedBy || !formData.inspectionDate || !formData.designation) {
      return res.status(400).json({
        error: 'Missing required fields: inspectedBy, inspectionDate, designation',
      });
    }

    if (!formData.kits || formData.kits.length === 0) {
      return res.status(400).json({
        error: 'No kit data provided',
      });
    }

    // Import template loader (uses local templates first, Supabase as fallback)
    const { loadTemplate } = await import('../../../utils/templateLoader');

    // Load template with caching (local -> Supabase fallback)
    const templateBuffer = await loadTemplate('templates', 'first aid form.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(500).json({ error: 'No worksheet found in template' });
    }

    // Fill header information
    worksheet.getCell(
      FIRST_AID_MAPPING.inspectedBy,
    ).value = `Inspected by :\n${formData.inspectedBy}`;
    const formattedDate = new Date(formData.inspectionDate).toLocaleDateString('en-GB');
    worksheet.getCell(
      FIRST_AID_MAPPING.inspectionDate,
    ).value = `Date of Inspection :\n${formattedDate}`;
    worksheet.getCell(
      FIRST_AID_MAPPING.designation,
    ).value = `Designation  :\n${formData.designation}`;

    // Add supervisor review information if available
    if (formData.reviewedBy && formData.reviewedAt) {
      const reviewDate = new Date(formData.reviewedAt).toLocaleDateString('en-GB');
      const lastRow = FIRST_AID_MAPPING.dataStartRow + formData.kits.length * 3 + 2;

      // Add "Reviewed by" section
      worksheet.getCell(`A${lastRow}`).value = 'Reviewed by:';
      worksheet.getCell(`A${lastRow}`).font = { bold: true, size: 11 };

      worksheet.getCell(`B${lastRow}`).value = formData.reviewedBy;
      worksheet.getCell(`E${lastRow}`).value = `Date: ${reviewDate}`;

      // Add signature if available
      if (formData.reviewerSignature) {
        try {
          // Convert base64 signature to image
          const base64Data = formData.reviewerSignature.replace(/^data:image\/\w+;base64,/, '');
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          });

          worksheet.addImage(imageId, {
            tl: { col: 9, row: lastRow - 1 },
            ext: { width: 150, height: 50 },
          });

          worksheet.getCell(`J${lastRow}`).value = 'Supervisor Signature';
          worksheet.getCell(`J${lastRow}`).font = { size: 9, italic: true };
        } catch (error) {
          console.error('Error adding signature to Excel:', error);
        }
      }
    }

    // Fill kit data
    let currentRow = FIRST_AID_MAPPING.dataStartRow;

    formData.kits.forEach((kit, kitIndex) => {
      // Add separator row between kits (except before first)
      if (kitIndex > 0) {
        worksheet.getRow(currentRow); // Ensure separator row exists
        currentRow++; // Empty separator row
      }

      // Status row - ensure row exists first
      const statusRow = worksheet.getRow(currentRow);
      statusRow.getCell(FIRST_AID_MAPPING.columns.no).value = kit.no;
      statusRow.getCell(FIRST_AID_MAPPING.columns.model).value = kit.model;
      statusRow.getCell(FIRST_AID_MAPPING.columns.location).value = kit.location;
      statusRow.getCell(FIRST_AID_MAPPING.columns.modelNo).value = kit.modelNo;

      // Fill item statuses
      kit.items.forEach((item, itemIndex) => {
        const col = getColumnLetter(FIRST_AID_MAPPING.columns.itemsStartColumn + itemIndex);
        let statusValue = '';
        if (item.status === '✓') statusValue = '√';
        else if (item.status === 'X') statusValue = 'X';
        else if (item.status === 'NA') statusValue = 'N/A';
        statusRow.getCell(col).value = statusValue;
      });
      currentRow++;

      // Expiry date row - ensure row exists first
      const expiryRow = worksheet.getRow(currentRow);
      expiryRow.getCell(FIRST_AID_MAPPING.columns.location).value = 'Expiry Date';
      kit.items.forEach((item, itemIndex) => {
        if (item.expiryDateOption === 'date' && item.expiryDate) {
          const col = getColumnLetter(FIRST_AID_MAPPING.columns.itemsStartColumn + itemIndex);
          const date = new Date(item.expiryDate);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = String(date.getFullYear()).slice(-2);
          expiryRow.getCell(col).value = `${month}/${year}`;
        }
      });
      currentRow++;

      // Quantity row - ensure row exists first
      const quantityRow = worksheet.getRow(currentRow);
      quantityRow.getCell(FIRST_AID_MAPPING.columns.location).value = 'Quantity';
      kit.items.forEach((item, itemIndex) => {
        const col = getColumnLetter(FIRST_AID_MAPPING.columns.itemsStartColumn + itemIndex);
        quantityRow.getCell(col).value = item.quantity || '';
      });
      quantityRow.getCell(FIRST_AID_MAPPING.columns.remarks).value = kit.remarks || '';
      currentRow++;
    });

    // Prepare filename
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

    if (format === 'pdf') {
      // Generate PDF from the filled Excel template
      // This ensures the PDF matches the Excel template exactly
      try {
        const excelBuffer = await workbook.xlsx.writeBuffer();

        // Convert Excel to PDF maintaining all formatting
        const pdfBuffer = await convertExcelToPDF(excelBuffer as Buffer, {
          includeImages: true,
          maintainColors: true,
          pageSize: 'A4',
          orientation: 'portrait',
        });

        const filename = `First_Aid_Checklist_${
          monthNames[date.getMonth()]
        }_${date.getFullYear()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.status(200).send(pdfBuffer);
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        res.status(500).json({
          error: 'Failed to generate PDF from template',
          message: pdfError instanceof Error ? pdfError.message : 'Unknown error',
        });
      }
    } else {
      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `First_Aid_Checklist_${
        monthNames[date.getMonth()]
      }_${date.getFullYear()}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', (buffer as any).length);
      res.status(200).send(buffer);
    }
  } catch (error) {
    console.error('Error generating template-based export:', error);
    res.status(500).json({
      error: 'Failed to generate export',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
