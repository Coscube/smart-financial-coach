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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/Receipt';
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
import FlagIcon from '@mui/icons-material/Flag';
import SearchIcon from '@mui/icons-material/Search';
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
        size={140}
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
        <Typography variant="h3" fontWeight="bold" color={getColor(score)}>
          {score}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  
  // Filter state
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Computed values
  const [summary, setSummary] = useState({
    thisMonthIncome: 0,
    thisMonthExpenses: 0,
    lastMonthIncome: 0,
    lastMonthExpenses: 0,
    totalSavings: 0,
    healthScore: 0,
  });
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
    const categoryMap = {};
    let totalIncome = 0, totalExpenses = 0;

    txs.forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(t.amount);
      const category = t.category || 'Other';

      if (t.transaction_type === 'income') {
        totalIncome += amount;
        if (monthKey === thisMonth) thisMonthIncome += amount;
        if (monthKey === lastMonth) lastMonthIncome += amount;
      } else {
        totalExpenses += amount;
        if (monthKey === thisMonth) thisMonthExpenses += amount;
        if (monthKey === lastMonth) lastMonthExpenses += amount;
        
        // Track by category for this month
        if (monthKey === thisMonth) {
          categoryMap[category] = (categoryMap[category] || 0) + amount;
        }
      }
    });

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
    setInsights(generatedInsights);
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

    return insights.slice(0, 5); // Max 5 insights
  };

  // Filter transactions
  const filteredTransactions = transactions
    .filter(tx => {
      if (typeFilter !== 'all' && tx.transaction_type !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tx.description?.toLowerCase().includes(query) ||
          tx.category?.toLowerCase().includes(query) ||
          tx.amount?.toString().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports & Insights
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your financial health overview and complete transaction history
      </Typography>

      <Grid container spacing={3}>
        {/* Financial Health Score */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 380 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" gutterBottom>
                💪 Financial Health Score
              </Typography>
              <HealthScore 
                score={summary.healthScore} 
                label={summary.healthScore >= 70 ? 'Healthy' : summary.healthScore >= 40 ? 'Fair' : 'Needs Work'} 
              />
              <Box sx={{ mt: 3, width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Savings Rate</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {summary.thisMonthIncome > 0 ? ((summary.thisMonthIncome - summary.thisMonthExpenses) / summary.thisMonthIncome * 100).toFixed(1) : 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(100, summary.thisMonthIncome > 0 ? ((summary.thisMonthIncome - summary.thisMonthExpenses) / summary.thisMonthIncome * 100) : 0)}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                  Based on savings rate, budget adherence & goal progress
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* AI Insights */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 380, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                🤖 AI Financial Insights
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: 300, overflow: 'auto' }}>
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

        {/* All Transactions Table */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6">
                  📝 All Transactions ({filteredTransactions.length.toLocaleString()})
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 200 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={typeFilter}
                      label="Type"
                      onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="income">Income</MenuItem>
                      <MenuItem value="expense">Expense</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTransactions
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((tx, index) => (
                        <TableRow key={tx.id || index} hover>
                          <TableCell>
                            {new Date(tx.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ 
                                width: 28, 
                                height: 28, 
                                bgcolor: tx.transaction_type === 'income' ? 'success.light' : 'error.light',
                                '& .MuiSvgIcon-root': { fontSize: 16 }
                              }}>
                                {getCategoryIcon(tx.category)}
                              </Avatar>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                {tx.description || formatCategoryName(tx.category)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={formatCategoryName(tx.category)} 
                              size="small" 
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={tx.transaction_type === 'income' ? 'Income' : 'Expense'}
                              size="small"
                              color={tx.transaction_type === 'income' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              fontWeight="medium"
                              color={tx.transaction_type === 'income' ? 'success.main' : 'error.main'}
                            >
                              {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            No transactions found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredTransactions.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Reports;
