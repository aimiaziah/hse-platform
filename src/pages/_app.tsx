// src/pages/_app.tsx
import '@/styles/globals.css';

// IBM Plex Sans font imports - optimized for inspection platform
// Import only the weights we need for better performance
import '@fontsource/ibm-plex-sans/400'; // Regular - body text
import '@fontsource/ibm-plex-sans/400-italic'; // Regular Italic
import '@fontsource/ibm-plex-sans/500'; // Medium - emphasis
import '@fontsource/ibm-plex-sans/600'; // SemiBold - headings
import '@fontsource/ibm-plex-sans/700'; // Bold - strong emphasis

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
        .then(() => {
          // Service Worker registered successfully
        })
        .catch(() => {
          // Service worker registration failed
        });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Theta HSE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </>
  );
}

// Report Core Web Vitals
export function reportWebVitals(metric: {
  name: string;
  value: number;
  id: string;
  delta?: number;
  entries?: PerformanceEntry[];
}) {
  // Log to console (development)
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(metric);
  }

  // Send to analytics (production)
  if (process.env.NODE_ENV === 'production') {
    // Option 1: Send to Google Analytics
    if (typeof window !== 'undefined') {
      const windowWithGtag = window as unknown as {
        gtag?: (event: string, name: string, options: unknown) => void;
      };
      if (windowWithGtag.gtag) {
        windowWithGtag.gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          non_interaction: true,
        });
      }
    }

    // Option 2: Send to your own analytics API
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch(() => {
      // Failed to send web vitals
    });
  }
}

export default MyApp;
