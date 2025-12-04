// src/components/PDFViewer.tsx
// PDF Viewer Component for displaying inspection PDFs in a box

import React, { useEffect, useState } from 'react';
import { FileText, Download, ZoomIn, ZoomOut } from 'lucide-react';
import jsPDF from 'jspdf';

interface PDFViewerProps {
  pdfDocument: jsPDF;
  title?: string;
  showDownloadButton?: boolean;
  height?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfDocument,
  title = 'Inspection Document',
  showDownloadButton = true,
  height = '600px',
}) => {
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [zoom, setZoom] = useState<number>(100);

  useEffect(() => {
    if (pdfDocument) {
      // Convert PDF to data URL for display
      const dataUrl = pdfDocument.output('dataurlstring');
      setPdfDataUrl(dataUrl);
    }
  }, [pdfDocument]);

  const handleDownload = () => {
    if (pdfDocument) {
      pdfDocument.save(`${title.replace(/\s+/g, '_')}.pdf`);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-purple-100 text-xs">PDF Preview</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Download Button */}
          {showDownloadButton && (
            <button
              onClick={handleDownload}
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="bg-gray-100 p-4" style={{ height }}>
        <div className="bg-white rounded-lg shadow-inner h-full overflow-auto">
          {pdfDataUrl ? (
            <iframe
              src={pdfDataUrl}
              className="w-full h-full border-0"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                width: `${100 / (zoom / 100)}%`,
                height: `${100 / (zoom / 100)}%`,
              }}
              title={title}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading PDF...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          Use the zoom controls to adjust the view • Click Download to save the PDF
        </p>
      </div>
    </div>
  );
};

export default PDFViewer;
