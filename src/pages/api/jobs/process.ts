// src/pages/api/jobs/process.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { processQueue } from '@/utils/jobProcessor';

/**
 * API endpoint to process pending jobs in the queue
 * Can be called manually or via cron job
 *
 * Usage:
 * - Manual: POST /api/jobs/process
 * - Cron: Set up external cron to call this endpoint every 1-5 minutes
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Optional: Add authentication for production
    // For now, we'll allow any POST request to trigger processing
    // You can add API key validation here:
    // const apiKey = req.headers['x-api-key'];
    // if (apiKey !== process.env.JOB_PROCESSOR_API_KEY) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const maxJobs = parseInt(req.query.maxJobs as string) || 10;

    console.log(`[JobProcessor API] Starting job processing (max: ${maxJobs})...`);

    const result = await processQueue(maxJobs);

    console.log(`[JobProcessor API] Processing complete:`, result);

    return res.status(200).json({
      success: true,
      message: 'Job processing complete',
      result,
    });
  } catch (error: any) {
    console.error('[JobProcessor API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to process jobs',
    });
  }
}
