// src/pages/api/analytics/web-vitals.ts
import { NextApiRequest, NextApiResponse } from 'next';

interface WebVitalMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const metric: WebVitalMetric = req.body;

    // Validate metric
    if (!metric.name || !metric.value) {
      return res.status(400).json({ error: 'Invalid metric data' });
    }

    // Store in localStorage (for demo)
    // In production, you would send to a real analytics service or database
    const metricsKey = 'web-vitals-metrics';
    const existingMetrics = JSON.parse(
      (req.headers.cookie?.match(new RegExp(`${metricsKey}=([^;]+)`)) || [])[1] || '[]'
    );

    const newMetric = {
      ...metric,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      url: req.headers.referer,
    };

    existingMetrics.push(newMetric);

    // Keep only last 100 metrics
    if (existingMetrics.length > 100) {
      existingMetrics.shift();
    }

    // For demo purposes, log to console
    console.log('📊 Core Web Vital:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
    });

    return res.status(200).json({ success: true, metric: newMetric });
  } catch (error) {
    console.error('Web vitals tracking error:', error);
    return res.status(500).json({ error: 'Failed to track metric' });
  }
}
