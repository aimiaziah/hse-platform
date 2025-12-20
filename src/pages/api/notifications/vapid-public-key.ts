// =====================================================
// API: Get VAPID Public Key
// =====================================================
// GET /api/notifications/vapid-public-key
// Returns the public VAPID key for push subscriptions
// =====================================================

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).json({
      error: 'VAPID public key not configured',
      message: 'Run: node scripts/generate-vapid-keys.js',
    });
  }

  return res.status(200).json({
    publicKey,
  });
}
