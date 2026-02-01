import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  CircularProgress,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FlagIcon from '@mui/icons-material/Flag';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import HomeIcon from '@mui/icons-material/Home';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import FlightIcon from '@mui/icons-material/Flight';
import SchoolIcon from '@mui/icons-material/School';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../../services/api';

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#00bcd4'];

const formatCurrency = (value) =>
  `$${Math.abs(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const formatCategoryName = (cat) =>
  cat?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Other';

// Category icon mapping
const getCategoryIcon = (category) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('dining')) return <RestaurantIcon />;
  if (cat.includes('transport') || cat.includes('car') || cat.includes('gas') || cat.includes('fuel')) return <DirectionsCarIcon />;
  if (cat.includes('shop') || cat.includes('retail') || cat.includes('amazon')) return <ShoppingCartIcon />;
  if (cat.includes('home') || cat.includes('rent') || cat.includes('mortgage') || cat.includes('housing')) return <HomeIcon />;
  if (cat.includes('health') || cat.includes('medical') || cat.includes('pharmacy')) return <LocalHospitalIcon />;
  if (cat.includes('travel') || cat.includes('flight') || cat.includes('hotel') || cat.includes('airport')) return <FlightIcon />;
  if (cat.includes('education') || cat.includes('school') || cat.includes('tuition')) return <SchoolIcon />;
  if (cat.includes('income') || cat.includes('salary') || cat.includes('payment')) return <AttachMoneyIcon />;
  return <ReceiptIcon />;
};

// Stat Card Component
function StatCard({ title, value, icon, trend, color, subtitle }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend >= 0 ? (
                  <TrendingUpIcon sx={{ color: title.includes('Expense') ? 'error.main' : 'success.main', fontSize: 16 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: title.includes('Expense') ? 'success.main' : 'error.main', fontSize: 16 }} />
                )}
                <Typography
                  variant="body2"
                  sx={{ color: (trend >= 0 && !title.includes('Expense')) || (trend < 0 && title.includes('Expense')) ? 'success.main' : 'error.main', ml: 0.5 }}
                >
                  {Math.abs(trend).toFixed(1)}% vs last month
                </Typography>
              </Box>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Financial Health Score Component
function HealthScore({ score, label }) {
  const getColor = (s) => {
    if (s >= 80) return '#2e7d32';
    if (s >= 60) return '#1976d2';
    if (s >= 40) return '#ed6c02';
    return '#d32f2f';
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={120}
        thickness={4}
        sx={{ color: getColor(score) }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h4" fontWeight="bold" color={getColor(score)}>
          {score}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  
  // Computed values
  const [summary, setSummary] = useState({
    thisMonthIncome: 0,
    thisMonthExpenses: 0,
    lastMonthIncome: 0,
    lastMonthExpenses: 0,
    totalSavings: 0,
    healthScore: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [txResponse, budgetResponse, goalResponse] = await Promise.all([
        fetchTransactions(),
        apiClient.get('/budgets').catch(() => []),
        apiClient.get('/goals').catch(() => []),
      ]);
      
      setTransactions(txResponse);
      setBudgets(budgetResponse || []);
      setGoals(goalResponse || []);
      
      // Process data
      processTransactions(txResponse, budgetResponse || [], goalResponse || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
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
    return allTransactions;
  };

  const processTransactions = (txs, budgetData, goalData) => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    let thisMonthIncome = 0, thisMonthExpenses = 0;
    let lastMonthIncome = 0, lastMonthExpenses = 0;
    const monthlyMap = {};
    const categoryMap = {};
    let totalIncome = 0, totalExpenses = 0;

    txs.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(t.amount);
      const category = t.category || 'Other';

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, income: 0, expenses: 0 };
      }

      if (t.transaction_type === 'income') {
        monthlyMap[monthKey].income += amount;
        totalIncome += amount;
        if (monthKey === thisMonth) thisMonthIncome += amount;
        if (monthKey === lastMonth) lastMonthIncome += amount;
      } else {
        monthlyMap[monthKey].expenses += amount;
        totalExpenses += amount;
        if (monthKey === thisMonth) thisMonthExpenses += amount;
        if (monthKey === lastMonth) lastMonthExpenses += amount;
        
        // Track by category for this month
        if (monthKey === thisMonth) {
          categoryMap[category] = (categoryMap[category] || 0) + amount;
        }
      }
    });

    // Calculate monthly trend (last 6 months)
    const sortedMonths = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(m => ({
        name: formatMonthLabel(m.month),
        income: m.income,
        expenses: m.expenses,
        savings: m.income - m.expenses,
      }));

    // Top categories this month
    const topCats = Object.entries(categoryMap)
      .map(([name, value]) => ({ name: formatCategoryName(name), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Recent transactions
    const recent = [...txs]
      .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
      .slice(0, 5);

    // Calculate health score
    const savingsRate = thisMonthIncome > 0 ? ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100 : 0;
    const budgetAdherence = calculateBudgetAdherence(budgetData, categoryMap);
    const goalProgress = calculateGoalProgress(goalData);
    const healthScore = Math.round((savingsRate * 0.4) + (budgetAdherence * 0.35) + (goalProgress * 0.25));

    // Generate AI insights
    const generatedInsights = generateInsights(
      thisMonthIncome, thisMonthExpenses, 
      lastMonthIncome, lastMonthExpenses,
      categoryMap, budgetData, goalData, savingsRate
    );

    setSummary({
      thisMonthIncome,
      thisMonthExpenses,
      lastMonthIncome,
      lastMonthExpenses,
      totalSavings: totalIncome - totalExpenses,
      healthScore: Math.max(0, Math.min(100, healthScore)),
    });
    setMonthlyTrend(sortedMonths);
    setTopCategories(topCats);
    setRecentTransactions(recent);
    setInsights(generatedInsights);
  };

  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const calculateBudgetAdherence = (budgetData, categoryMap) => {
    if (!budgetData || budgetData.length === 0) return 50;
    let totalScore = 0;
    let count = 0;
    
    budgetData.forEach(b => {
      const spent = categoryMap[b.category] || 0;
      const ratio = spent / b.amount;
      if (ratio <= 1) {
        totalScore += 100;
      } else if (ratio <= 1.2) {
        totalScore += 70;
      } else {
        totalScore += 30;
      }
      count++;
    });
    
    return count > 0 ? totalScore / count : 50;
  };

  const calculateGoalProgress = (goalData) => {
    if (!goalData || goalData.length === 0) return 50;
    const avgProgress = goalData.reduce((sum, g) => sum + (g.current_amount / g.target_amount) * 100, 0) / goalData.length;
    return Math.min(100, avgProgress);
  };

  const generateInsights = (thisIncome, thisExpenses, lastIncome, lastExpenses, categoryMap, budgetData, goalData, savingsRate) => {
    const insights = [];
    
    // Savings insight
    if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        icon: <CheckCircleIcon />,
        text: `Excellent! You're saving ${savingsRate.toFixed(1)}% of your income this month. Keep it up!`,
      });
    } else if (savingsRate >= 10) {
      insights.push({
        type: 'info',
        icon: <LightbulbIcon />,
        text: `You're saving ${savingsRate.toFixed(1)}% this month. Try to reach 20% for better financial health.`,
      });
    } else if (savingsRate > 0) {
      insights.push({
        type: 'warning',
        icon: <WarningIcon />,
        text: `Your savings rate is only ${savingsRate.toFixed(1)}%. Consider cutting back on non-essential expenses.`,
      });
    } else {
      insights.push({
        type: 'error',
        icon: <WarningIcon />,
        text: `You're spending more than you earn! Review your expenses immediately.`,
      });
    }

    // Expense trend insight
    if (lastExpenses > 0) {
      const expenseChange = ((thisExpenses - lastExpenses) / lastExpenses) * 100;
      if (expenseChange > 20) {
        insights.push({
          type: 'warning',
          icon: <TrendingUpIcon />,
          text: `Spending increased ${expenseChange.toFixed(0)}% vs last month. Check where extra money went.`,
        });
      } else if (expenseChange < -10) {
        insights.push({
          type: 'success',
          icon: <TrendingDownIcon />,
          text: `Great job! You reduced spending by ${Math.abs(expenseChange).toFixed(0)}% from last month.`,
        });
      }
    }

    // Top spending category insight
    const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && thisExpenses > 0) {
      const percentage = (topCategory[1] / thisExpenses) * 100;
      if (percentage > 40) {
        insights.push({
          type: 'info',
          icon: <LightbulbIcon />,
          text: `${formatCategoryName(topCategory[0])} is ${percentage.toFixed(0)}% of your spending. Consider if this is necessary.`,
        });
      }
    }

    // Budget warning
    const overBudget = budgetData?.filter(b => {
      const spent = categoryMap[b.category] || 0;
      return spent > b.amount;
    });
    if (overBudget && overBudget.length > 0) {
      insights.push({
        type: 'warning',
        icon: <WarningIcon />,
        text: `You've exceeded ${overBudget.length} budget${overBudget.length > 1 ? 's' : ''}: ${overBudget.map(b => formatCategoryName(b.category)).join(', ')}`,
      });
    }

    // Goal progress
    const nearGoals = goalData?.filter(g => (g.current_amount / g.target_amount) >= 0.8 && (g.current_amount / g.target_amount) < 1);
    if (nearGoals && nearGoals.length > 0) {
      insights.push({
        type: 'success',
        icon: <FlagIcon />,
        text: `Almost there! "${nearGoals[0].name}" is ${((nearGoals[0].current_amount / nearGoals[0].target_amount) * 100).toFixed(0)}% complete!`,
      });
    }

    return insights.slice(0, 4); // Max 4 insights
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const incomeChange = summary.lastMonthIncome > 0 
    ? ((summary.thisMonthIncome - summary.lastMonthIncome) / summary.lastMonthIncome) * 100 
    : 0;
  const expenseChange = summary.lastMonthExpenses > 0 
    ? ((summary.thisMonthExpenses - summary.lastMonthExpenses) / summary.lastMonthExpenses) * 100 
    : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back! Here&apos;s your financial overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="This Month Income"
            value={formatCurrency(summary.thisMonthIncome)}
            icon={<TrendingUpIcon sx={{ color: 'white' }} />}
            trend={incomeChange}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="This Month Expenses"
            value={formatCurrency(summary.thisMonthExpenses)}
            icon={<TrendingDownIcon sx={{ color: 'white' }} />}
            trend={expenseChange}
            color="#d32f2f"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Net Savings"
            value={formatCurrency(summary.thisMonthIncome - summary.thisMonthExpenses)}
            icon={<SavingsIcon sx={{ color: 'white' }} />}
            color="#1976d2"
            subtitle={summary.thisMonthIncome > 0 ? `${((summary.thisMonthIncome - summary.thisMonthExpenses) / summary.thisMonthIncome * 100).toFixed(1)}% savings rate` : ''}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Balance"
            value={formatCurrency(summary.totalSavings)}
            icon={<AccountBalanceWalletIcon sx={{ color: 'white' }} />}
            color="#9c27b0"
            subtitle="All time net savings"
          />
        </Grid>

        {/* Spending Trend & Health Score */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                📈 6-Month Trend
              </Typography>
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2e7d32" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d32f2f" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#d32f2f" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#2e7d32" fill="url(#incomeGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#d32f2f" fill="url(#expenseGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary">No data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>
                💪 Financial Health
              </Typography>
              <HealthScore score={summary.healthScore} label={summary.healthScore >= 70 ? 'Healthy' : summary.healthScore >= 40 ? 'Fair' : 'Needs Work'} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                Based on savings rate, budget adherence & goal progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Budget Progress */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">💰 Budget Progress</Typography>
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/budget')}>
                  View All
                </Button>
              </Box>
              {budgets.length > 0 ? (
                <Box>
                  {budgets.slice(0, 4).map((budget, index) => {
                    const spent = topCategories.find(c => c.name.toLowerCase() === formatCategoryName(budget.category).toLowerCase())?.value || 0;
                    const percentage = Math.min(100, (spent / budget.amount) * 100);
                    const isOverBudget = spent > budget.amount;
                    
                    return (
                      <Box key={budget.id || index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">{formatCategoryName(budget.category)}</Typography>
                          <Typography variant="body2" color={isOverBudget ? 'error.main' : 'text.secondary'}>
                            {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: isOverBudget ? '#d32f2f' : percentage > 80 ? '#ed6c02' : COLORS[index % COLORS.length],
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" gutterBottom>No budgets set</Typography>
                  <Button variant="outlined" size="small" onClick={() => navigate('/budget')}>
                    Create Budget
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Goals Progress */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 350 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">🎯 Goals Progress</Typography>
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/goals')}>
                  View All
                </Button>
              </Box>
              {goals.length > 0 ? (
                <Box>
                  {goals.slice(0, 4).map((goal, index) => {
                    const percentage = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
                    
                    return (
                      <Box key={goal.id || index} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FlagIcon sx={{ fontSize: 16, color: COLORS[index % COLORS.length] }} />
                            <Typography variant="body2">{goal.name}</Typography>
                          </Box>
                          <Chip 
                            label={`${percentage.toFixed(0)}%`} 
                            size="small" 
                            color={percentage >= 100 ? 'success' : percentage >= 50 ? 'primary' : 'default'}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: percentage >= 100 ? '#2e7d32' : COLORS[index % COLORS.length],
                              borderRadius: 4,
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" gutterBottom>No goals set</Typography>
                  <Button variant="outlined" size="small" onClick={() => navigate('/goals')}>
                    Create Goal
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">📝 Recent Transactions</Typography>
                <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/transactions')}>
                  View All
                </Button>
              </Box>
              {recentTransactions.length > 0 ? (
                <List dense>
                  {recentTransactions.map((tx, index) => (
                    <ListItem key={tx.id || index} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: tx.transaction_type === 'income' ? 'success.light' : 'error.light', width: 36, height: 36 }}>
                          {getCategoryIcon(tx.category)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={tx.description || formatCategoryName(tx.category)}
                        secondary={new Date(tx.transaction_date).toLocaleDateString()}
                        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        color={tx.transaction_type === 'income' ? 'success.main' : 'error.main'}
                      >
                        {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No transactions yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* AI Insights */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                🤖 AI Financial Insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {insights.length > 0 ? insights.map((insight, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: 1.5,
                      bgcolor: 'rgba(255,255,255,0.15)',
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <Box sx={{ color: insight.type === 'success' ? '#4caf50' : insight.type === 'warning' ? '#ff9800' : insight.type === 'error' ? '#f44336' : '#90caf9' }}>
                      {insight.icon}
                    </Box>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      {insight.text}
                    </Typography>
                  </Box>
                )) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Add more transactions to get personalized insights!
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>⚡ Quick Actions</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/transactions')}>
                  Add Transaction
                </Button>
                <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => navigate('/transactions')}>
                  Upload Statement
                </Button>
                <Button variant="outlined" startIcon={<FlagIcon />} onClick={() => navigate('/goals')}>
                  New Goal
                </Button>
                <Button variant="outlined" startIcon={<AccountBalanceWalletIcon />} onClick={() => navigate('/budget')}>
                  Set Budget
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
