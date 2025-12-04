// Health Check Endpoint
// Returns application health status and database connectivity
import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: 'connected' | 'disconnected';
  version: string;
  uptime?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      version: '1.0.0',
      error: 'Method not allowed',
    });
  }

  try {
    // Check database connection by querying users table
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Calculate uptime in seconds
    const uptime = process.uptime();

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      uptime: Math.floor(uptime),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      error: errorMessage,
    });
  }
}
