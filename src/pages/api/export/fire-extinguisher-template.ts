// API endpoint for template-based fire extinguisher export
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { convertExcelToPDF } from '@/utils/excelToPdfConverter';
import { validateBody, FireExtinguisherExportSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

interface CapturedImage {
  stepId: string;
  dataUrl: string;
  timestamp: number;
}

interface FireExtinguisherRow {
  no: number;
  serialNo: string;
  location: string;
  typeSize: string;
  shell: string | null;
  hose: string | null;
  nozzle: string | null;
  pressureGauge: string | null;
  safetyPin: string | null;
  pinSeal: string | null;
  accessible: string | null;
  missingNotInPlace: string | null;
  emptyPressureLow: string | null;
  servicingTags: string | null;
  expiryDate: string;
  remarks: string;
  aiScanned?: boolean;
  aiConfidence?: { [field: string]: number };
  aiCapturedImages?: CapturedImage[];
}

interface FireExtinguisherFormData {
  inspectedBy: string;
  inspectionDate: string;
  designation: string;
  signature?: string;
  extinguishers: FireExtinguisherRow[];
  format?: 'excel' | 'pdf';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerSignature?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validation = validateBody(FireExtinguisherExportSchema, req.body);
    if (!validation.success) {
      logger.warn('Fire extinguisher export validation failed', { errors: validation.details });
      return res.status(400).json(validation);
    }

    const formData = validation.data as FireExtinguisherFormData;
    const format = formData.format || 'excel';

    // Import template loader (uses local templates first, Supabase as fallback)
    const { loadTemplate } = await import('../../../utils/templateLoader');

    // Load template with caching (local -> Supabase fallback)
    const templateBuffer = await loadTemplate('templates', 'fire extinguisher form.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    // Fill template with form data
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(500).json({ error: 'No worksheet found in template' });
    }

    // Fill header information
    worksheet.getCell('J9').value = `Inspected by :\n${formData.inspectedBy}`;
    const formattedDate = new Date(formData.inspectionDate).toLocaleDateString('en-GB');
    worksheet.getCell('O9').value = `Date of Inspection :\n${formattedDate}`;
    worksheet.getCell('J10').value = `Designation  :\n${formData.designation}`;

    // Data start row
    const dataStartRow = 14;

    // Add supervisor review information if available
    if (formData.reviewedBy && formData.reviewedAt) {
      const reviewDate = new Date(formData.reviewedAt).toLocaleDateString('en-GB');
      const lastRow = dataStartRow + formData.extinguishers.length + 2;

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

    // Fill extinguisher data
    const columns = {
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
    };

    formData.extinguishers.forEach((ext, index) => {
      const row = dataStartRow + index;
      worksheet.getCell(`${columns.no}${row}`).value = ext.no;
      worksheet.getCell(`${columns.serialNo}${row}`).value = ext.serialNo;
      worksheet.getCell(`${columns.location}${row}`).value = ext.location;
      worksheet.getCell(`${columns.typeSize}${row}`).value = ext.typeSize;
      worksheet.getCell(`${columns.shell}${row}`).value = ext.shell || '';
      worksheet.getCell(`${columns.hose}${row}`).value = ext.hose || '';
      worksheet.getCell(`${columns.nozzle}${row}`).value = ext.nozzle || '';
      worksheet.getCell(`${columns.pressureGauge}${row}`).value = ext.pressureGauge || '';
      worksheet.getCell(`${columns.safetyPin}${row}`).value = ext.safetyPin || '';
      worksheet.getCell(`${columns.pinSeal}${row}`).value = ext.pinSeal || '';
      worksheet.getCell(`${columns.accessible}${row}`).value = ext.accessible || '';
      worksheet.getCell(`${columns.missingNotInPlace}${row}`).value = ext.missingNotInPlace || '';
      worksheet.getCell(`${columns.emptyPressureLow}${row}`).value = ext.emptyPressureLow || '';
      worksheet.getCell(`${columns.servicingTags}${row}`).value = ext.servicingTags || '';
      worksheet.getCell(`${columns.expiryDate}${row}`).value = ext.expiryDate;
      worksheet.getCell(`${columns.remarks}${row}`).value = ext.remarks;
    });

    // Create AI Images sheet if there are any captured images
    const extinguishersWithImages = formData.extinguishers.filter(
      (ext) => ext.aiCapturedImages && ext.aiCapturedImages.length > 0,
    );

    if (extinguishersWithImages.length > 0) {
      // Create a new worksheet for AI images
      const aiWorksheet = workbook.addWorksheet('AI Scan Images');

      // Set column widths
      aiWorksheet.columns = [
        { header: 'Extinguisher #', key: 'extNo', width: 15 },
        { header: 'Serial No', key: 'serialNo', width: 18 },
        { header: 'Location', key: 'location', width: 15 },
        { header: 'Image Type', key: 'imageType', width: 25 },
        { header: 'Capture Time', key: 'captureTime', width: 22 },
        { header: 'AI Confidence', key: 'confidence', width: 15 },
      ];

      // Add title
      aiWorksheet.mergeCells('A1:F1');
      aiWorksheet.getCell('A1').value = 'AI SCAN IMAGES - FIRE EXTINGUISHER INSPECTION';
      aiWorksheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      aiWorksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' },
      };
      aiWorksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      // Add inspection info
      aiWorksheet.mergeCells('A3:B3');
      aiWorksheet.getCell('A3').value = 'Inspection Date:';
      aiWorksheet.getCell('C3').value = formattedDate;

      aiWorksheet.mergeCells('D3:E3');
      aiWorksheet.getCell('D3').value = 'Inspector:';
      aiWorksheet.getCell('F3').value = formData.inspectedBy;

      // Add note
      aiWorksheet.mergeCells('A5:F5');
      aiWorksheet.getCell('A5').value =
        'Note: Images are embedded below. Each image shows the AI scan capture for the corresponding extinguisher.';
      aiWorksheet.getCell('A5').font = { italic: true, size: 10 };
      aiWorksheet.getCell('A5').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };

      // Add column headers
      const headerRow = aiWorksheet.getRow(7);
      headerRow.values = [
        'Extinguisher #',
        'Serial No',
        'Location',
        'Image Type',
        'Capture Time',
        'AI Confidence',
      ];
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      let currentRow = 8;

      // Add image data for each extinguisher
      for (const ext of extinguishersWithImages) {
        if (ext.aiCapturedImages) {
          for (const image of ext.aiCapturedImages) {
            // Calculate average confidence for this extinguisher
            let avgConfidence = 'N/A';
            if (ext.aiConfidence && Object.keys(ext.aiConfidence).length > 0) {
              const confidenceValues = Object.values(ext.aiConfidence);
              const avg =
                confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length;
              avgConfidence = `${Math.round(avg * 100)}%`;
            }

            // Add row data
            const row = aiWorksheet.getRow(currentRow);
            row.values = [
              ext.no,
              ext.serialNo,
              ext.location,
              image.stepId.replace(/_/g, ' '),
              new Date(image.timestamp).toLocaleString(),
              avgConfidence,
            ];

            // Try to add the image
            try {
              const base64Data = image.dataUrl.replace(/^data:image\/\w+;base64,/, '');
              const imageId = workbook.addImage({
                base64: base64Data,
                extension: 'png',
              });

              // Set row height to accommodate image
              row.height = 120;

              // Add image to the worksheet at the end of the row
              aiWorksheet.addImage(imageId, {
                tl: { col: 6, row: currentRow - 1 },
                ext: { width: 200, height: 150 },
              });
            } catch (error) {
              console.error('Error adding image to Excel:', error);
            }

            currentRow++;
          }
        }
      }

      // Add summary at the end
      currentRow += 2;
      aiWorksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      aiWorksheet.getCell(`A${currentRow}`).value = 'Total Images:';
      aiWorksheet.getCell(`A${currentRow}`).font = { bold: true };
      aiWorksheet.getCell(`C${currentRow}`).value = extinguishersWithImages.reduce(
        (sum, ext) => sum + (ext.aiCapturedImages?.length || 0),
        0,
      );

      currentRow++;
      aiWorksheet.mergeCells(`A${currentRow}:B${currentRow}`);
      aiWorksheet.getCell(`A${currentRow}`).value = 'Extinguishers Scanned:';
      aiWorksheet.getCell(`A${currentRow}`).font = { bold: true };
      aiWorksheet.getCell(`C${currentRow}`).value = extinguishersWithImages.length;
    }

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
          orientation: 'landscape',
        });

        const filename = `Fire_Extinguisher_Checklist_${
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
      const filename = `Fire_Extinguisher_Checklist_${
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
