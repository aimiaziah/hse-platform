// Template-based PDF generation using jsPDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FireExtinguisherData {
  inspectedBy: string;
  inspectionDate: string;
  designation: string;
  signature?: string;
  extinguishers: any[];
  reviewedBy?: string;
  reviewerSignature?: string;
  reviewedAt?: string;
}

interface FirstAidData {
  inspectedBy: string;
  inspectionDate: string;
  designation: string;
  signature?: string;
  kits: any[];
  reviewedBy?: string;
  reviewerSignature?: string;
  reviewedAt?: string;
}

export function generateFireExtinguisherPDF(data: FireExtinguisherData): jsPDF {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  let yPosition = 15;

  // Add logo/branding
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('theta', pageWidth - 30, 10);

  // Document reference
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('HSEP-08/FEC(F)/RV00-017', pageWidth - 50, 15);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRE EXTINGUISHER CHECKLIST', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Company info section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Section 1: General Information', 15, yPosition);
  yPosition += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Company: Theta Edge Berhad', 15, yPosition);
  yPosition += 4;
  doc.text('Lot 11B, Jalan 223, Seksyen 51A,', 15, yPosition);
  yPosition += 4;
  doc.text('46100 Petaling Jaya, Selangor, Malaysia.', 15, yPosition);
  yPosition += 4;
  doc.text('+603 6043 0000', 15, yPosition);
  yPosition += 8;

  // Inspector details
  const formattedDate = new Date(data.inspectionDate).toLocaleDateString('en-GB');
  doc.text(`Inspected by: ${data.inspectedBy}`, 15, yPosition);
  doc.text(`Date of Inspection: ${formattedDate}`, pageWidth / 2, yPosition);
  yPosition += 5;
  doc.text(`Designation: ${data.designation}`, 15, yPosition);
  yPosition += 10;

  // Section 2: Inspection table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Section 2: Inspection Details', 15, yPosition);
  yPosition += 8;

  // Create table data
  const tableData = data.extinguishers.map((ext) => [
    ext.no.toString(),
    ext.serialNo,
    ext.location,
    ext.typeSize,
    ext.shell || '',
    ext.hose || '',
    ext.nozzle || '',
    ext.pressureGauge || '',
    ext.safetyPin || '',
    ext.pinSeal || '',
    ext.accessible || '',
    ext.missingNotInPlace || '',
    ext.emptyPressureLow || '',
    ext.servicingTags || '',
    ext.expiryDate || '',
    ext.remarks || '',
  ]);

  // Generate table
  autoTable(doc, {
    startY: yPosition,
    head: [[
      'No',
      'Serial No',
      'Location',
      'Type/Size',
      'Shell',
      'Hose',
      'Nozzle',
      'Pressure\nGauge',
      'Safety\nPin',
      'Pin\nSeal',
      'Access-\nible',
      'Missing',
      'Empty/\nLow',
      'Servicing/\nTags',
      'Expiry\nDate',
      'Remarks',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [147, 51, 234],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 18 },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 10, halign: 'center' },
      9: { cellWidth: 10, halign: 'center' },
      10: { cellWidth: 12, halign: 'center' },
      11: { cellWidth: 10, halign: 'center' },
      12: { cellWidth: 10, halign: 'center' },
      13: { cellWidth: 12, halign: 'center' },
      14: { cellWidth: 18, halign: 'center' },
      15: { cellWidth: 'auto' },
    },
    margin: { left: 10, right: 10 },
  });

  // Add reviewer information if available
  if (data.reviewedBy && data.reviewedAt) {
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Section 3: Review Information', 15, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const reviewedDate = new Date(data.reviewedAt).toLocaleDateString('en-GB');
    doc.text(`Reviewed by: ${data.reviewedBy}`, 15, yPosition);
    doc.text(`Date of Review: ${reviewedDate}`, pageWidth / 2, yPosition);

    // Add reviewer signature if available
    if (data.reviewerSignature) {
      yPosition += 5;
      doc.text('Signature:', 15, yPosition);
      yPosition += 2;
      const img = new Image();
      img.src = data.reviewerSignature;
      doc.addImage(img, 'PNG', 15, yPosition, 40, 15);
    }
  }

  return doc;
}

export function generateFirstAidPDF(data: FirstAidData): jsPDF {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  let yPosition = 15;

  // Add logo/branding
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('theta', pageWidth - 30, 10);

  // Document reference
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('HSEP-08/FAIC(F)/RV00-018', pageWidth - 50, 15);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRST AID ITEMS CHECKLIST', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Company info section
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Section 1: General Information', 15, yPosition);
  yPosition += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Company: Theta Edge Berhad', 15, yPosition);
  yPosition += 4;
  doc.text('Lot 11B, Jalan 223, Seksyen 51A,', 15, yPosition);
  yPosition += 4;
  doc.text('46100 Petaling Jaya, Selangor, Malaysia.', 15, yPosition);
  yPosition += 4;
  doc.text('+603 6043 0000', 15, yPosition);
  yPosition += 8;

  // Inspector details
  const formattedDate = new Date(data.inspectionDate).toLocaleDateString('en-GB');
  doc.text(`Inspected by: ${data.inspectedBy}`, 15, yPosition);
  doc.text(`Date of Inspection: ${formattedDate}`, pageWidth / 2, yPosition);
  yPosition += 5;
  doc.text(`Designation: ${data.designation}`, 15, yPosition);
  yPosition += 10;

  // Section 2: Inspection table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Section 2: First Aid Kits Inspection', 15, yPosition);
  yPosition += 5;

  // Process each kit
  data.kits.forEach((kit, kitIndex) => {
    if (kitIndex > 0) {
      yPosition += 8; // Add space between kits
    }

    // Kit header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Kit #${kit.no}: ${kit.model} - ${kit.location} (${kit.modelNo})`, 15, yPosition);
    yPosition += 5;

    // Create table for this kit
    const tableData = kit.items.map((item: any, idx: number) => {
      const expiryDate = item.expiryDateOption === 'date' && item.expiryDate
        ? new Date(item.expiryDate).toLocaleDateString('en-GB')
        : 'N/A';
      return [
        (idx + 1).toString(),
        item.name,
        item.status || '',
        expiryDate,
        item.quantity || '',
      ];
    });

    // Add remarks row
    tableData.push(['', `Remarks: ${kit.remarks || 'None'}`, '', '', '']);

    autoTable(doc, {
      startY: yPosition,
      head: [['No', 'Item Name', 'Status', 'Expiry Date', 'Quantity']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 6,
        cellPadding: 1,
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: 10, right: 10 },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 2;

    // Check if we need a new page
    if (yPosition > 180 && kitIndex < data.kits.length - 1) {
      doc.addPage();
      yPosition = 20;
    }
  });

  // Add reviewer information if available
  if (data.reviewedBy && data.reviewedAt) {
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Check if we need a new page for review section
    if (yPosition > 170) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Section 3: Review Information', 15, yPosition);
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const reviewedDate = new Date(data.reviewedAt).toLocaleDateString('en-GB');
    doc.text(`Reviewed by: ${data.reviewedBy}`, 15, yPosition);
    doc.text(`Date of Review: ${reviewedDate}`, pageWidth / 2, yPosition);

    // Add reviewer signature if available
    if (data.reviewerSignature) {
      yPosition += 5;
      doc.text('Signature:', 15, yPosition);
      yPosition += 2;
      const img = new Image();
      img.src = data.reviewerSignature;
      doc.addImage(img, 'PNG', 15, yPosition, 40, 15);
    }
  }

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
