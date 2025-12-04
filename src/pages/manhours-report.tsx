import React, { useState, useEffect } from 'react';
import InspectorLayout from '@/roles/inspector/layouts/InspectorLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import {
  ArrowLeft,
  Users,
  Clock,
  Save,
  ChevronRight,
  Send,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import { downloadManhoursExcel } from '@/utils/manhoursExcelExport';

type ReportStatus = 'draft' | 'completed' | 'pending_review';

interface MonthlyData {
  month: string;
  manPower: string;
  manHours: string;
  accidents: string;
}

interface ReportData {
  id: string;
  preparedBy: string;
  preparedDate: string;
  reviewedBy: string;
  reviewedDate: string;
  reportMonth: string;
  reportYear: string;
  numEmployees: string;
  monthlyManHours: string;
  yearToDateManHours: string;
  totalAccumulatedManHours: string;
  annualTotalManHours: string;
  workdaysLost: string;
  ltiCases: string;
  noLTICases: string;
  nearMissAccidents: string;
  dangerousOccurrences: string;
  occupationalDiseases: string;
  formulaLtiCases: string;
  formulaAnnualAvgEmployees: string;
  formulaAnnualTotalManHours: string;
  formulaWorkdaysLost: string;
  projectName: string;
  monthlyData: MonthlyData[];
  status: ReportStatus;
  createdAt: string;
  remarks: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();

const ManhoursReport: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'monthly-data' | 'review' | 'complete'>('form');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitType, setSubmitType] = useState<'completed' | 'pending_review'>('completed');
  const [reportData, setReportData] = useState<ReportData>({
    id: Date.now().toString(),
    preparedBy: user?.name || '',
    preparedDate: new Date().toISOString().split('T')[0],
    reviewedBy: '',
    reviewedDate: '',
    reportMonth: MONTHS[new Date().getMonth()],
    reportYear: CURRENT_YEAR.toString(),
    numEmployees: '',
    monthlyManHours: '',
    yearToDateManHours: '',
    totalAccumulatedManHours: '',
    annualTotalManHours: '',
    workdaysLost: '',
    ltiCases: '0',
    noLTICases: '0',
    nearMissAccidents: '0',
    dangerousOccurrences: '0',
    occupationalDiseases: '0',
    formulaLtiCases: '0',
    formulaAnnualAvgEmployees: '',
    formulaAnnualTotalManHours: '',
    formulaWorkdaysLost: '',
    projectName: '',
    monthlyData: MONTHS.map((month) => ({
      month,
      manPower: '',
      manHours: '',
      accidents: '0',
    })),
    status: 'draft',
    createdAt: new Date().toISOString(),
    remarks: '',
  });
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [currentYear, setCurrentYear] = useState(reportData.reportYear);

  useEffect(() => {
    const loadPreviousMonthsData = async () => {
      if (!reportData.reportYear || (hasLoadedData && reportData.reportYear === currentYear))
        return;
      try {
        const response = await fetch(
          `/api/manhours?year=${reportData.reportYear}&status=completed&limit=100`,
        );
        if (!response.ok) throw new Error('Failed to fetch previous reports');
        const { reports } = await response.json();
        if (reports && reports.length > 0) {
          const mergedMonthlyData = MONTHS.map((month) => {
            for (const report of reports) {
              const formData = report.form_data;
              if (formData?.monthlyData && Array.isArray(formData.monthlyData)) {
                const monthData = formData.monthlyData.find((m: MonthlyData) => m.month === month);
                if (
                  monthData &&
                  (monthData.manPower || monthData.manHours || monthData.accidents !== '0')
                ) {
                  return {
                    month,
                    manPower: monthData.manPower || '',
                    manHours: monthData.manHours || '',
                    accidents: monthData.accidents || '0',
                  };
                }
              }
            }
            return { month, manPower: '', manHours: '', accidents: '0' };
          });
          setReportData((prev) => ({ ...prev, monthlyData: mergedMonthlyData }));
        }
        setHasLoadedData(true);
        setCurrentYear(reportData.reportYear);
      } catch (error) {
        console.error('Error loading previous months data:', error);
      }
    };
    loadPreviousMonthsData();
  }, [reportData.reportYear, hasLoadedData, currentYear]);

  useEffect(() => {
    if (!hasPermission('canCreateInspections')) {
      router.push('/');
    }
  }, [hasPermission, router]);

  if (!hasPermission('canCreateInspections')) {
    return null;
  }

  const calculateLTIIncidentRate = (): string => {
    const lti = parseFloat(reportData.formulaLtiCases) || 0;
    const employees = parseFloat(reportData.formulaAnnualAvgEmployees) || 1;
    return ((lti / employees) * 1000).toFixed(2);
  };

  const calculateIncidentFrequencyRate = (): string => {
    const lti = parseFloat(reportData.formulaLtiCases) || 0;
    const totalHours = parseFloat(reportData.formulaAnnualTotalManHours) || 1;
    return ((lti / totalHours) * 1000000).toFixed(2);
  };

  const calculateSeverityRate = (): string => {
    const workdaysLost = parseFloat(reportData.formulaWorkdaysLost) || 0;
    const totalHours = parseFloat(reportData.formulaAnnualTotalManHours) || 1;
    return ((workdaysLost / totalHours) * 1000000).toFixed(2);
  };

  const updateField = (field: keyof ReportData, value: any) => {
    setReportData((prev) => ({ ...prev, [field]: value }));
  };

  const updateMonthlyData = (index: number, field: keyof MonthlyData, value: string) => {
    setReportData((prev) => ({
      ...prev,
      monthlyData: prev.monthlyData.map((data, i) =>
        i === index ? { ...data, [field]: value } : data,
      ),
    }));
  };

  const handleSaveDraft = async () => {
    try {
      const response = await fetch('/api/manhours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      if (!response.ok) throw new Error('Failed to save draft');
      const result = await response.json();
      alert('Draft saved successfully to database!');
      if (result.report?.id) {
        setReportData((prev) => ({ ...prev, id: result.report.id }));
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    }
  };

  const handleSubmit = async () => {
    try {
      const submittedReport = {
        ...reportData,
        status: submitType as ReportStatus,
        completedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      };
      const response = await fetch('/api/manhours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submittedReport),
      });
      if (!response.ok) throw new Error('Failed to submit report');
      setReportData(submittedReport);
      setStep('complete');
      setShowSubmitDialog(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    }
  };

  const handleExportExcel = async () => {
    try {
      await downloadManhoursExcel(reportData);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  const handleNewReport = async () => {
    const newYear = CURRENT_YEAR.toString();
    const defaultData = {
      id: Date.now().toString(),
      preparedBy: user?.name || '',
      preparedDate: new Date().toISOString().split('T')[0],
      reviewedBy: '',
      reviewedDate: '',
      reportMonth: MONTHS[new Date().getMonth()],
      reportYear: newYear,
      numEmployees: '',
      monthlyManHours: '',
      yearToDateManHours: '',
      totalAccumulatedManHours: '',
      annualTotalManHours: '',
      workdaysLost: '',
      ltiCases: '0',
      noLTICases: '0',
      nearMissAccidents: '0',
      dangerousOccurrences: '0',
      occupationalDiseases: '0',
      formulaLtiCases: '0',
      formulaAnnualAvgEmployees: '',
      formulaAnnualTotalManHours: '',
      formulaWorkdaysLost: '',
      projectName: '',
      monthlyData: MONTHS.map((month) => ({
        month,
        manPower: '',
        manHours: '',
        accidents: '0',
      })),
      status: 'draft' as ReportStatus,
      createdAt: new Date().toISOString(),
      remarks: '',
    };
    setReportData(defaultData);
    setStep('form');
    setHasLoadedData(false);
    setCurrentYear(newYear);
  };

  const isFormValid = (): boolean => {
    return !!(
      reportData.preparedBy &&
      reportData.reportMonth &&
      reportData.numEmployees &&
      reportData.monthlyManHours
    );
  };

  // STEP 1: Main Form
  if (step === 'form') {
    return (
      <ProtectedRoute requiredPermission="canCreateInspections">
        <InspectorLayout>
          <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
              <button
                onClick={() => router.push('/inspector/forms')}
                className="mb-2 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Forms
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Monthly Man-hours Report</h1>
                <p className="text-gray-500 text-xs">OSHA 1994, Part V, Reg 19(1)</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto p-4 space-y-6">
              {/* Report Header Section */}
              <div className="bg-white rounded-lg p-6 space-y-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Report Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prepared By *
                    </label>
                    <input
                      type="text"
                      value={reportData.preparedBy}
                      onChange={(e) => updateField('preparedBy', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Prepared *
                    </label>
                    <input
                      type="date"
                      value={reportData.preparedDate}
                      onChange={(e) => updateField('preparedDate', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reviewed By
                    </label>
                    <input
                      type="text"
                      value={reportData.reviewedBy}
                      onChange={(e) => updateField('reviewedBy', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Supervisor name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Reviewed
                    </label>
                    <input
                      type="date"
                      value={reportData.reviewedDate}
                      onChange={(e) => updateField('reviewedDate', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Report Month *
                    </label>
                    <select
                      value={reportData.reportMonth}
                      onChange={(e) => updateField('reportMonth', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {MONTHS.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                    <input
                      type="number"
                      value={reportData.reportYear}
                      onChange={(e) => updateField('reportYear', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={CURRENT_YEAR.toString()}
                    />
                  </div>
                </div>
              </div>

              {/* Industrial Accidents Statistics Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Industrial Accidents Statistics
                </h2>
                <p className="text-xs text-gray-600">
                  As compliance with Regulation 19(2) sub clause (c), OSHA 1994 and Reg.10, NADOPOD
                  2004
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      {/* <Users className="h-4 w-4" /> */}
                      No. of Employees *
                    </label>
                    <input
                      type="number"
                      value={reportData.numEmployees}
                      onChange={(e) => updateField('numEmployees', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      {/* <Clock className="h-4 w-4" /> */}
                      Monthly Man-hours *
                    </label>
                    <input
                      type="number"
                      value={reportData.monthlyManHours}
                      onChange={(e) => updateField('monthlyManHours', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter hours"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year to Date Man-hours
                    </label>
                    <input
                      type="number"
                      value={reportData.yearToDateManHours}
                      onChange={(e) => updateField('yearToDateManHours', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter YTD hours"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Accumulated Man-hours
                    </label>
                    <input
                      type="number"
                      value={reportData.totalAccumulatedManHours}
                      onChange={(e) => updateField('totalAccumulatedManHours', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter total hours"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Workdays Lost / Year
                    </label>
                    <input
                      type="number"
                      value={reportData.workdaysLost}
                      onChange={(e) => updateField('workdaysLost', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter days"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LTI Cases
                      </label>
                      <input
                        type="number"
                        value={reportData.ltiCases}
                        onChange={(e) => updateField('ltiCases', e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        No LTI (Minor Injury)
                      </label>
                      <input
                        type="number"
                        value={reportData.noLTICases}
                        onChange={(e) => updateField('noLTICases', e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Near Miss Accidents
                      </label>
                      <input
                        type="number"
                        value={reportData.nearMissAccidents}
                        onChange={(e) => updateField('nearMissAccidents', e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dangerous Occurrences
                      </label>
                      <input
                        type="number"
                        value={reportData.dangerousOccurrences}
                        onChange={(e) => updateField('dangerousOccurrences', e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Occupational Disease / Poisoning
                    </label>
                    <input
                      type="number"
                      value={reportData.occupationalDiseases}
                      onChange={(e) => updateField('occupationalDiseases', e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated Rates Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Calculated Safety Rates
                </h2>
                <div className="bg-white rounded-md border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">LTI Incident Rate</p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 text-sm mb-3">
                    <span className="text-gray-600">=</span>
                    <div className="flex-1 w-full">
                      <div className="border-b border-gray-200 pb-2 mb-2 text-center flex items-center justify-center gap-1 flex-wrap">
                        <span className="text-gray-600 text-sm">Accidents [</span>
                        <input
                          type="number"
                          value={reportData.formulaLtiCases}
                          onChange={(e) => updateField('formulaLtiCases', e.target.value)}
                          className="w-12 px-2 py-1 text-sm font-medium text-gray-800 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-600 text-sm">]</span>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1 flex-wrap">
                        <span className="text-gray-600 text-sm">Avg Employees [</span>
                        <input
                          type="number"
                          value={reportData.formulaAnnualAvgEmployees}
                          onChange={(e) => updateField('formulaAnnualAvgEmployees', e.target.value)}
                          className="w-12 px-2 py-1 text-sm font-medium text-gray-800 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-600 text-sm">]</span>
                      </div>
                    </div>
                    <span className="text-gray-600 text-sm">× 1000 =</span>
                    <span className="text-xl font-bold text-blue-600">
                      {calculateLTIIncidentRate()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 text-center">per 1,000 employees</p>
                </div>
                <div className="bg-white rounded-md border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">Incident Frequency Rate</p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 text-sm mb-3">
                    <span className="text-gray-600">=</span>
                    <div className="flex-1 w-full">
                      <div className="border-b border-gray-200 pb-2 mb-2 text-center flex items-center justify-center gap-1 flex-wrap">
                        <span className="text-gray-600 text-sm">Accidents [</span>
                        <input
                          type="number"
                          value={reportData.formulaLtiCases}
                          onChange={(e) => updateField('formulaLtiCases', e.target.value)}
                          className="w-12 px-2 py-1 text-sm font-medium text-gray-800 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-600 text-sm">]</span>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1 flex-wrap">
                        <span className="text-gray-600 text-sm">Man-hours/year [</span>
                        <input
                          type="number"
                          value={reportData.formulaAnnualTotalManHours}
                          onChange={(e) =>
                            updateField('formulaAnnualTotalManHours', e.target.value)
                          }
                          className="w-20 px-2 py-1 text-sm font-medium text-gray-800 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-600 text-sm">]</span>
                      </div>
                    </div>
                    <span className="text-gray-600 text-sm">× 1M =</span>
                    <span className="text-xl font-bold text-blue-600">
                      {calculateIncidentFrequencyRate()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 text-center">per 1,000,000 hours</p>
                </div>
                <div className="bg-white rounded-md border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-800 mb-3">Severity Rate</p>
                  <div className="flex flex-col sm:flex-row items-center gap-2 text-sm mb-3">
                    <span className="text-gray-600">=</span>
                    <div className="flex-1 w-full">
                      <div className="border-b border-gray-200 pb-2 mb-2 text-center flex items-center justify-center gap-1 flex-wrap">
                        <span className="text-gray-600 text-sm">Days Lost [</span>
                        <input
                          type="number"
                          value={reportData.formulaWorkdaysLost}
                          onChange={(e) => updateField('formulaWorkdaysLost', e.target.value)}
                          className="w-12 px-2 py-1 text-sm font-medium text-gray-800 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-600 text-sm">]</span>
                      </div>
                      <div className="text-center flex items-center justify-center gap-1 flex-wrap">
                        <span className="text-gray-600 text-sm">Man-hours/year [</span>
                        <input
                          type="number"
                          value={reportData.formulaAnnualTotalManHours}
                          onChange={(e) =>
                            updateField('formulaAnnualTotalManHours', e.target.value)
                          }
                          className="w-20 px-2 py-1 text-sm font-medium text-gray-800 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <span className="text-gray-600 text-sm">]</span>
                      </div>
                    </div>
                    <span className="text-gray-600 text-sm">× 1M =</span>
                    <span className="text-xl font-bold text-blue-600">
                      {calculateSeverityRate()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 text-center">per 1,000,000 hours</p>
                </div>
                {/* <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Formula values are independent from statistics section.
                    You can edit them directly in the brackets, and the calculations will update automatically.
                  </p>
                </div> */}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSaveDraft}
                  className="flex-1 rounded-md border border-blue-600 text-blue-600 py-3 font-medium hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                  {/* <Save className="h-5 w-5" /> */}
                  Save as Draft
                </button>
                <button
                  onClick={() => setStep('monthly-data')}
                  disabled={!isFormValid()}
                  className="flex-1 rounded-md bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue to Monthly Data
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </InspectorLayout>
      </ProtectedRoute>
    );
  }

  // STEP 2: Monthly Data Entry
  if (step === 'monthly-data') {
    const currentReportMonthIndex = MONTHS.indexOf(reportData.reportMonth);
    const currentMonthData = reportData.monthlyData[currentReportMonthIndex];
    return (
      <ProtectedRoute requiredPermission="canCreateInspections">
        <InspectorLayout>
          <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
              <button
                onClick={() => setStep('form')}
                className="mb-2 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Form
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Monthly Breakdown</h1>
                <p className="text-gray-500 text-xs">
                  Enter data for {reportData.reportMonth} {reportData.reportYear}
                </p>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto p-4 space-y-6">
              {/* Info Banner */}
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800">
                  Reporting Month: {reportData.reportMonth} {reportData.reportYear}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Enter the man-power, man-hours, and accident data for this month.
                </p>
              </div>

              {/* Single Month Data Entry */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  {reportData.reportMonth} {reportData.reportYear}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Man Power
                    </label>
                    <input
                      type="number"
                      value={currentMonthData.manPower}
                      onChange={(e) =>
                        updateMonthlyData(currentReportMonthIndex, 'manPower', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Man Hours
                    </label>
                    <input
                      type="number"
                      value={currentMonthData.manHours}
                      onChange={(e) =>
                        updateMonthlyData(currentReportMonthIndex, 'manHours', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      No. of Accidents
                    </label>
                    <input
                      type="number"
                      value={currentMonthData.accidents}
                      onChange={(e) =>
                        updateMonthlyData(currentReportMonthIndex, 'accidents', e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 rounded-md border border-gray-300 text-gray-700 py-3 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  className="flex-1 rounded-md bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  Review Report
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </InspectorLayout>
      </ProtectedRoute>
    );
  }

  // STEP 3: Review
  if (step === 'review') {
    return (
      <ProtectedRoute requiredPermission="canCreateInspections">
        <InspectorLayout>
          <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
              <button
                onClick={() => setStep('monthly-data')}
                className="mb-2 text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Monthly Data
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Review Report</h1>
                <p className="text-gray-500 text-xs">Verify all information before submission</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto p-4 space-y-6">
              {/* Report Header Review */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Report Information
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Prepared By:</p>
                    <p className="font-medium">{reportData.preparedBy}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date:</p>
                    <p className="font-medium">{reportData.preparedDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Report Period:</p>
                    <p className="font-medium">
                      {reportData.reportMonth} {reportData.reportYear}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statistics Review */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Safety Statistics
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Employees:</p>
                    <p className="font-medium">{reportData.numEmployees}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Monthly Hours:</p>
                    <p className="font-medium">{reportData.monthlyManHours}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Accumulated Hours:</p>
                    <p className="font-medium">{reportData.totalAccumulatedManHours}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Annual Hours:</p>
                    <p className="font-medium">{reportData.annualTotalManHours}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">LTI Cases:</p>
                    <p className="font-medium">{reportData.ltiCases}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Near Miss:</p>
                    <p className="font-medium">{reportData.nearMissAccidents}</p>
                  </div>
                </div>
              </div>

              {/* Formula Values Review */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Formula Values (Independent)
                </h2>
                <p className="text-xs text-gray-600">
                  These values are used in the rate calculations below
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Formula LTI Cases:</p>
                    <p className="font-medium text-blue-600">{reportData.formulaLtiCases}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Formula Avg Employees:</p>
                    <p className="font-medium text-blue-600">
                      {reportData.formulaAnnualAvgEmployees || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Formula Annual Hours:</p>
                    <p className="font-medium text-blue-600">
                      {reportData.formulaAnnualTotalManHours || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Formula Workdays Lost:</p>
                    <p className="font-medium text-blue-600">
                      {reportData.formulaWorkdaysLost || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rates Review */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Safety Rates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-md border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">LTI Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{calculateLTIIncidentRate()}</p>
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Frequency Rate</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {calculateIncidentFrequencyRate()}
                    </p>
                  </div>
                  <div className="rounded-md border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Severity Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{calculateSeverityRate()}</p>
                  </div>
                </div>
              </div>

              {/* Monthly Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Monthly Summary (Jan - {reportData.reportMonth})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Month</th>
                        <th className="px-4 py-2 text-right">Man Power</th>
                        <th className="px-4 py-2 text-right">Man Hours</th>
                        <th className="px-4 py-2 text-right">Accidents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.monthlyData
                        .slice(0, MONTHS.indexOf(reportData.reportMonth) + 1)
                        .filter((d) => d.manPower || d.manHours || d.accidents !== '0')
                        .map((data) => (
                          <tr key={data.month} className="border-t border-gray-100">
                            <td className="px-4 py-2">{data.month}</td>
                            <td className="px-4 py-2 text-right">{data.manPower || '-'}</td>
                            <td className="px-4 py-2 text-right">{data.manHours || '-'}</td>
                            <td className="px-4 py-2 text-right">{data.accidents}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Export Button */}
              {/* <div className="mb-4">
                <button
                  onClick={handleExportExcel}
                  className="w-full rounded-md border border-blue-600 bg-blue-50 text-blue-700 py-3 font-medium hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Export to Excel
                </button>
              </div> */}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setStep('monthly-data')}
                  className="w-full rounded-md border border-gray-300 text-gray-700 py-3 font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Back to Edit
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSubmitType('completed');
                      setShowSubmitDialog(true);
                    }}
                    className="flex-1 rounded-md bg-green-600 text-white py-3 font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    {/* <CheckCircle2 className="h-5 w-5" /> */}
                    Submit as Complete
                  </button>
                  <button
                    onClick={() => {
                      setSubmitType('pending_review');
                      setShowSubmitDialog(true);
                    }}
                    className="flex-1 rounded-md bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    {/* <Send className="h-5 w-5" /> */}
                    Submit for Review
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Confirmation Dialog */}
            {showSubmitDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-md w-full shadow-lg">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    {submitType === 'completed' ? 'Submit as Complete?' : 'Submit for Review?'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {submitType === 'completed'
                      ? 'Are you sure you want to submit this man-hours report as completed?'
                      : 'Are you sure you want to submit this man-hours report for supervisor review?'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSubmitDialog(false)}
                      className="flex-1 rounded-md border border-gray-300 text-gray-700 py-3 font-medium hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      className={`flex-1 rounded-md text-white py-3 font-medium transition-all ${
                        submitType === 'completed'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Confirm Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </InspectorLayout>
      </ProtectedRoute>
    );
  }

  // STEP 4: Complete
  return (
    <ProtectedRoute requiredPermission="canCreateInspections">
      <InspectorLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-lg">
              <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-green-600 mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Report Submitted!</h2>
              <p className="text-gray-600 mb-8">
                Your man-hours report for {reportData.reportMonth} {reportData.reportYear} has been
                successfully submitted.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleExportExcel}
                  className="w-full rounded-md border border-blue-600 bg-blue-50 text-blue-700 py-3 font-medium hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Export to Excel
                </button>
                <button
                  onClick={handleNewReport}
                  className="w-full rounded-md bg-blue-600 text-white py-3 font-medium hover:bg-blue-700 transition-all"
                >
                  Create New Report
                </button>
                <button
                  onClick={() => router.push('/inspector/forms')}
                  className="w-full rounded-md border border-gray-300 text-gray-700 py-3 font-medium hover:bg-gray-50 transition-all"
                >
                  Back to Forms
                </button>
              </div>
            </div>
          </div>
        </div>
      </InspectorLayout>
    </ProtectedRoute>
  );
};

export default ManhoursReport;
