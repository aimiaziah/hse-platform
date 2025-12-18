// API endpoint for Fire Extinguisher template export (Excel)
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  exportFireExtinguisherWithTemplate,
  type FireExtinguisherFormData,
} from '@/utils/templateExport';

// Increase body size limit to handle signature data
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
    console.log('[Fire Extinguisher Export] Starting export...');
    const formData: FireExtinguisherFormData = req.body;

    // Validate required fields
    if (!formData.inspectedBy || !formData.inspectionDate || !formData.designation) {
      console.error('[Fire Extinguisher Export] Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields: inspectedBy, inspectionDate, designation',
      });
    }

    // Ensure extinguishers array exists
    if (!Array.isArray(formData.extinguishers)) {
      console.warn('[Fire Extinguisher Export] extinguishers is not an array, defaulting to []');
      formData.extinguishers = [];
    }

    console.log('[Fire Extinguisher Export] Generating Excel...');

    // Generate Excel using the template export utility
    const blob = await exportFireExtinguisherWithTemplate(formData);

    // Convert blob to buffer
    const buffer = Buffer.from(await blob.arrayBuffer());

    const filename = `Fire_Extinguisher_${formData.inspectionDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);

    console.log('[Fire Extinguisher Export] Export completed successfully');
  } catch (error) {
    console.error('Fire Extinguisher export error:', error);
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
