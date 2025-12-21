// Temporary diagnostic endpoint to check environment variables
// DELETE THIS FILE after debugging
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development or for admins
  const authHeader = req.headers.authorization;

  // Basic protection - require a secret key
  if (req.query.secret !== 'check-env-debug-2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const envCheck = {
    // Microsoft OAuth Config
    NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID
      ? `${process.env.NEXT_PUBLIC_SHAREPOINT_OAUTH_CLIENT_ID.substring(0, 8)}...`
      : 'NOT_SET',
    NEXT_PUBLIC_SHAREPOINT_TENANT_ID: process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID
      ? `${process.env.NEXT_PUBLIC_SHAREPOINT_TENANT_ID.substring(0, 8)}...`
      : 'NOT_SET',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET
      ? 'SET (hidden)'
      : 'NOT_SET',

    // Feature flags
    ENABLE_MICROSOFT_AUTH: process.env.ENABLE_MICROSOFT_AUTH || 'NOT_SET',
    PREFER_MICROSOFT_AUTH: process.env.PREFER_MICROSOFT_AUTH || 'NOT_SET',

    // Auth settings
    ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS || 'NOT_SET',
    ADMIN_EMAIL_WHITELIST: process.env.ADMIN_EMAIL_WHITELIST || 'NOT_SET',

    // Node environment
    NODE_ENV: process.env.NODE_ENV,

    // Build time check
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'NOT_SET',
  };

  res.status(200).json(envCheck);
}
