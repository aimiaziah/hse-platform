// API endpoint for template-based fire extinguisher export
/* eslint-disable no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';
import { convertExcelToPDF } from '@/utils/excelToPdfConverter';
import { validateBody, FireExtinguisherExportSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';
import sharp from 'sharp';

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

// Helper function to convert image URL to base64
async function getImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    // If it's already a data URL, extract the base64 part
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl.replace(/^data:image\/\w+;base64,/, '');
    }

    // If it's a URL, fetch it and convert to base64
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image from URL: ${imageUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error(`Error converting image URL to base64: ${imageUrl}`, error);
    return null;
  }
}

// Helper function to add timestamp overlay to image
async function addTimestampToImage(
  base64Image: string,
  timestamp: number,
): Promise<string | null> {
  try {
    // Decode base64 image
    const imageBuffer = Buffer.from(base64Image, 'base64');
    
    // Format timestamp
    const date = new Date(timestamp);
    const timestampText = date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Get image metadata to determine dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Create SVG text overlay with background for better visibility
    const fontSize = Math.max(18, Math.round(width / 45)); // Responsive font size
    const padding = 15;
    const textX = padding;
    const textY = height - padding;
    const textWidth = timestampText.length * (fontSize * 0.6); // Approximate text width
    const textHeight = fontSize + 8;

    const svgText = `
      <svg width="${width}" height="${height}">
        <rect 
          x="${textX - 5}" 
          y="${textY - textHeight + 5}" 
          width="${textWidth + 10}" 
          height="${textHeight}" 
          fill="rgba(0, 0, 0, 0.6)" 
          rx="3"
        />
        <text 
          x="${textX}" 
          y="${textY}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}" 
          font-weight="bold"
          fill="white"
        >
          ${timestampText}
        </text>
      </svg>
    `;

    // Composite the image with timestamp overlay
    const imageWithTimestamp = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    // Convert back to base64
    return imageWithTimestamp.toString('base64');
  } catch (error) {
    console.error('Error adding timestamp to image:', error);
    // Return original image if timestamp overlay fails
    return base64Image;
  }
}

// Increase body size limit to handle large image data
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase from default 1mb to 10mb
    },
  },
};

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

    console.log('Fire Extinguisher Export - Total extinguishers:', formData.extinguishers.length);
    console.log(
      'Fire Extinguisher Export - Extinguishers with images:',
      extinguishersWithImages.length,
    );
    if (extinguishersWithImages.length > 0) {
      console.log(
        'Fire Extinguisher Export - Total images:',
        extinguishersWithImages.reduce((sum, ext) => sum + (ext.aiCapturedImages?.length || 0), 0),
      );
    }

    if (extinguishersWithImages.length > 0) {
      // Create a new worksheet for captured images
      const aiWorksheet = workbook.addWorksheet('Images');

      // Set column widths
      aiWorksheet.columns = [
        { header: 'Extinguisher #', key: 'extNo', width: 15 },
        { header: 'Serial No', key: 'serialNo', width: 18 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Capture Time', key: 'captureTime', width: 22 },
      ];

      // Add title
      aiWorksheet.mergeCells('A1:D1');
      aiWorksheet.getCell('A1').value = 'CAPTURED IMAGES - FIRE EXTINGUISHER INSPECTION';
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

      aiWorksheet.getCell('D3').value = `Inspector: ${formData.inspectedBy}`;

      // Add note
      aiWorksheet.mergeCells('A5:D5');
      aiWorksheet.getCell('A5').value =
        'Note: Images are embedded below. Each image shows the captured photo for the corresponding extinguisher.';
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
        'Capture Time',
      ];
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      let currentRow = 8;

      // Add image data for each extinguisher (one row per extinguisher with all images side by side)
      for (const ext of extinguishersWithImages) {
        if (ext.aiCapturedImages && ext.aiCapturedImages.length > 0) {
          // Get the earliest timestamp for display
          const earliestTimestamp = ext.aiCapturedImages.reduce((earliest, img) => 
            img.timestamp < earliest ? img.timestamp : earliest, 
            ext.aiCapturedImages[0].timestamp
          );

          // Create one row for this extinguisher
          const row = aiWorksheet.getRow(currentRow);
          row.values = [
            ext.no,
            ext.serialNo,
            ext.location,
            new Date(earliestTimestamp).toLocaleString(),
          ];

          // Set row height to accommodate images
          row.height = 120;

          // Add all images side by side in the same row
          const imageWidth = 200;
          const imageHeight = 150;
          let imageCol = 4; // Start from column D (index 4, which is after the data columns)

          for (let imgIndex = 0; imgIndex < ext.aiCapturedImages.length; imgIndex++) {
            const image = ext.aiCapturedImages[imgIndex];
            try {
              if (image.dataUrl) {
                // Convert image URL to base64 (handles both data URLs and regular URLs)
                let base64Data = await getImageAsBase64(image.dataUrl);

                if (base64Data) {
                  // Add timestamp overlay to the image
                  const imageWithTimestamp = await addTimestampToImage(base64Data, image.timestamp);
                  if (imageWithTimestamp) {
                    base64Data = imageWithTimestamp;
                  }

                  // Determine image extension (always PNG after timestamp overlay)
                  const extension: 'png' = 'png';

                  const imageId = workbook.addImage({
                    base64: base64Data,
                    extension: extension,
                  });

                  // Add image to the worksheet at the calculated column position
                  aiWorksheet.addImage(imageId, {
                    tl: { col: imageCol, row: currentRow - 1 },
                    ext: { width: imageWidth, height: imageHeight },
                  });

                  // Move to next column position for next image
                  // Each 200px image spans approximately 3 columns (default Excel column width ~64px)
                  // We increment by 3 to place images side by side with minimal overlap
                  imageCol += 3;

                  console.log(
                    `Successfully added image ${imgIndex + 1}/${ext.aiCapturedImages.length} for extinguisher #${ext.no} at row ${currentRow}, col ${imageCol - 3}`,
                  );
                } else {
                  console.error('Failed to convert image to base64 for extinguisher', ext.no);
                }
              } else {
                console.error('Image dataUrl is missing for extinguisher', ext.no);
              }
            } catch (error) {
              console.error(`Error adding image ${imgIndex + 1} for extinguisher #${ext.no}:`, error);
            }
          }

          currentRow++;
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
