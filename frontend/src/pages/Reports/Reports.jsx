import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SavingsIcon from '@mui/icons-material/Savings';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
} from 'recharts';
import { apiClient } from '../../services/api';

// Color palette for charts
const COLORS = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f',
  '#00bcd4', '#ff9800', '#4caf50', '#f57c00', '#c2185b',
  '#0097a7', '#7b1fa2', '#607d8b', '#795548',
];

// Format category name for display
const formatCategoryName = (cat) => 
  cat?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Unknown';

// Format currency
const formatCurrency = (value) => 
  `$${Math.abs(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ bgcolor: 'background.paper', p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, boxShadow: 2 }}>
        <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>{label}</Typography>
        {payload.map((entry, index) => (
          <Typography key={index} variant="body2" sx={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

export function Reports() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all');
  
  // Computed data
  const [monthlyData, setMonthlyData] = useState([]);
  const [yearlyData, setYearlyData] = useState([]);
  const [categoryExpenses, setCategoryExpenses] = useState([]);
  const [categoryIncome, setCategoryIncome] = useState([]);
  const [weekdaySpending, setWeekdaySpending] = useState([]);
  const [topMerchants, setTopMerchants] = useState([]);
  const [monthOverMonth, setMonthOverMonth] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, savings: 0, avgMonthlyExpense: 0 });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      processData();
    }
  }, [transactions, selectedYear]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Fetch multiple pages to get all transactions
      let allTransactions = [];
      let skip = 0;
      const limit = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const response = await apiClient.get('/transactions', { skip, limit });
        if (response && response.length > 0) {
          allTransactions = [...allTransactions, ...response];
          skip += limit;
          hasMore = response.length === limit;
        } else {
          hasMore = false;
        }
      }
      
      setTransactions(allTransactions);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const processData = () => {
    // Filter by year if selected
    let filtered = transactions;
    if (selectedYear !== 'all') {
      filtered = transactions.filter(t => {
        const year = new Date(t.transaction_date).getFullYear();
        return year === parseInt(selectedYear);
      });
    }

    // Calculate monthly trends
    const monthlyMap = {};
    const categoryExpenseMap = {};
    const categoryIncomeMap = {};
    const weekdayMap = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const weekdayCount = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const merchantMap = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    filtered.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(t.amount);
      const category = t.category || 'Other';
      const weekday = weekdays[date.getDay()];
      // Always use category as merchant
      const merchant = t.category || 'Unknown';

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, expenses: 0 };
      }

      if (t.transaction_type === 'income') {
        monthlyMap[monthKey].income += amount;
        totalIncome += amount;
        categoryIncomeMap[category] = (categoryIncomeMap[category] || 0) + amount;
      } else {
        monthlyMap[monthKey].expenses += amount;
        totalExpenses += amount;
        categoryExpenseMap[category] = (categoryExpenseMap[category] || 0) + amount;
        weekdayMap[weekday] += amount;
        weekdayCount[weekday] += 1;
        merchantMap[merchant] = (merchantMap[merchant] || 0) + amount;
      }
    });

    // Sort monthly data
    const sortedMonthly = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        ...item,
        name: formatMonthLabel(item.month),
        fullMonth: item.month,
        savings: item.income - item.expenses,
        savingsRate: item.income > 0 ? ((item.income - item.expenses) / item.income * 100).toFixed(1) : 0,
      }));

    // Calculate month-over-month change
    const momData = sortedMonthly.map((item, index) => {
      const prevMonth = sortedMonthly[index - 1];
      const expenseChange = prevMonth ? ((item.expenses - prevMonth.expenses) / prevMonth.expenses * 100).toFixed(1) : 0;
      const incomeChange = prevMonth ? ((item.income - prevMonth.income) / prevMonth.income * 100).toFixed(1) : 0;
      return {
        ...item,
        expenseChange: parseFloat(expenseChange),
        incomeChange: parseFloat(incomeChange),
      };
    });

    // Calculate yearly data
    const yearlyMap = {};
    sortedMonthly.forEach(m => {
      const year = m.fullMonth.substring(0, 4);
      if (!yearlyMap[year]) {
        yearlyMap[year] = { year, income: 0, expenses: 0, months: 0 };
      }
      yearlyMap[year].income += m.income;
      yearlyMap[year].expenses += m.expenses;
      yearlyMap[year].months += 1;
    });
    const sortedYearly = Object.values(yearlyMap)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map(item => ({
        ...item,
        name: item.year,
        savings: item.income - item.expenses,
        avgMonthlyExpense: item.expenses / item.months,
        avgMonthlyIncome: item.income / item.months,
      }));

    // Convert category maps to arrays for pie charts
    const expenseArray = Object.entries(categoryExpenseMap)
      .map(([name, value]) => ({ name: formatCategoryName(name), value, originalName: name }))
      .sort((a, b) => b.value - a.value);

    const incomeArray = Object.entries(categoryIncomeMap)
      .map(([name, value]) => ({ name: formatCategoryName(name), value }))
      .sort((a, b) => b.value - a.value);

    // Weekday spending (average per transaction)
    const weekdayData = weekdays.map(day => ({
      name: day,
      total: weekdayMap[day],
      average: weekdayCount[day] > 0 ? Math.round(weekdayMap[day] / weekdayCount[day]) : 0,
      count: weekdayCount[day],
    }));

    // Top merchants by spending
    const merchantArray = Object.entries(merchantMap)
      .map(([name, value]) => ({ name: name.substring(0, 25), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const monthCount = Object.keys(monthlyMap).length || 1;

    setMonthlyData(sortedMonthly);
    setYearlyData(sortedYearly);
    setCategoryExpenses(expenseArray);
    setCategoryIncome(incomeArray);
    setWeekdaySpending(weekdayData);
    setTopMerchants(merchantArray);
    setMonthOverMonth(momData);
    setSummary({
      income: totalIncome,
      expenses: totalExpenses,
      savings: totalIncome - totalExpenses,
      avgMonthlyExpense: totalExpenses / monthCount,
      avgMonthlyIncome: totalIncome / monthCount,
    });
  };

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Get unique years from transactions
  const years = [...new Set(transactions.map(t => 
    new Date(t.transaction_date).getFullYear()
  ))].sort();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (transactions.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Financial Reports</Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          No transaction data available. Upload your transactions to see detailed financial reports and insights.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Financial Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {transactions.length.toLocaleString()} transactions analyzed • {years.length > 0 ? `${Math.min(...years)} - ${Math.max(...years)}` : 'No data'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <MenuItem value="all">All Years</MenuItem>
              {years.map(year => (
                <MenuItem key={year} value={year.toString()}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Total Income</Typography>
              </Box>
              <Typography variant="h5" color="success.main" fontWeight="bold">
                {formatCurrency(summary.income)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg: {formatCurrency(summary.avgMonthlyIncome)}/mo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingDownIcon sx={{ color: 'error.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Total Expenses</Typography>
              </Box>
              <Typography variant="h5" color="error.main" fontWeight="bold">
                {formatCurrency(summary.expenses)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg: {formatCurrency(summary.avgMonthlyExpense)}/mo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SavingsIcon sx={{ color: summary.savings >= 0 ? 'primary.main' : 'warning.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Net Savings</Typography>
              </Box>
              <Typography variant="h5" color={summary.savings >= 0 ? 'primary.main' : 'warning.main'} fontWeight="bold">
                {summary.savings >= 0 ? '' : '-'}{formatCurrency(summary.savings)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.income > 0 ? `${((summary.savings / summary.income) * 100).toFixed(1)}% saved` : '0% saved'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CompareArrowsIcon sx={{ color: 'info.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">Expense Ratio</Typography>
              </Box>
              <Typography variant="h5" color="info.main" fontWeight="bold">
                {summary.income > 0 ? ((summary.expenses / summary.income) * 100).toFixed(0) : 0}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                of income spent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Income vs Expenses Over Time */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                💰 Income vs Expenses Over Time
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Track how your income and spending change each year
              </Typography>
              <ResponsiveContainer width="100%" height="80%">
                <ComposedChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="income" name="Income" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#d32f2f" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="savings" name="Net Savings" stroke="#1976d2" strokeWidth={3} dot={{ fill: '#1976d2', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Expense Breakdown Pie */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: 400 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                📊 Where Your Money Goes
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Top spending categories
              </Typography>
              {categoryExpenses.length > 0 ? (
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={categoryExpenses.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryExpenses.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value, entry) => (
                        <span style={{ fontSize: 11 }}>
                          {value} ({((entry.payload.value / summary.expenses) * 100).toFixed(0)}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary">No expense data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Savings Trend & Spending Patterns */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Savings Rate Trend */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 350 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                📈 Savings Trend
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your net savings each year — green is good!
              </Typography>
              <ResponsiveContainer width="100%" height="75%">
                <AreaChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <defs>
                    <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="savings" 
                    name="Savings"
                    stroke="#2e7d32" 
                    fill="url(#savingsGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Spending by Day of Week */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 350 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                📅 When Do You Spend Most?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total spending by day of week
              </Typography>
              <ResponsiveContainer width="100%" height="75%">
                <BarChart data={weekdaySpending}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), name === 'total' ? 'Total Spent' : 'Avg per Transaction']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="total" name="Total Spent" fill="#ed6c02" radius={[4, 4, 0, 0]}>
                    {weekdaySpending.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.total === Math.max(...weekdaySpending.map(d => d.total)) ? '#d32f2f' : '#ed6c02'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Monthly Expense Trend Line */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={12}>
          <Card sx={{ height: 350 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                📉 Expense Trend Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Track your spending patterns over time — aim for the line to go down!
              </Typography>
              <ResponsiveContainer width="100%" height="75%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Monthly Expenses"
                    stroke="#d32f2f" 
                    strokeWidth={3}
                    dot={{ fill: '#d32f2f', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="Monthly Income"
                    stroke="#2e7d32" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#2e7d32', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Year over Year Comparison (if multiple years) */}
      {yearlyData.length > 1 && (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Card sx={{ height: 350 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  📆 Year-over-Year Comparison
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  How has your financial health changed year by year?
                </Typography>
                <ResponsiveContainer width="100%" height="75%">
                  <BarChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="income" name="Total Income" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Total Expenses" fill="#d32f2f" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="savings" name="Net Savings" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Reports;
