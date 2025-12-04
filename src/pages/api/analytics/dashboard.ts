// src/pages/api/analytics/dashboard.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { getServiceSupabase } from '@/lib/supabase';

interface MonthlyManhoursData {
  month: string;
  employees: number;
  manHours: number;
  accidents: number;
}

interface MonthlyInspectionData {
  month: string;
  fireExtinguisher: number;
  firstAid: number;
  total: number;
}

interface ExpiryItem {
  id: string;
  type: 'fire_extinguisher' | 'first_aid';
  itemName: string;
  location: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

interface Inspector {
  id: string;
  name: string;
  initials: string;
  color: string;
  inspectionCount: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-pink-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500',
];

async function handler(req: NextApiRequest, res: NextApiResponse, user: User) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { year, month } = req.query;
  const selectedYear = year ? parseInt(year as string) : new Date().getFullYear();
  const selectedMonth = month ? parseInt(month as string) : 0; // 0 = All months

  try {
    const supabase = getServiceSupabase();
    const now = new Date();
    const actualCurrentMonth = now.getMonth();
    const actualCurrentYear = now.getFullYear();

    // Fetch all inspections for the selected year based on inspection_date
    const { data: allInspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('*')
      .gte('inspection_date', `${selectedYear}-01-01`)
      .lte('inspection_date', `${selectedYear}-12-31`);

    if (inspectionsError) {
      console.error('Error fetching inspections:', inspectionsError);
      return res.status(500).json({ error: 'Failed to fetch inspections' });
    }

    // Separate inspections by type
    const fireInspections = (allInspections as any[])?.filter((i: any) => i.inspection_type === 'fire_extinguisher') || [];
    const firstAidInspections = (allInspections as any[])?.filter((i: any) => i.inspection_type === 'first_aid') || [];
    const manhoursReports = (allInspections as any[])?.filter((i: any) => i.inspection_type === 'manhours_report') || [];

    // Fetch users for inspector information
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    // Calculate manhours statistics
    let totalEmployees = 0;
    let totalManHours = 0;
    let totalAccidents = 0;
    let employeeCount = 0;

    const monthlyManhoursData: MonthlyManhoursData[] = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthReports = manhoursReports.filter((report: any) => {
        if (!report.inspection_date) return false;
        const reportDate = new Date(report.inspection_date);
        return reportDate.getMonth() === monthIndex && reportDate.getFullYear() === selectedYear;
      });

      let monthEmployees = 0;
      let monthManHours = 0;
      let monthAccidents = 0;

      monthReports.forEach((report: any) => {
        const formData = report.form_data || {};

        const employees = parseInt(formData.numEmployees || formData.totalEmployees || '0');
        if (!isNaN(employees) && employees > 0) {
          monthEmployees += employees;
          totalEmployees += employees;
          employeeCount++;
        }

        const manHours = parseFloat(formData.monthlyManHours || formData.totalManHours || '0');
        if (!isNaN(manHours)) {
          monthManHours += manHours;
          totalManHours += manHours;
        }

        // Calculate total accidents from different categories
        const ltiCases = parseInt(formData.ltiCases || '0') || 0;
        const noLTICases = parseInt(formData.noLTICases || '0') || 0;
        const nearMiss = parseInt(formData.nearMissAccidents || '0') || 0;
        const dangerous = parseInt(formData.dangerousOccurrences || '0') || 0;
        const occupational = parseInt(formData.occupationalDiseases || '0') || 0;

        const accidents = ltiCases + noLTICases + nearMiss + dangerous + occupational;
        monthAccidents += accidents;
        totalAccidents += accidents;
      });

      monthlyManhoursData.push({
        month: MONTH_LABELS[monthIndex],
        employees: monthEmployees,
        manHours: monthManHours,
        accidents: monthAccidents,
      });
    }

    const averageEmployees = employeeCount > 0 ? Math.round(totalEmployees / employeeCount) : 0;

    // Current month stats (or all months if selectedMonth is 0)
    const currentMonthReports = selectedMonth === 0
      ? manhoursReports
      : manhoursReports.filter((report: any) => {
          if (!report.inspection_date) return false;
          const reportDate = new Date(report.inspection_date);
          return reportDate.getMonth() === selectedMonth - 1 && reportDate.getFullYear() === selectedYear;
        });

    let currentMonthEmployees = 0;
    let currentMonthManHours = 0;
    let currentMonthAccidents = 0;

    currentMonthReports.forEach((report: any) => {
      const formData = report.form_data || {};
      currentMonthEmployees += parseInt(formData.numEmployees || formData.totalEmployees || '0') || 0;
      currentMonthManHours += parseFloat(formData.monthlyManHours || formData.totalManHours || '0') || 0;

      const ltiCases = parseInt(formData.ltiCases || '0') || 0;
      const noLTICases = parseInt(formData.noLTICases || '0') || 0;
      const nearMiss = parseInt(formData.nearMissAccidents || '0') || 0;
      const dangerous = parseInt(formData.dangerousOccurrences || '0') || 0;
      const occupational = parseInt(formData.occupationalDiseases || '0') || 0;

      currentMonthAccidents += ltiCases + noLTICases + nearMiss + dangerous + occupational;
    });

    // Calculate inspection statistics
    const monthlyInspectionData: MonthlyInspectionData[] = [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const fireCount = fireInspections.filter((inspection: any) => {
        if (!inspection.inspection_date) return false;
        const inspectionDate = new Date(inspection.inspection_date);
        return inspectionDate.getMonth() === monthIndex && inspectionDate.getFullYear() === selectedYear;
      }).length;

      const firstAidCount = firstAidInspections.filter((inspection: any) => {
        if (!inspection.inspection_date) return false;
        const inspectionDate = new Date(inspection.inspection_date);
        return inspectionDate.getMonth() === monthIndex && inspectionDate.getFullYear() === selectedYear;
      }).length;

      monthlyInspectionData.push({
        month: MONTH_LABELS[monthIndex],
        fireExtinguisher: fireCount,
        firstAid: firstAidCount,
        total: fireCount + firstAidCount,
      });
    }

    // This month inspections (or all if selectedMonth is 0)
    const thisMonthInspections = selectedMonth === 0
      ? [...fireInspections, ...firstAidInspections]
      : [
          ...fireInspections,
          ...firstAidInspections,
        ].filter((inspection: any) => {
          if (!inspection.inspection_date) return false;
          const inspectionDate = new Date(inspection.inspection_date);
          return inspectionDate.getMonth() === selectedMonth - 1 && inspectionDate.getFullYear() === selectedYear;
        });

    // Total inspections for the year
    const totalInspectionsYear = fireInspections.length + firstAidInspections.length;

    // Get inspectors
    const inspectors = users?.filter(
      (u: any) => u.role?.toLowerCase() === 'inspector' || u.role?.toLowerCase() === 'employee'
    ) || [];

    // Create inspector list with counts
    const inspectorList: Inspector[] = inspectors.slice(0, 3).map((inspector: any, index: number) => {
      const inspectionsByThisInspector = [
        ...fireInspections,
        ...firstAidInspections,
      ].filter((inspection: any) =>
        inspection.inspector_id === inspector.id || inspection.inspected_by === inspector.name
      );

      const nameParts = inspector.name.split(' ');
      const initials = nameParts.length > 1
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();

      return {
        id: inspector.id,
        name: inspector.name,
        initials,
        color: COLORS[index % COLORS.length],
        inspectionCount: inspectionsByThisInspector.length,
      };
    });

    // Get expiry items from all inspections (not filtered by year for safety)
    const { data: allInspectionsForExpiry, error: expiryError } = await supabase
      .from('inspections')
      .select('*')
      .in('inspection_type', ['fire_extinguisher', 'first_aid']);

    const expiryItems: ExpiryItem[] = [];

    if (!expiryError && allInspectionsForExpiry) {
      // Process fire extinguisher items
      (allInspectionsForExpiry as any[])
        .filter((i: any) => i.inspection_type === 'fire_extinguisher')
        .forEach((inspection: any) => {
          const formData = inspection.form_data || {};
          const items = formData.items || [];

          items.forEach((item: any) => {
            if (item.expiryDate) {
              const expiryDate = new Date(item.expiryDate);
              const daysUntilExpiry = Math.ceil(
                (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (daysUntilExpiry > -30) {
                expiryItems.push({
                  id: `${inspection.id}-${item.id || item.itemNumber}`,
                  type: 'fire_extinguisher',
                  itemName: `Fire Ext - ${item.location || formData.location || 'Unknown'}`,
                  location: item.location || formData.location || formData.building || 'Unknown',
                  expiryDate: item.expiryDate,
                  daysUntilExpiry,
                });
              }
            }
          });
        });

      // Process first aid items
      (allInspectionsForExpiry as any[])
        .filter((i: any) => i.inspection_type === 'first_aid')
        .forEach((inspection: any) => {
          const formData = inspection.form_data || {};
          const items = formData.items || [];

          items.forEach((item: any) => {
            if (item.expiryDate) {
              const expiryDate = new Date(item.expiryDate);
              const daysUntilExpiry = Math.ceil(
                (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (daysUntilExpiry > -30) {
                expiryItems.push({
                  id: `${inspection.id}-${item.id || item.itemName}`,
                  type: 'first_aid',
                  itemName: `First Aid - ${item.location || formData.location || 'Unknown'}`,
                  location: item.location || formData.location || formData.building || 'Unknown',
                  expiryDate: item.expiryDate,
                  daysUntilExpiry,
                });
              }
            }
          });
        });
    }

    // Sort expiry items by days until expiry
    expiryItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    // Determine current month status
    const currentMonthStatus: 'Done' | 'Pending' | 'In Progress' =
      thisMonthInspections.length > 0 ? 'Done' : 'Pending';

    // Calculate monthly completion stats (for fire extinguisher and first aid only)
    const hasFireExtinguisherThisMonth = fireInspections.some((inspection: any) => {
      if (!inspection.inspection_date) return false;
      const inspectionDate = new Date(inspection.inspection_date);
      return (
        inspectionDate.getMonth() === actualCurrentMonth &&
        inspectionDate.getFullYear() === actualCurrentYear
      );
    });

    const hasFirstAidThisMonth = firstAidInspections.some((inspection: any) => {
      if (!inspection.inspection_date) return false;
      const inspectionDate = new Date(inspection.inspection_date);
      return (
        inspectionDate.getMonth() === actualCurrentMonth &&
        inspectionDate.getFullYear() === actualCurrentYear
      );
    });

    const monthlyCompleted = (hasFireExtinguisherThisMonth ? 1 : 0) + (hasFirstAidThisMonth ? 1 : 0);

    // Calculate yearly completion stats (24 forms = 2 forms × 12 months)
    let yearlyCompleted = 0;

    // Fetch all inspections for current year to calculate yearly stats (based on inspection_date)
    const { data: currentYearInspections } = await supabase
      .from('inspections')
      .select('*')
      .gte('inspection_date', `${actualCurrentYear}-01-01`)
      .lte('inspection_date', `${actualCurrentYear}-12-31`)
      .in('inspection_type', ['fire_extinguisher', 'first_aid']);

    const fireInspectionsCurrentYear = (currentYearInspections as any[])?.filter((i: any) => i.inspection_type === 'fire_extinguisher') || [];
    const firstAidInspectionsCurrentYear = (currentYearInspections as any[])?.filter((i: any) => i.inspection_type === 'first_aid') || [];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const hasFireInMonth = fireInspectionsCurrentYear.some((inspection: any) => {
        if (!inspection.inspection_date) return false;
        const inspectionDate = new Date(inspection.inspection_date);
        return inspectionDate.getMonth() === monthIndex;
      });

      const hasFirstAidInMonth = firstAidInspectionsCurrentYear.some((inspection: any) => {
        if (!inspection.inspection_date) return false;
        const inspectionDate = new Date(inspection.inspection_date);
        return inspectionDate.getMonth() === monthIndex;
      });

      yearlyCompleted += (hasFireInMonth ? 1 : 0) + (hasFirstAidInMonth ? 1 : 0);
    }

    // Return analytics data
    const analyticsData = {
      averageEmployees,
      totalCumulativeManHours: totalManHours,
      totalAccidents,
      currentMonthStats: {
        employees: currentMonthEmployees,
        manHours: currentMonthManHours,
        accidents: currentMonthAccidents,
      },
      monthlyManhoursData,
      totalInspectionsThisMonth: thisMonthInspections.length,
      totalInspectionsYear,
      totalInspectorsCount: inspectors.length,
      currentMonthStatus,
      monthlyInspectionData,
      expiryItems: expiryItems.slice(0, 3),
      inspectors: inspectorList,
      monthlyCompletionStats: {
        completed: monthlyCompleted,
        total: 2,
      },
      yearlyCompletionStats: {
        completed: yearlyCompleted,
        total: 24,
      },
    };

    return res.status(200).json(analyticsData);
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load analytics data' });
  }
}

export default withRBAC(handler, {
  requiredPermission: 'canViewAnalytics',
});
