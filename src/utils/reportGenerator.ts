import { storage } from '@/utils/storage';

interface InspectionData {
  id: string;
  contractor: string;
  location: string;
  inspectedBy: string;
  date: string;
  status: string;
  items: Array<{
    id: string;
    category: string;
    item: string;
    rating: string | null;
    comments: string;
  }>;
  auditLog: Array<{
    timestamp: string;
    user: string;
    action: string;
    details: string;
  }>;
  createdAt: string;
  savedAt?: string;
}

export class ReportGenerator {
  static async generateExcelReport(
    inspections: InspectionData[],
    reportType: 'individual' | 'summary' | 'compliance' = 'summary',
  ) {
    // For browser environment, we'll create a CSV that can be opened in Excel
    let csvContent = '';

    if (reportType === 'individual' && inspections.length === 1) {
      const inspection = inspections[0];
      csvContent = this.generateIndividualInspectionCSV(inspection);
    } else if (reportType === 'compliance') {
      csvContent = this.generateComplianceReportCSV(inspections);
    } else {
      csvContent = this.generateSummaryReportCSV(inspections);
    }

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `inspection-report-${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static generateIndividualInspectionCSV(inspection: InspectionData): string {
    let csv = 'HSE INSPECTION REPORT\n\n';

    // Header information
    csv += 'INSPECTION DETAILS\n';
    csv += `Contractor,${inspection.contractor}\n`;
    csv += `Location,${inspection.location}\n`;
    csv += `Inspector,${inspection.inspectedBy}\n`;
    csv += `Date,${new Date(inspection.date).toLocaleDateString()}\n`;
    csv += `Status,${inspection.status.replace('_', ' ').toUpperCase()}\n`;
    csv += `Submitted,${
      inspection.savedAt ? new Date(inspection.savedAt).toLocaleString() : 'Not submitted'
    }\n\n`;

    // Statistics
    const stats = this.calculateInspectionStats(inspection);
    csv += 'INSPECTION STATISTICS\n';
    csv += `Total Items,${stats.total}\n`;
    csv += `Completed Items,${stats.completed}\n`;
    csv += `Completion Rate,${Math.round((stats.completed / stats.total) * 100)}%\n`;
    csv += `Good Ratings,${stats.good}\n`;
    csv += `Acceptable Ratings,${stats.acceptable}\n`;
    csv += `Poor Ratings,${stats.poor}\n`;
    csv += `Critical Issues,${stats.issues}\n`;
    csv += `Compliance Rate,${Math.round(
      ((stats.good + stats.acceptable) / stats.completed) * 100,
    )}%\n\n`;

    // Detailed inspection items
    csv += 'DETAILED INSPECTION RESULTS\n';
    csv += 'Category,Item,Rating,Comments\n';

    inspection.items.forEach((item) => {
      csv += `"${item.category}","${item.item}","${item.rating || 'Not Rated'}","${
        item.comments || ''
      }"\n`;
    });

    // Critical issues section
    const criticalItems = inspection.items.filter((item) =>
      ['SIN', 'SPS', 'SWO', 'P'].includes(item.rating || ''),
    );
    if (criticalItems.length > 0) {
      csv += '\nCRITICAL ISSUES REQUIRING ATTENTION\n';
      csv += 'Category,Item,Rating,Comments\n';
      criticalItems.forEach((item) => {
        csv += `"${item.category}","${item.item}","${item.rating}","${item.comments || ''}"\n`;
      });
    }

    // Audit trail
    csv += '\nAUDIT TRAIL\n';
    csv += 'Timestamp,User,Action,Details\n';
    inspection.auditLog.forEach((log) => {
      csv += `"${new Date(log.timestamp).toLocaleString()}","${log.user}","${log.action}","${
        log.details
      }"\n`;
    });

    return csv;
  }

  static generateSummaryReportCSV(inspections: InspectionData[]): string {
    let csv = 'HSE INSPECTION SUMMARY REPORT\n\n';

    csv += `Report Generated,${new Date().toLocaleString()}\n`;
    csv += `Total Inspections,${inspections.length}\n\n`;

    // Overall statistics
    let totalItems = 0;
    let completedItems = 0;
    let goodRatings = 0;
    let acceptableRatings = 0;
    let poorRatings = 0;
    let issueRatings = 0;

    inspections.forEach((inspection) => {
      const stats = this.calculateInspectionStats(inspection);
      totalItems += stats.total;
      completedItems += stats.completed;
      goodRatings += stats.good;
      acceptableRatings += stats.acceptable;
      poorRatings += stats.poor;
      issueRatings += stats.issues;
    });

    csv += 'OVERALL STATISTICS\n';
    csv += `Total Items Inspected,${totalItems}\n`;
    csv += `Completed Items,${completedItems}\n`;
    csv += `Good Ratings,${goodRatings}\n`;
    csv += `Acceptable Ratings,${acceptableRatings}\n`;
    csv += `Poor Ratings,${poorRatings}\n`;
    csv += `Critical Issues,${issueRatings}\n`;
    csv += `Overall Compliance Rate,${
      completedItems > 0
        ? Math.round(((goodRatings + acceptableRatings) / completedItems) * 100)
        : 0
    }%\n\n`;

    // Status breakdown
    const statusCounts = inspections.reduce((acc, inspection) => {
      acc[inspection.status] = (acc[inspection.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    csv += 'STATUS BREAKDOWN\n';
    Object.entries(statusCounts).forEach(([status, count]) => {
      csv += `${status.replace('_', ' ').toUpperCase()},${count}\n`;
    });
    csv += '\n';

    // Individual inspection summary
    csv += 'INDIVIDUAL INSPECTION SUMMARY\n';
    csv +=
      'Contractor,Location,Inspector,Date,Status,Total Items,Completed Items,Compliance Rate,Critical Issues\n';

    inspections.forEach((inspection) => {
      const stats = this.calculateInspectionStats(inspection);
      const complianceRate =
        stats.completed > 0
          ? Math.round(((stats.good + stats.acceptable) / stats.completed) * 100)
          : 0;

      csv += `"${inspection.contractor}","${inspection.location}","${inspection.inspectedBy}",`;
      csv += `"${new Date(inspection.date).toLocaleDateString()}","${inspection.status.replace(
        '_',
        ' ',
      )}",`;
      csv += `${stats.total},${stats.completed},${complianceRate}%,${stats.issues}\n`;
    });

    return csv;
  }

  static generateComplianceReportCSV(inspections: InspectionData[]): string {
    let csv = 'HSE COMPLIANCE ANALYSIS REPORT\n\n';

    csv += `Report Generated,${new Date().toLocaleString()}\n`;
    csv += `Analysis Period,${
      inspections.length > 0
        ? `${new Date(
            Math.min(...inspections.map((i) => new Date(i.date).getTime())),
          ).toLocaleDateString()} - ${new Date(
            Math.max(...inspections.map((i) => new Date(i.date).getTime())),
          ).toLocaleDateString()}`
        : 'No data'
    }\n\n`;

    // Category-wise compliance analysis
    const categoryStats: Record<
      string,
      { total: number; good: number; acceptable: number; poor: number; issues: number }
    > = {};

    inspections.forEach((inspection) => {
      inspection.items.forEach((item) => {
        if (!categoryStats[item.category]) {
          categoryStats[item.category] = { total: 0, good: 0, acceptable: 0, poor: 0, issues: 0 };
        }

        if (item.rating) {
          categoryStats[item.category].total++;

          if (item.rating === 'G') categoryStats[item.category].good++;
          else if (item.rating === 'A') categoryStats[item.category].acceptable++;
          else if (item.rating === 'P') categoryStats[item.category].poor++;
          else if (['SIN', 'SPS', 'SWO'].includes(item.rating))
            categoryStats[item.category].issues++;
        }
      });
    });

    csv += 'CATEGORY COMPLIANCE ANALYSIS\n';
    csv += 'Category,Total Items,Good,Acceptable,Poor,Critical Issues,Compliance Rate\n';

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const complianceRate =
        stats.total > 0 ? Math.round(((stats.good + stats.acceptable) / stats.total) * 100) : 0;
      csv += `"${category}",${stats.total},${stats.good},${stats.acceptable},${stats.poor},${stats.issues},${complianceRate}%\n`;
    });

    // Top issues by frequency
    const issueFrequency: Record<string, number> = {};
    inspections.forEach((inspection) => {
      inspection.items.forEach((item) => {
        if (['SIN', 'SPS', 'SWO', 'P'].includes(item.rating || '')) {
          issueFrequency[item.item] = (issueFrequency[item.item] || 0) + 1;
        }
      });
    });

    const topIssues = Object.entries(issueFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    if (topIssues.length > 0) {
      csv += '\nTOP 10 MOST FREQUENT ISSUES\n';
      csv += 'Issue,Frequency\n';
      topIssues.forEach(([issue, frequency]) => {
        csv += `"${issue}",${frequency}\n`;
      });
    }

    // Compliance trends by contractor
    const contractorStats: Record<string, { inspections: number; totalCompliance: number }> = {};
    inspections.forEach((inspection) => {
      if (!contractorStats[inspection.contractor]) {
        contractorStats[inspection.contractor] = { inspections: 0, totalCompliance: 0 };
      }

      const stats = this.calculateInspectionStats(inspection);
      const complianceRate =
        stats.completed > 0 ? ((stats.good + stats.acceptable) / stats.completed) * 100 : 0;

      contractorStats[inspection.contractor].inspections++;
      contractorStats[inspection.contractor].totalCompliance += complianceRate;
    });

    csv += '\nCONTRACTOR COMPLIANCE PERFORMANCE\n';
    csv += 'Contractor,Number of Inspections,Average Compliance Rate\n';

    Object.entries(contractorStats).forEach(([contractor, stats]) => {
      const avgCompliance = Math.round(stats.totalCompliance / stats.inspections);
      csv += `"${contractor}",${stats.inspections},${avgCompliance}%\n`;
    });

    return csv;
  }

  static async generatePDFReport(
    inspections: InspectionData[],
    reportType: 'individual' | 'summary' | 'compliance' = 'summary',
  ) {
    // For a full PDF implementation, you would typically use libraries like jsPDF or Puppeteer
    // For this implementation, we'll create an HTML version that can be printed to PDF

    const htmlContent = this.generateHTMLReport(inspections, reportType);

    // Create a new window with the HTML content for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Trigger print dialog after content loads
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    }
  }

  private static generateHTMLReport(inspections: InspectionData[], reportType: string): string {
    const css = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .header-info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f0f9ff; padding: 15px; border-radius: 5px; text-align: center; }
        .critical-issue { background-color: #fee2e2; padding: 10px; border-left: 4px solid #ef4444; margin: 10px 0; }
        @media print { body { margin: 0; } .no-print { display: none; } }
      </style>
    `;

    if (reportType === 'individual' && inspections.length === 1) {
      return this.generateIndividualInspectionHTML(inspections[0], css);
    }
    if (reportType === 'compliance') {
      return this.generateComplianceReportHTML(inspections, css);
    }
    return this.generateSummaryReportHTML(inspections, css);
  }

  private static generateIndividualInspectionHTML(inspection: InspectionData, css: string): string {
    const stats = this.calculateInspectionStats(inspection);
    const complianceRate =
      stats.completed > 0
        ? Math.round(((stats.good + stats.acceptable) / stats.completed) * 100)
        : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HSE Inspection Report - ${inspection.contractor}</title>
        ${css}
      </head>
      <body>
        <h1>HSE Inspection Report</h1>

        <div class="header-info">
          <h2>Inspection Details</h2>
          <p><strong>Contractor:</strong> ${inspection.contractor}</p>
          <p><strong>Location:</strong> ${inspection.location}</p>
          <p><strong>Inspector:</strong> ${inspection.inspectedBy}</p>
          <p><strong>Date:</strong> ${new Date(inspection.date).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${inspection.status.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h3>${stats.completed}/${stats.total}</h3>
            <p>Items Completed</p>
          </div>
          <div class="stat-card">
            <h3>${complianceRate}%</h3>
            <p>Compliance Rate</p>
          </div>
          <div class="stat-card">
            <h3>${stats.good}</h3>
            <p>Good Ratings</p>
          </div>
          <div class="stat-card">
            <h3>${stats.issues}</h3>
            <p>Critical Issues</p>
          </div>
        </div>


        <h2>Inspection Results</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>Rating</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            ${inspection.items
              .map(
                (item) => `
              <tr ${
                ['SIN', 'SPS', 'SWO', 'P'].includes(item.rating || '')
                  ? 'style="background-color: #fee2e2;"'
                  : ''
              }>
                <td>${item.category}</td>
                <td>${item.item}</td>
                <td>${item.rating || 'Not Rated'}</td>
                <td>${item.comments || ''}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>

        ${
          stats.issues > 0
            ? `
          <h2>Critical Issues Requiring Immediate Attention</h2>
          ${inspection.items
            .filter((item) => ['SIN', 'SPS', 'SWO', 'P'].includes(item.rating || ''))
            .map(
              (item) => `
              <div class="critical-issue">
                <strong>${item.category}:</strong> ${item.item} (${item.rating})
                ${item.comments ? `<br><em>Comments: ${item.comments}</em>` : ''}
              </div>
            `,
            )
            .join('')}
        `
            : ''
        }
      </body>
      </html>
    `;
  }

  private static generateSummaryReportHTML(inspections: InspectionData[], css: string): string {
    const totalItems = inspections.reduce((sum, inspection) => sum + inspection.items.length, 0);
    const completedItems = inspections.reduce(
      (sum, inspection) => sum + inspection.items.filter((item) => item.rating !== null).length,
      0,
    );
    const overallCompliance =
      inspections.length > 0
        ? Math.round(
            inspections.reduce((sum, inspection) => {
              const stats = this.calculateInspectionStats(inspection);
              return (
                sum +
                (stats.completed > 0
                  ? ((stats.good + stats.acceptable) / stats.completed) * 100
                  : 0)
              );
            }, 0) / inspections.length,
          )
        : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HSE Inspection Summary Report</title>
        ${css}
      </head>
      <body>
        <h1>HSE Inspection Summary Report</h1>

        <div class="header-info">
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Inspections:</strong> ${inspections.length}</p>
          <p><strong>Date Range:</strong> ${
            inspections.length > 0
              ? `${new Date(
                  Math.min(...inspections.map((i) => new Date(i.date).getTime())),
                ).toLocaleDateString()} - ${new Date(
                  Math.max(...inspections.map((i) => new Date(i.date).getTime())),
                ).toLocaleDateString()}`
              : 'No data'
          }</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h3>${inspections.length}</h3>
            <p>Total Inspections</p>
          </div>
          <div class="stat-card">
            <h3>${overallCompliance}%</h3>
            <p>Average Compliance</p>
          </div>
          <div class="stat-card">
            <h3>${completedItems}</h3>
            <p>Items Inspected</p>
          </div>
        </div>

        <h2>Inspection Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Contractor</th>
              <th>Location</th>
              <th>Inspector</th>
              <th>Date</th>
              <th>Status</th>
              <th>Compliance</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            ${inspections
              .map((inspection) => {
                const stats = this.calculateInspectionStats(inspection);
                const compliance =
                  stats.completed > 0
                    ? Math.round(((stats.good + stats.acceptable) / stats.completed) * 100)
                    : 0;
                return `
                <tr>
                  <td>${inspection.contractor}</td>
                  <td>${inspection.location}</td>
                  <td>${inspection.inspectedBy}</td>
                  <td>${new Date(inspection.date).toLocaleDateString()}</td>
                  <td>${inspection.status.replace('_', ' ')}</td>
                  <td>${compliance}%</td>
                  <td>${stats.issues}</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  private static generateComplianceReportHTML(inspections: InspectionData[], css: string): string {
    // Category analysis
    const categoryStats: Record<
      string,
      { total: number; good: number; acceptable: number; poor: number; issues: number }
    > = {};

    inspections.forEach((inspection) => {
      inspection.items.forEach((item) => {
        if (!categoryStats[item.category]) {
          categoryStats[item.category] = { total: 0, good: 0, acceptable: 0, poor: 0, issues: 0 };
        }

        if (item.rating) {
          categoryStats[item.category].total++;

          if (item.rating === 'G') categoryStats[item.category].good++;
          else if (item.rating === 'A') categoryStats[item.category].acceptable++;
          else if (item.rating === 'P') categoryStats[item.category].poor++;
          else if (['SIN', 'SPS', 'SWO'].includes(item.rating))
            categoryStats[item.category].issues++;
        }
      });
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HSE Compliance Analysis Report</title>
        ${css}
      </head>
      <body>
        <h1>HSE Compliance Analysis Report</h1>

        <div class="header-info">
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Analysis Period:</strong> ${
            inspections.length > 0
              ? `${new Date(
                  Math.min(...inspections.map((i) => new Date(i.date).getTime())),
                ).toLocaleDateString()} - ${new Date(
                  Math.max(...inspections.map((i) => new Date(i.date).getTime())),
                ).toLocaleDateString()}`
              : 'No data'
          }</p>
        </div>

        <h2>Category Compliance Analysis</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Items</th>
              <th>Good</th>
              <th>Acceptable</th>
              <th>Poor</th>
              <th>Critical Issues</th>
              <th>Compliance Rate</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(categoryStats)
              .map(([category, stats]) => {
                const complianceRate =
                  stats.total > 0
                    ? Math.round(((stats.good + stats.acceptable) / stats.total) * 100)
                    : 0;
                return `
                <tr>
                  <td>${category}</td>
                  <td>${stats.total}</td>
                  <td>${stats.good}</td>
                  <td>${stats.acceptable}</td>
                  <td>${stats.poor}</td>
                  <td>${stats.issues}</td>
                  <td style="color: ${
                    complianceRate >= 90 ? 'green' : complianceRate >= 70 ? 'orange' : 'red'
                  }">${complianceRate}%</td>
                </tr>
              `;
              })
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  private static calculateInspectionStats(inspection: InspectionData) {
    const total = inspection.items.length;
    const completed = inspection.items.filter((item) => item.rating !== null).length;
    const good = inspection.items.filter((item) => item.rating === 'G').length;
    const acceptable = inspection.items.filter((item) => item.rating === 'A').length;
    const poor = inspection.items.filter((item) => item.rating === 'P').length;
    const issues = inspection.items.filter((item) =>
      ['SIN', 'SPS', 'SWO'].includes(item.rating || ''),
    ).length;

    return { total, completed, good, acceptable, poor, issues };
  }
}

// Export utility function for easy use in components
export const exportInspectionReport = async (
  inspectionIds: string[] | 'all',
  format: 'excel' | 'pdf',
  reportType: 'individual' | 'summary' | 'compliance' = 'summary',
) => {
  const allInspections = storage.load('inspections', []);
  const inspections =
    inspectionIds === 'all'
      ? allInspections
      : allInspections.filter((inspection: InspectionData) =>
          inspectionIds.includes(inspection.id),
        );

  if (inspections.length === 0) {
    alert('No inspections found to export.');
    return;
  }

  try {
    if (format === 'excel') {
      await ReportGenerator.generateExcelReport(inspections, reportType);
    } else {
      await ReportGenerator.generatePDFReport(inspections, reportType);
    }
  } catch (error) {
    console.error('Error generating report:', error);
    alert('Error generating report. Please try again.');
  }
};
