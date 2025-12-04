const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'analytics.tsx');
console.log('Reading file:', filePath);

let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Add imports if not present
if (!content.includes('import CircularProgress')) {
  console.log('Adding CircularProgress import...');
  content = content.replace(
    "import { storage } from '@/utils/storage';",
    "import { storage } from '@/utils/storage';\nimport CircularProgress from '@/components/CircularProgress';\n\ntype TimeFilter = 'today' | 'week' | 'month' | 'year';"
  );
}

// Step 2: Add timeFilter state
if (!content.includes('timeFilter')) {
  console.log('Adding timeFilter state...');
  content = content.replace(
    'const [loading, setLoading] = useState(true);',
    "const [loading, setLoading] = useState(true);\n  const [timeFilter, setTimeFilter] = useState<TimeFilter>('year');"
  );
}

// Step 3: Add calculation functions before exportAnalytics
if (!content.includes('calculateInspectionRate')) {
  console.log('Adding calculation functions...');
  const calcFunctions = `
  // Calculate percentages for circular progress
  const calculateInspectionRate = () => {
    if (!analyticsData) return 0;
    const completedMonths = analyticsData.monthlyData.filter(m => m.total > 0).length;
    return (completedMonths / 12) * 100;
  };

  const calculateSafetyScore = () => {
    if (!analyticsData || analyticsData.totalCumulativeManHours === 0) return 100;
    const accidentRate = (analyticsData.totalAccidents / (analyticsData.totalCumulativeManHours / 1000)) * 100;
    return Math.max(0, Math.min(100, 100 - accidentRate));
  };

  const calculateComplianceRate = () => {
    if (!analyticsData) return 0;
    const totalItems = analyticsData.expiryItems.length;
    if (totalItems === 0) return 100;
    const compliantItems = analyticsData.expiryItems.filter(item => item.daysUntilExpiry > 30).length;
    return (compliantItems / totalItems) * 100;
  };

`;
  content = content.replace('  const exportAnalytics = () => {', calcFunctions + '  const exportAnalytics = () => {');
}

// Write the updated content
fs.writeFileSync(filePath, content);
console.log('Successfully updated analytics.tsx!');
console.log('Changes applied:');
console.log('- Added CircularProgress import');
console.log('- Added TimeFilter type');
console.log('- Added timeFilter state');
console.log('- Added 3 calculation functions');
