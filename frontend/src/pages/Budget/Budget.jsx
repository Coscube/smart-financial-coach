import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { apiClient } from '../../services/api';

// Color palette for categories
const categoryColors = [
  '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0',
  '#d32f2f', '#00bcd4', '#ff9800', '#4caf50',
  '#f57c00', '#c2185b', '#0097a7', '#7b1fa2',
];

// Format category name for display
const formatCategoryName = (cat) => cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

// Get color for category based on its name hash
const getCategoryColor = (categoryName, index) => categoryColors[index % categoryColors.length];

function BudgetCategoryCard({ category, onEdit, onDelete }) {
  const percentage = category.budgeted > 0 ? (category.spent / category.budgeted) * 100 : 0;
  const isOverBudget = percentage > 100;
  const remaining = category.budgeted - category.spent;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {category.name}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ${category.spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${category.budgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: isOverBudget ? 'error.main' : 'success.main' }}
              >
                {category.budgeted === 0 ? 'No budget set' : isOverBudget ? `-$${Math.abs(remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left`}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(percentage, 100)}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: isOverBudget ? '#d32f2f' : category.color,
                  borderRadius: 5,
                },
              }}
            />
          </Box>
          <Box sx={{ ml: 2, display: 'flex', flexDirection: 'column' }}>
            <IconButton size="small" aria-label="edit" onClick={() => onEdit(category)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="delete" onClick={() => onDelete(category.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function Budget() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [totalBudgetDialog, setTotalBudgetDialog] = useState(false);
  const [totalBudgetAmount, setTotalBudgetAmount] = useState('');
  const [distributionMethod, setDistributionMethod] = useState('proportional');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current month date range
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      console.log('Fetching budget data for month:', monthStart, 'to', monthEnd);
      
      // Fetch categories, transactions, and budgets in parallel
      const [categoriesResponse, transactionsResponse, budgetsResponse] = await Promise.all([
        apiClient.get('/categories', { transaction_type: 'expense' }),
        apiClient.get('/transactions', { skip: 0, limit: 1000 }),
        apiClient.get('/budgets', { skip: 0, limit: 1000 }),
      ]);
      
      console.log('Categories response:', categoriesResponse);
      console.log('Transactions response:', transactionsResponse?.length);
      console.log('Budgets response:', budgetsResponse);
      
      // Build budget map by category name for quick lookup
      const budgetMap = {};
      (budgetsResponse || []).forEach((budget) => {
        budgetMap[budget.category] = budget;
      });
      
      // Build category list with spent amounts calculated from current month transactions
      const categoryList = (categoriesResponse || []).map((cat, index) => {
        // Calculate spending for this category from transactions in current month
        const categoryTransactions = (transactionsResponse || []).filter(
          (t) => {
            if (t.transaction_type !== 'expense' || t.category !== cat.name) {
              return false;
            }
            // Filter by current month
            const txDate = new Date(t.transaction_date);
            return txDate >= monthStart && txDate <= monthEnd;
          }
        );
        const spent = categoryTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        // Get budget for this category, default to 0 if not set
        const budget = budgetMap[cat.name];
        const budgeted = budget ? parseFloat(budget.amount) : 0;
        
        return {
          id: cat.name,
          name: formatCategoryName(cat.name),
          originalName: cat.name,
          budgetId: budget?.id,
          budgeted: budgeted,
          spent: spent,
          color: getCategoryColor(cat.name, index),
        };
      });
      
      console.log('Category list:', categoryList);
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBudget = (category) => {
    setEditingCategory(category);
    setBudgetAmount(category.budgeted.toString());
    setDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    try {
      const amount = parseFloat(budgetAmount);
      if (isNaN(amount) || amount < 0) {
        alert('Please enter a valid amount');
        return;
      }

      const startDate = new Date();
      startDate.setDate(1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      if (editingCategory.budgetId) {
        await apiClient.put(`/budgets/${editingCategory.budgetId}`, {
          amount: amount,
        });
      } else {
        await apiClient.post('/budgets', {
          name: editingCategory.name,
          category: editingCategory.originalName,
          amount: amount,
          period: 'monthly',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });
      }

      setDialogOpen(false);
      setBudgetAmount('');
      setEditingCategory(null);
      fetchData();
    } catch (err) {
      console.error('Failed to save budget:', err);
      alert(`Error: ${err.message || 'Failed to save budget'}`);
    }
  };

  const handleDeleteBudget = async (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category?.budgetId) {
      alert('No budget set for this category');
      return;
    }

    if (!confirm(`Delete budget for ${category.name}?`)) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/budgets/${category.budgetId}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete budget:', err);
      alert('Failed to delete budget');
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setBudgetAmount('');
    setEditingCategory(null);
  };

  const handleOpenTotalBudgetDialog = () => {
    setTotalBudgetAmount(totalBudgeted.toString());
    setDistributionMethod('proportional');
    setTotalBudgetDialog(true);
  };

  const handleSaveTotalBudget = async () => {
    const amount = parseFloat(totalBudgetAmount);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);

      // Calculate budget per category based on distribution method
      let budgetDistribution = {};
      
      if (distributionMethod === 'equal') {
        const perCategory = amount / categories.length;
        categories.forEach((cat) => {
          budgetDistribution[cat.originalName] = perCategory;
        });
      } else {
        const totalHistoricalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);
        categories.forEach((cat) => {
          if (totalHistoricalSpent === 0) {
            budgetDistribution[cat.originalName] = amount / categories.length;
          } else {
            budgetDistribution[cat.originalName] = (cat.spent / totalHistoricalSpent) * amount;
          }
        });
      }

      // Save budget for each category
      for (const category of categories) {
        const budgetAmountForCategory = budgetDistribution[category.originalName];

        if (category.budgetId) {
          await apiClient.put(`/budgets/${category.budgetId}`, {
            amount: budgetAmountForCategory,
          });
        } else {
          await apiClient.post('/budgets', {
            name: category.name,
            category: category.originalName,
            amount: budgetAmountForCategory,
            period: 'monthly',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          });
        }
      }

      setTotalBudgetDialog(false);
      setTotalBudgetAmount('');
      alert(`✓ Total budget of $${amount.toFixed(2)} distributed ${distributionMethod === 'equal' ? 'equally' : 'based on spending patterns'} across ${categories.length} categories`);
      fetchData();
    } catch (err) {
      console.error('Failed to save total budget:', err);
      alert(`Error: ${err.message || 'Failed to save budget'}`);
    } finally {
      setLoading(false);
    }
  };

  const totalBudgeted = categories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Budget
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your monthly budget categories
          </Typography>
          {error && <Typography variant="body2" sx={{ color: 'error.main', mt: 1 }}>{error}</Typography>}
        </Box>
      </Box>

      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Budget Summary</Typography>
            <Button size="small" variant="outlined" onClick={handleOpenTotalBudgetDialog}>
              Set Total Budget
            </Button>
          </Box>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Total Budgeted
              </Typography>
              <Typography variant="h4">${totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Total Spent
              </Typography>
              <Typography variant="h4">${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Remaining
              </Typography>
              <Typography
                variant="h4"
                sx={{ color: totalBudgeted - totalSpent >= 0 ? 'success.main' : 'error.main' }}
              >
                ${(totalBudgeted - totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Grid>
          </Grid>
          {totalSpent > totalBudgeted && totalBudgeted > 0 && (
            <Typography variant="body2" sx={{ color: 'error.main', mt: 2 }}>
              ⚠️ Over budget by ${(totalSpent - totalBudgeted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Budget Categories */}
      <Grid container spacing={2}>
        {categories.map((category) => (
          <Grid size={{ xs: 12, md: 6 }} key={category.id}>
            <BudgetCategoryCard 
              category={category} 
              onEdit={handleEditBudget}
              onDelete={handleDeleteBudget}
            />
          </Grid>
        ))}
      </Grid>

      {/* Edit Budget Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Set Budget for {editingCategory?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Budget Amount"
            type="number"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            inputProps={{ step: '0.01', min: '0' }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveBudget} variant="contained" disabled={deleting}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Total Monthly Budget Dialog */}
      <Dialog open={totalBudgetDialog} onClose={() => setTotalBudgetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Total Monthly Budget</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Set your overall monthly budget. AI will automatically distribute it across your {categories.length} categories based on your previous spending behavior.
          </Typography>

          <TextField
            fullWidth
            label="Total Monthly Budget"
            type="number"
            value={totalBudgetAmount}
            onChange={(e) => setTotalBudgetAmount(e.target.value)}
            inputProps={{ step: '0.01', min: '0' }}
            autoFocus
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Distribution Method
          </Typography>

          <RadioGroup
            value={distributionMethod}
            onChange={(e) => setDistributionMethod(e.target.value)}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="proportional"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">Based on Your Spending Pattern (AI)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Categories where you spend more get larger budgets
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="equal"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">Equal Distribution</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Each category gets ${totalBudgetAmount ? (parseFloat(totalBudgetAmount) / categories.length).toFixed(2) : '0'} per month
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>

          <Box sx={{ p: 1.5, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>This month's spending:</strong> ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTotalBudgetDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveTotalBudget} variant="contained">
            Distribute Budget
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
