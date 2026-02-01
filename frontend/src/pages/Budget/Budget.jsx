import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const budgetCategories = [
  { id: '1', name: 'Housing', budgeted: 1500, spent: 1200, color: '#1976d2' },
  { id: '2', name: 'Food & Dining', budgeted: 800, spent: 650, color: '#2e7d32' },
  { id: '3', name: 'Transportation', budgeted: 400, spent: 380, color: '#ed6c02' },
  { id: '4', name: 'Utilities', budgeted: 300, spent: 275, color: '#9c27b0' },
  { id: '5', name: 'Entertainment', budgeted: 200, spent: 180, color: '#d32f2f' },
  { id: '6', name: 'Healthcare', budgeted: 200, spent: 50, color: '#00bcd4' },
  { id: '7', name: 'Shopping', budgeted: 300, spent: 420, color: '#ff9800' },
  { id: '8', name: 'Savings', budgeted: 500, spent: 500, color: '#4caf50' },
];

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
  const totalBudgeted = budgetCategories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);

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
        {budgetCategories.map((category) => (
          <Grid size={{ xs: 12, md: 6 }} key={category.id}>
            <BudgetCategoryCard category={category} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
