/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import SupervisorLayout from '@/roles/supervisor/layouts/SupervisorLayout';
import ExcelViewer from '@/components/ExcelViewer';

export default function ExcelPreviewPage() {
  const router = useRouter();
  const [excelData, setExcelData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState('inspection.xlsx');
  const [title, setTitle] = useState('Excel Preview');
  const [zoom, setZoom] = useState<number>(100);

  useEffect(() => {
    const loadExcelData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Retrieve inspection data from sessionStorage
        const previewDataStr = sessionStorage.getItem('excelPreviewData');
        if (!previewDataStr) {
          setError('No preview data found. Please try again from the inspection details page.');
          setLoading(false);
          return;
        }

        const previewDataParsed = JSON.parse(previewDataStr);
        const { type, data } = previewDataParsed;

        let apiEndpoint: string;
        let generatedFilename: string;
        let titleText: string;

        // Map type to API endpoint
        switch (type) {
          case 'fire-extinguisher':
            apiEndpoint = '/api/export/fire-extinguisher-template';
            generatedFilename = `Fire_Extinguisher_${data.inspectionDate || 'preview'}.xlsx`;
            titleText = 'Fire Extinguisher Inspection - Excel Preview';
            data.format = 'excel';
            break;

          case 'first-aid':
            apiEndpoint = '/api/export/first-aid-template';
            generatedFilename = `First_Aid_${data.inspectionDate || 'preview'}.xlsx`;
            titleText = 'First Aid Kit Inspection - Excel Preview';
            data.format = 'excel';
            break;

          case 'hse-inspection':
            apiEndpoint = '/api/export/hse-inspection-template';
            generatedFilename = `HSE_Inspection_${data.date || 'preview'}.xlsx`;
            // Use location or a more specific title if available
            titleText = data.location ? `${data.location} Inspection` : 'HSE Inspection';
            data.format = 'excel';
            break;

          case 'hse-observation':
            apiEndpoint = '/api/export/hse-observation-template';
            generatedFilename = `HSE_Observation_${data.observedDate || 'preview'}.xlsx`;
            titleText = 'HSE Observation - Excel Preview';
            data.format = 'excel';
            break;

          case 'manhours':
            apiEndpoint = '/api/export/manhours-template';
            generatedFilename = `Manhours_Report_${data.reportMonth || 'preview'}.xlsx`;
            titleText = 'Manhours Report - Excel Preview';
            data.format = 'excel';
            break;

          default:
            throw new Error(`Unknown inspection type: ${type}`);
        }

        // Call API to generate Excel
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to generate Excel preview');
        }

        const buffer = await response.arrayBuffer();
        setTitle(titleText);
        setExcelData(buffer);
        setFilename(generatedFilename);
        setLoading(false);

        // Clear sessionStorage after loading
        sessionStorage.removeItem('excelPreviewData');
      } catch (err) {
        console.error('Error generating Excel preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate Excel preview');
        setLoading(false);
      }
    };

    loadExcelData();
  }, []);

  const handleClose = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      router.back();
    } else {
      // If no history, close the window or redirect to reviews
      if (window.opener) {
        window.close();
      } else {
        router.push('/supervisor/reviews');
      }
    }
  };

  const handleExport = () => {
    if (excelData) {
      const blob = new Blob([excelData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  return (
    <SupervisorLayout>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header Bar */}
        <div className="bg-white border-b shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleClose}
              className="text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Preview</h1>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Zoom Out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                    />
                  </svg>
                </button>
                <span className="text-xs font-medium text-gray-700 min-w-[45px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Zoom In"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* Loading State */}
          {loading && (
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="h-full flex items-center justify-center bg-white">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-4">
                <svg
                  className="w-12 h-12 text-red-500 mx-auto mb-4"
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
                <h3 className="text-lg font-semibold text-red-800 mb-2 text-center">Error</h3>
                <p className="text-red-600 text-center mb-4">{error}</p>
                <button
                  onClick={() => router.push('/supervisor/reviews')}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Back to Reviews
                </button>
              </div>
            </div>
          )}

          {/* Excel Viewer - Full Spreadsheet View */}
          {!loading && !error && excelData && (
            <div className="h-full w-full overflow-auto p-4">
              <ExcelViewer
                excelData={excelData}
                title={title}
                filename={filename}
                showDownloadButton={false}
                showZoomControls={false}
                showHeader={false}
                height="calc(100vh - 120px)"
                zoom={zoom}
              />
            </div>
          )}
        </div>
      </div>
    </SupervisorLayout>
  );
}
