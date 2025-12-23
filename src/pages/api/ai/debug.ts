/**
 * Simple debug endpoint to test API routes
 */

import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return basic info without any external calls
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      aiDeploymentType: process.env.AI_DEPLOYMENT_TYPE || 'not set',
      aiModelEndpoint: process.env.AI_MODEL_ENDPOINT ? 'configured' : 'not set',
    },
  });
}
