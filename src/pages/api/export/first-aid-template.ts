// API endpoint for First Aid Kit template export (Excel)
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateFirstAidExcel } from '@/utils/firstAidExcelExport';

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

// Increase body size limit to handle signature and image data
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[First Aid Export] Starting export...');
    const formData: FirstAidInspectionData = req.body;

    // Validate required fields
    if (!formData.inspectedBy || !formData.inspectionDate || !formData.designation) {
      console.error('[First Aid Export] Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: inspectedBy, inspectionDate, designation',
      });
    }

    // Ensure kits array exists
    if (!Array.isArray(formData.kits)) {
      console.warn('[First Aid Export] kits is not an array, defaulting to []');
      formData.kits = [];
    }

    console.log('[First Aid Export] Generating Excel...');

    // Generate Excel using the first aid excel export utility
    const workbook = await generateFirstAidExcel(formData);
    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `First_Aid_${formData.inspectionDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', (buffer as Buffer).length);
    res.status(200).send(buffer);

    console.log('[First Aid Export] Export completed successfully');
  } catch (error) {
    console.error('First Aid export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error stack:', errorStack);
    return res.status(500).json({
      error: 'Failed to generate export',
      message: errorMessage,
      details: errorStack,
    });
  }
}
