// API endpoint for Manhours Report export (Excel + PDF)
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateManhoursExcel } from '@/utils/manhoursExcelExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      preparedBy,
      preparedDate,
      reviewedBy,
      reviewedAt,
      reportMonth,
      reportYear,
      numEmployees,
      monthlyManHours,
      yearToDateManHours,
      totalAccumulatedManHours,
      annualTotalManHours,
      workdaysLost,
      ltiCases,
      noLTICases,
      nearMissAccidents,
      dangerousOccurrences,
      occupationalDiseases,
      formulaLtiCases,
      formulaAnnualAvgEmployees,
      formulaAnnualTotalManHours,
      formulaWorkdaysLost,
      projectName,
      monthlyData,
      remarks,
      reviewerSignature,
      format = 'excel',
    } = req.body;

    const reportData = {
      id: Date.now().toString(),
      preparedBy: preparedBy || '',
      preparedDate: preparedDate || new Date().toISOString(),
      reviewedBy: reviewedBy || '',
      reviewedDate: reviewedAt || '',
      reportMonth: reportMonth || '',
      reportYear: reportYear || new Date().getFullYear().toString(),
      numEmployees: numEmployees || '0',
      monthlyManHours: monthlyManHours || '0',
      yearToDateManHours: yearToDateManHours || '0',
      totalAccumulatedManHours: totalAccumulatedManHours || '0',
      annualTotalManHours: annualTotalManHours || '0',
      workdaysLost: workdaysLost || '0',
      ltiCases: ltiCases || '0',
      noLTICases: noLTICases || '0',
      nearMissAccidents: nearMissAccidents || '0',
      dangerousOccurrences: dangerousOccurrences || '0',
      occupationalDiseases: occupationalDiseases || '0',
      formulaLtiCases: formulaLtiCases || '0',
      formulaAnnualAvgEmployees: formulaAnnualAvgEmployees || '0',
      formulaAnnualTotalManHours: formulaAnnualTotalManHours || '0',
      formulaWorkdaysLost: formulaWorkdaysLost || '0',
      projectName: projectName || '',
      monthlyData: monthlyData || [],
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      remarks: remarks || '',
    };

    if (format === 'pdf') {
      // Generate PDF version
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('MONTHLY MANHOURS REPORT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Report period
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report Period: ${reportMonth} ${reportYear}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Header info
      doc.setFontSize(10);
      doc.text(`Prepared By: ${preparedBy}`, 15, yPos);
      doc.text(`Date: ${new Date(preparedDate).toLocaleDateString()}`, pageWidth - 15, yPos, { align: 'right' });
      yPos += 10;

      if (reviewedBy) {
        doc.text(`Reviewed By: ${reviewedBy}`, 15, yPos);
        doc.text(`Date: ${reviewedAt ? new Date(reviewedAt).toLocaleDateString() : ''}`, pageWidth - 15, yPos, { align: 'right' });
        yPos += 10;
      }

      yPos += 5;

      // Statistics table
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Safety Statistics', 15, yPos);
      yPos += 5;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['No. of Employees', numEmployees],
          ['Monthly Man-hours', monthlyManHours],
          ['Year to Date Man-hours', yearToDateManHours],
          ['Total Accumulated Man-hours', totalAccumulatedManHours],
          ['Workdays Lost', workdaysLost],
          ['LTI Cases', ltiCases],
          ['No LTI Cases', noLTICases],
          ['Near Miss Accidents', nearMissAccidents],
          ['Dangerous Occurrences', dangerousOccurrences],
          ['Occupational Diseases', occupationalDiseases],
        ],
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        margin: { left: 15, right: 15 },
      });

      // Get the final Y position after the table
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Monthly data if available
      if (monthlyData && monthlyData.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Data', 15, yPos);
        yPos += 5;

        const monthlyTableData = monthlyData.map((m: any) => [
          m.month,
          m.manPower || '0',
          m.manHours || '0',
          m.accidents || '0',
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Month', 'Man Power', 'Man Hours', 'Accidents']],
          body: monthlyTableData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: 255 },
          margin: { left: 15, right: 15 },
        });
      }

      // Footer with signature
      const finalY = (doc as any).lastAutoTable?.finalY || yPos;
      if (finalY + 40 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos = finalY + 20;
      }

      if (reviewerSignature) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('Digitally signed and approved', 15, yPos);
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Manhours_Report_${reportMonth}_${reportYear}.pdf"`);
      return res.send(pdfBuffer);
    }

    // Generate Excel using the template-based utility from Supabase
    const workbook = await generateManhoursExcel(reportData);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Manhours_Report_${reportMonth}_${reportYear}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Manhours report export error:', error);
    return res.status(500).json({
      error: 'Failed to generate export',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
