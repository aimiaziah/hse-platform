// src/components/PDFJSViewer.tsx
// PDF.js Viewer Component for Supervisor Review Section
// Dynamically loads PDF.js viewer in an iframe for displaying inspection PDFs

import React, { useEffect, useRef, useState } from 'react';

interface PDFJSViewerProps {
  pdfUrl: string;
  viewerPath?: string;
  enablePrint?: boolean;
  enableDownload?: boolean;
  showToolbar?: boolean;
  height?: string;
  onError?: (error: string) => void;
  onLoad?: () => void;
}

const PDFJSViewer: React.FC<PDFJSViewerProps> = ({
  pdfUrl,
  viewerPath = '/pdf-viewer/web/viewer.html',
  enablePrint = true,
  enableDownload = true,
  showToolbar = true,
  height = '800px',
  onError,
  onLoad
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      const errorMsg = 'No PDF URL provided';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    // Validate PDF URL for security
    if (!isValidPdfUrl(pdfUrl)) {
      const errorMsg = 'Invalid or insecure PDF URL';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    // Build viewer URL with parameters
    const viewerUrl = buildViewerUrl(viewerPath, pdfUrl, {
      enablePrint,
      enableDownload,
      showToolbar
    });

    // Create iframe element
    const iframe = document.createElement('iframe');
    iframe.src = viewerUrl;
    iframe.title = 'PDF Viewer';
    iframe.className = 'w-full h-full border-0';
    iframe.allow = 'fullscreen';
    iframe.setAttribute('allowfullscreen', 'true');

    // Handle iframe load event
    iframe.onload = () => {
      setLoading(false);
      setError(null);
      onLoad?.();
    };

    // Handle iframe error event
    iframe.onerror = () => {
      setLoading(false);
      const errorMsg = 'Failed to load PDF viewer';
      setError(errorMsg);
      onError?.(errorMsg);
    };

    // Clear container and append iframe
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(iframe);
    }

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [pdfUrl, viewerPath, enablePrint, enableDownload, showToolbar, onError, onLoad]);

  return (
    <div
      id="document-review-area"
      ref={containerRef}
      className="pdf-viewer-container relative w-full bg-gray-700 rounded-lg overflow-hidden shadow-lg"
      style={{ height }}
    >
      {loading && (
        <div className="pdf-loading absolute inset-0 flex items-center justify-center bg-gray-700">
          <div className="text-center text-white">
            <div className="pdf-loading-spinner inline-block animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mb-4" />
            <p className="text-lg font-medium">Loading PDF...</p>
            <p className="text-sm text-gray-300 mt-2">Please wait while the document loads</p>
          </div>
        </div>
      )}

      {error && (
        <div className="pdf-error absolute inset-0 flex items-center justify-center bg-white">
          <div className="text-center p-6 max-w-md">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading PDF
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Builds the PDF.js viewer URL with query parameters
 */
function buildViewerUrl(
  viewerPath: string,
  pdfUrl: string,
  config: {
    enablePrint: boolean;
    enableDownload: boolean;
    showToolbar: boolean;
  }
): string {
  const params = new URLSearchParams();

  // Encode PDF URL to prevent injection attacks
  params.set('file', encodeURIComponent(pdfUrl));

  // Configure viewer features
  if (!config.showToolbar) {
    params.set('toolbar', '0');
  }
  if (!config.enablePrint) {
    params.set('print', 'false');
  }
  if (!config.enableDownload) {
    params.set('download', 'false');
  }

  return `${viewerPath}?${params.toString()}`;
}

/**
 * Security: Validates PDF URL to prevent XSS and injection attacks
 */
function isValidPdfUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    // Allow data URLs (for blob PDFs)
    if (url.startsWith('data:application/pdf')) {
      return true;
    }

    // Allow blob URLs
    if (url.startsWith('blob:')) {
      return true;
    }

    // Parse and validate HTTP(S) URLs
    const parsed = new URL(url, window.location.origin);

    // Only allow HTTPS, HTTP (same-origin), or same-origin URLs
    return (
      parsed.protocol === 'https:' ||
      parsed.protocol === 'http:' ||
      parsed.origin === window.location.origin
    );
  } catch {
    return false;
  }
}

/**
 * Helper function for standalone usage (non-React)
 * Dynamically loads a PDF into the PDF.js viewer
 */
export function loadSupervisorPDF(
  pdfUrl: string,
  options: {
    viewerPath?: string;
    enablePrint?: boolean;
    enableDownload?: boolean;
    showToolbar?: boolean;
  } = {}
): HTMLIFrameElement | null {
  const container = document.getElementById('document-review-area');

  if (!container) {
    console.error('Container with ID "document-review-area" not found');
    return null;
  }

  // Configuration with defaults
  const config = {
    viewerPath: options.viewerPath || '/pdf-viewer/web/viewer.html',
    enablePrint: options.enablePrint !== false,
    enableDownload: options.enableDownload !== false,
    showToolbar: options.showToolbar !== false,
  };

  // Validate PDF URL
  if (!isValidPdfUrl(pdfUrl)) {
    console.error('Invalid or insecure PDF URL:', pdfUrl);
    showError(container, 'Invalid PDF URL - Security check failed');
    return null;
  }

  // Build viewer URL
  const viewerUrl = buildViewerUrl(config.viewerPath, pdfUrl, config);

  // Show loading state
  showLoading(container);

  // Create and configure iframe
  const iframe = document.createElement('iframe');
  iframe.src = viewerUrl;
  iframe.title = 'PDF Viewer';
  iframe.className = 'w-full h-full border-0';
  iframe.allow = 'fullscreen';
  iframe.setAttribute('allowfullscreen', 'true');

  // Handle load event
  iframe.onload = () => {
    hideLoading(container);
  };

  // Handle error event
  iframe.onerror = () => {
    hideLoading(container);
    showError(container, 'Failed to load PDF viewer');
  };

  // Clear container and append iframe
  container.innerHTML = '';
  container.appendChild(iframe);

  return iframe;
}

/**
 * Shows loading indicator (for standalone usage)
 */
function showLoading(container: HTMLElement): void {
  const loading = document.createElement('div');
  loading.className = 'pdf-loading absolute inset-0 flex items-center justify-center bg-gray-700';
  loading.id = 'pdf-loading-indicator';
  loading.innerHTML = `
    <div class="text-center text-white">
      <div class="pdf-loading-spinner inline-block animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mb-4"></div>
      <p class="text-lg font-medium">Loading PDF...</p>
    </div>
  `;
  container.appendChild(loading);
}

/**
 * Hides loading indicator (for standalone usage)
 */
function hideLoading(container: HTMLElement): void {
  const loading = document.getElementById('pdf-loading-indicator');
  if (loading) {
    loading.remove();
  }
}

/**
 * Shows error message (for standalone usage)
 */
function showError(container: HTMLElement, message: string): void {
  const error = document.createElement('div');
  error.className = 'pdf-error absolute inset-0 flex items-center justify-center bg-white';
  error.innerHTML = `
    <div class="text-center p-6 max-w-md">
      <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading PDF</h3>
      <p class="text-gray-600">${message}</p>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(error);
}

export default PDFJSViewer;
