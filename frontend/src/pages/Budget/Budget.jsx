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

function BudgetCategoryCard({ category }) {
  const percentage = (category.spent / category.budgeted) * 100;
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
                ${category.spent.toLocaleString()} of ${category.budgeted.toLocaleString()}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: isOverBudget ? 'error.main' : 'success.main' }}
              >
                {isOverBudget ? `-$${Math.abs(remaining).toLocaleString()}` : `$${remaining.toLocaleString()} left`}
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
            <IconButton size="small" aria-label="edit">
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label="delete">
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

  useEffect(() => {
    fetchExpenseCategories();
  }, []);

  const fetchExpenseCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch only expense categories
      const response = await apiClient.get('/categories', { transaction_type: 'expense' });
      const categoryList = (response || []).map((cat, index) => ({
        id: cat.name,
        name: formatCategoryName(cat.name),
        originalName: cat.name,
        budgeted: 0, // These would come from budget settings
        spent: 0,   // These would be calculated from transactions
        color: getCategoryColor(cat.name, index),
      }));
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories');
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
          <Button variant="contained" startIcon={<AddIcon />}>
            Add Category
          </Button>
      </Box>

      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Total Budgeted
              </Typography>
              <Typography variant="h4">${totalBudgeted.toLocaleString()}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Total Spent
              </Typography>
              <Typography variant="h4">${totalSpent.toLocaleString()}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Remaining
              </Typography>
              <Typography
                variant="h4"
                sx={{ color: totalBudgeted - totalSpent >= 0 ? 'success.main' : 'error.main' }}
              >
                ${(totalBudgeted - totalSpent).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Budget Categories */}
      <Grid container spacing={2}>
        {categories.map((category) => (
          <Grid size={{ xs: 12, md: 6 }} key={category.id}>
            <BudgetCategoryCard category={category} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
