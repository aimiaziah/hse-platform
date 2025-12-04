// API endpoint for HSE Observation export (Excel only - now uses template)
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateHSEObservationExcel, type HSEObservationFormData } from '@/utils/hseObservationExport';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      observation,
      location,
      observedBy,
      observedDate,
      actionNeeded,
      hazards,
      remarks,
      status,
      photos,
      itemNo,
      categoryName,
      itemName,
      reviewedBy,
      reviewedAt,
      reviewerSignature,
      format = 'excel',
    } = req.body;

    // Use template-based Excel generation
    const observationData: HSEObservationFormData = {
      contractor: observedBy || 'N/A',
      location: location || 'N/A',
      date: observedDate || new Date().toISOString().split('T')[0],
      inspectedBy: observedBy || 'N/A',
      workActivity: '',
      observations: [{
        id: '1',
        itemNo: itemNo || '1',
        categoryId: 1,
        categoryName: categoryName || 'General',
        itemName: itemName || 'Observation',
        photos: photos || [],
        observation: observation || '',
        location: location || '',
        actionNeeded: actionNeeded || '',
        time: new Date().toLocaleTimeString(),
        date: observedDate || new Date().toISOString().split('T')[0],
        status: status || 'Open',
        hazards: hazards || '',
        remarks: remarks || '',
      }],
      preparedBy: observedBy || '',
      preparedDate: observedDate || '',
      reviewedBy: reviewedBy || '',
      reviewedDate: reviewedAt || '',
    };

    // Generate Excel using template
    const workbook = await generateHSEObservationExcel(observationData);
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="HSE_Observation_${location}_${observedDate}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('HSE Observation export error:', error);
    return res.status(500).json({ error: 'Failed to generate export' });
  }
}
