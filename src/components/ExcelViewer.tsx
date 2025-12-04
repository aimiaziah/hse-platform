// src/components/ExcelViewer.tsx
// Excel Viewer Component for displaying inspection Excel files in a table format

import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import ExcelJS from 'exceljs';

interface ExcelViewerProps {
  excelData: ArrayBuffer | Blob;
  title?: string;
  showDownloadButton?: boolean;
  height?: string;
  filename?: string;
}

interface SheetData {
  name: string;
  rows: any[][];
  mergedCells: { [key: string]: { rowspan: number; colspan: number } };
}

const ExcelViewer: React.FC<ExcelViewerProps> = ({
  excelData,
  title = 'Inspection Document',
  showDownloadButton = true,
  height = '600px',
  filename = 'inspection.xlsx',
}) => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [zoom, setZoom] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    parseExcel();
  }, [excelData]);

  const parseExcel = async () => {
    try {
      setLoading(true);
      setError('');

      const workbook = new ExcelJS.Workbook();

      // Convert Blob to ArrayBuffer if needed
      let buffer: ArrayBuffer;
      if (excelData instanceof Blob) {
        buffer = await excelData.arrayBuffer();
      } else {
        buffer = excelData;
      }

      await workbook.xlsx.load(buffer);

      const parsedSheets: SheetData[] = [];

      workbook.eachSheet((worksheet) => {
        const rows: any[][] = [];
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
          const rowData: any[] = [];

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

            const cellData = {
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

      setSheets(parsedSheets);
      setLoading(false);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setError('Failed to parse Excel file');
      setLoading(false);
    }
  };

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
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handlePrevSheet = () => {
    setCurrentSheetIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextSheet = () => {
    setCurrentSheetIndex((prev) => Math.min(sheets.length - 1, prev + 1));
  };

  const getCellValue = (cell: any): string => {
    if (!cell.value) return '';

    if (typeof cell.value === 'object') {
      if (cell.value.richText) {
        return cell.value.richText.map((rt: any) => rt.text).join('');
      }
      if (cell.value.formula) {
        return cell.value.result?.toString() || '';
      }
      if (cell.value.text) {
        return cell.value.text;
      }
    }

    return cell.value.toString();
  };

  const getCellStyle = (cell: any): React.CSSProperties => {
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
      if (cell.style.font) {
        if (cell.style.font.bold) style.fontWeight = 'bold';
        if (cell.style.font.italic) style.fontStyle = 'italic';
        if (cell.style.font.size) style.fontSize = `${cell.style.font.size}px`;
        if (cell.style.font.color?.argb) {
          const color = cell.style.font.color.argb;
          style.color = `#${color.substring(2)}`;
        }
      }

      // Background color
      if (cell.style.fill?.fgColor?.argb) {
        const bgColor = cell.style.fill.fgColor.argb;
        style.backgroundColor = `#${bgColor.substring(2)}`;
      }

      // Alignment
      if (cell.style.alignment) {
        if (cell.style.alignment.horizontal) {
          style.textAlign = cell.style.alignment.horizontal;
        }
        if (cell.style.alignment.vertical) {
          style.verticalAlign = cell.style.alignment.vertical;
        }
      }
    }

    return style;
  };

  const currentSheet = sheets[currentSheetIndex];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
      {/* Header */}
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

      {/* Excel Viewer */}
      <div className="bg-gray-100 p-4" style={{ height }}>
        <div className="bg-white rounded-lg shadow-inner h-full overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading Excel...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileSpreadsheet className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-500 font-medium">{error}</p>
              </div>
            </div>
          ) : currentSheet ? (
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
                    <tr key={rowIndex}>
                      {row.map((cell, colIndex) => {
                        if (cell.isHidden) return null;

                        return (
                          <td
                            key={colIndex}
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
          ) : (
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
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          Use the zoom controls to adjust the view
          {sheets.length > 1 && ' • Navigate between sheets using the arrow buttons'}
          {showDownloadButton && ' • Click Download to save the Excel file'}
        </p>
      </div>
    </div>
  );
};

export default ExcelViewer;
