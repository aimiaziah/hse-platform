// src/components/ExcelViewer.tsx
// Excel Viewer Component for displaying inspection Excel files in a table format
/* eslint-disable react/no-array-index-key */
import React, { useEffect, useState, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ExcelJS from 'exceljs';

interface ExcelViewerProps {
  excelData: ArrayBuffer | Blob;
  title?: string;
  showDownloadButton?: boolean;
  showZoomControls?: boolean;
  height?: string;
  filename?: string;
  showHeader?: boolean;
  zoom?: number;
}

interface CellData {
  value: unknown;
  style: {
    font: unknown;
    fill: unknown;
    alignment: unknown;
    border: unknown;
  };
  isHidden: boolean;
  mergeInfo?: { rowspan: number; colspan: number };
}

interface SheetData {
  name: string;
  rows: CellData[][];
  mergedCells: { [key: string]: { rowspan: number; colspan: number } };
}
const ExcelViewer: React.FC<ExcelViewerProps> = ({
  excelData,
  title = 'Inspection Document',
  showDownloadButton = true,
  showZoomControls = true,
  height = '600px',
  filename = 'inspection.xlsx',
  showHeader = true,
  zoom: externalZoom,
}) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [internalZoom, setInternalZoom] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Use external zoom if provided, otherwise use internal zoom
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;

  const parseExcel = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Validate input data
      if (!excelData) {
        throw new Error('No Excel data provided');
      }

      const workbook = new ExcelJS.Workbook();
      // Convert Blob to ArrayBuffer if needed
      let buffer: ArrayBuffer;
      if (excelData instanceof Blob) {
        buffer = await excelData.arrayBuffer();
      } else {
        buffer = excelData;
      }

      // Validate buffer
      if (!buffer || buffer.byteLength === 0) {
        throw new Error('Excel data is empty or invalid');
      }

      console.log(`[ExcelViewer] Loading Excel file (${buffer.byteLength} bytes)...`);
      await workbook.xlsx.load(buffer);
      const parsedSheets: SheetData[] = [];
      workbook.eachSheet((worksheet) => {
        const rows: CellData[][] = [];
        const mergedCells: { [key: string]: { rowspan: number; colspan: number } } = {};
        // Parse merged cells
        if (worksheet.model.merges) {
          worksheet.model.merges.forEach((merge: string) => {
            // merge is in format like "A1:B2"
            const [start, end] = merge.split(':');
            const startCell = worksheet.getCell(start);
            const endCell = worksheet.getCell(end);
            const rowspan = Number(endCell.row) - Number(startCell.row) + 1;
            const colspan = Number(endCell.col) - Number(startCell.col) + 1;
            mergedCells[`${startCell.row}-${startCell.col}`] = { rowspan, colspan };
          });
        }
        // Parse rows and cells
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const rowData: CellData[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            // Check if this cell is part of a merged cell (but not the top-left)
            let isHidden = false;
            Object.entries(mergedCells).forEach(([key, value]) => {
              const [startRow, startCol] = key.split('-').map(Number);
              if (
                rowNumber >= startRow &&
                rowNumber < startRow + value.rowspan &&
                colNumber >= startCol &&
                colNumber < startCol + value.colspan &&
                !(rowNumber === startRow && colNumber === startCol)
              ) {
                isHidden = true;
              }
            });
            const cellData: CellData = {
              value: cell.value,
              style: {
                font: cell.font,
                fill: cell.fill,
                alignment: cell.alignment,
                border: cell.border,
              },
              isHidden,
              mergeInfo: mergedCells[`${rowNumber}-${colNumber}`],
            };
            rowData.push(cellData);
          });
          rows.push(rowData);
        });
        parsedSheets.push({
          name: worksheet.name,
          rows,
          mergedCells,
        });
      });
      if (parsedSheets.length === 0) {
        throw new Error('No worksheets found in Excel file');
      }

      console.log(`[ExcelViewer] Successfully parsed ${parsedSheets.length} sheet(s)`);
      setSheets(parsedSheets);
      setLoading(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ExcelViewer] Error parsing Excel:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to parse Excel file';
      setError(`Failed to load Excel: ${errorMsg}`);
      setLoading(false);
    }
  }, [excelData]);

  useEffect(() => {
    parseExcel();
  }, [parseExcel]);
  const handleDownload = () => {
    if (excelData) {
      const blob = excelData instanceof Blob ? excelData : new Blob([excelData]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };
  const handleZoomIn = () => {
    setInternalZoom((prev) => Math.min(prev + 10, 200));
  };
  const handleZoomOut = () => {
    setInternalZoom((prev) => Math.max(prev - 10, 50));
  };
  const handlePrevSheet = () => {
    setCurrentSheetIndex((prev) => Math.max(0, prev - 1));
  };
  const handleNextSheet = () => {
    setCurrentSheetIndex((prev) => Math.min(sheets.length - 1, prev + 1));
  };
  const getCellValue = (cell: CellData): string => {
    if (!cell.value) return '';
    if (typeof cell.value === 'object' && cell.value !== null) {
      const val = cell.value as Record<string, unknown>;
      if (val.richText && Array.isArray(val.richText)) {
        return val.richText.map((rt: Record<string, unknown>) => rt.text).join('');
      }
      if (val.formula) {
        return (val.result as { toString(): string })?.toString() || '';
      }
      if (val.text) {
        return String(val.text);
      }
    }
    return String(cell.value);
  };
  const getCellStyle = (cell: CellData): React.CSSProperties => {
    const style: React.CSSProperties = {
      padding: '8px 12px',
      border: '1px solid #e5e7eb',
      textAlign: 'left',
      verticalAlign: 'middle',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
    };
    if (cell.style) {
      // Font styling
      const font = cell.style.font as Record<string, unknown> | undefined;
      if (font) {
        if (font.bold) style.fontWeight = 'bold';
        if (font.italic) style.fontStyle = 'italic';
        if (font.size) style.fontSize = `${font.size}px`;
        const color = font.color as Record<string, unknown> | undefined;
        if (color?.argb && typeof color.argb === 'string') {
          style.color = `#${color.argb.substring(2)}`;
        }
      }
      // Background color
      const fill = cell.style.fill as Record<string, unknown> | undefined;
      const fgColor = fill?.fgColor as Record<string, unknown> | undefined;
      if (fgColor?.argb && typeof fgColor.argb === 'string') {
        style.backgroundColor = `#${fgColor.argb.substring(2)}`;
      }
      // Alignment
      const alignment = cell.style.alignment as Record<string, string> | undefined;
      if (alignment) {
        if (alignment.horizontal) {
          style.textAlign = alignment.horizontal as React.CSSProperties['textAlign'];
        }
        if (alignment.vertical) {
          style.verticalAlign = alignment.vertical as React.CSSProperties['verticalAlign'];
        }
      }
    }
    return style;
  };
  const currentSheet = sheets[currentSheetIndex];
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
      {/* Header */}
      {showHeader && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-green-100 text-xs">Excel Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sheet Navigation */}
            {sheets.length > 1 && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevSheet}
                  disabled={currentSheetIndex === 0}
                  className="p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous Sheet"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">
                  {currentSheet?.name || 'Sheet'} ({currentSheetIndex + 1}/{sheets.length})
                </span>
                <button
                  type="button"
                  onClick={handleNextSheet}
                  disabled={currentSheetIndex === sheets.length - 1}
                  className="p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next Sheet"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Zoom Controls */}
            {showZoomControls && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">{zoom}%</span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Download Button */}
            {showDownloadButton && (
              <button
                type="button"
                onClick={handleDownload}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
          </div>
        </div>
      )}
      {/* Excel Viewer */}
      <div className="bg-gray-100 p-4" style={{ height }}>
        <div className="bg-white rounded-lg shadow-inner h-full overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading Excel...</p>
              </div>
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md p-6">
                <FileSpreadsheet className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-semibold mb-2">Excel Preview Error</p>
                <p className="text-red-500 text-sm mb-4">{error}</p>
                <p className="text-gray-600 text-xs">
                  Please check the browser console for more details or try generating the file
                  again.
                </p>
              </div>
            </div>
          )}
          {!loading && !error && currentSheet && (
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                width: `${100 / (zoom / 100)}%`,
                height: `${100 / (zoom / 100)}%`,
              }}
            >
              <table className="border-collapse" style={{ width: 'auto', minWidth: '100%' }}>
                <tbody>
                  {currentSheet.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((cell, colIndex) => {
                        if (cell.isHidden) return null;
                        return (
                          <td
                            key={`cell-${rowIndex}-${colIndex}`}
                            style={getCellStyle(cell)}
                            rowSpan={cell.mergeInfo?.rowspan || 1}
                            colSpan={cell.mergeInfo?.colspan || 1}
                          >
                            {getCellValue(cell)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && !currentSheet && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No sheets to display</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Footer Info */}
      {showHeader && (
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            {(() => {
              const parts: string[] = [];
              if (showZoomControls) {
                parts.push('Use the zoom controls to adjust the view');
              }
              if (sheets.length > 1) {
                parts.push('Navigate between sheets using the arrow buttons');
              }
              if (showDownloadButton) {
                parts.push('Click Download to save the Excel file');
              }
              return parts.join(' • ');
            })()}
          </p>
        </div>
      )}
    </div>
  );
};
export default ExcelViewer;
