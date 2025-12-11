// src/pages/_app.tsx
import '@/styles/globals.css';

import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { initializeDemoData } from '@/utils/initDemoData';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize demo data on first load
    initializeDemoData();

    // Register service worker (only in production)
    if (
      process.env.NODE_ENV === 'production' &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </>
  );
}

// Report Core Web Vitals
export function reportWebVitals(metric: any) {
  // Log to console (development)
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }

  // Send to analytics (production)
  if (process.env.NODE_ENV === 'production') {
    // Option 1: Send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Option 2: Send to your own analytics API
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch((err) => console.error('Failed to send web vitals:', err));
  }
}

export default MyApp;
