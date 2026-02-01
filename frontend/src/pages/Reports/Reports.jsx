import { Box, Card, CardContent, Typography, Grid, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useState } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PieChartIcon from '@mui/icons-material/PieChart';

export function Reports() {
  const [timeRange, setTimeRange] = useState('month');

  const handleTimeRangeChange = (_, newValue) => {
    if (newValue) {
      setTimeRange(newValue);
    }
  };

  const expensesByCategory = [
    { category: 'Housing', amount: 1200, percentage: 35, color: '#1976d2' },
    { category: 'Food & Dining', amount: 650, percentage: 19, color: '#2e7d32' },
    { category: 'Transportation', amount: 380, percentage: 11, color: '#ed6c02' },
    { category: 'Utilities', amount: 275, percentage: 8, color: '#9c27b0' },
    { category: 'Entertainment', amount: 180, percentage: 5, color: '#d32f2f' },
    { category: 'Shopping', amount: 420, percentage: 12, color: '#ff9800' },
    { category: 'Healthcare', amount: 50, percentage: 2, color: '#00bcd4' },
    { category: 'Other', amount: 275, percentage: 8, color: '#607d8b' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Financial Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Analyze your spending patterns and financial trends
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          aria-label="time range"
        >
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Total Income</Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                $8,450
              </Typography>
              <Typography variant="body2" color="text.secondary">
                +12% from previous {timeRange}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDownIcon sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="h6">Total Expenses</Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                $3,430
              </Typography>
              <Typography variant="body2" color="text.secondary">
                -5% from previous {timeRange}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PieChartIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Net Savings</Typography>
              </Box>
              <Typography variant="h3" color="primary.main">
                $5,020
              </Typography>
              <Typography variant="body2" color="text.secondary">
                59% savings rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Expenses Breakdown */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expenses by Category
              </Typography>
              <Box sx={{ mt: 2 }}>
                {expensesByCategory.map((item) => (
                  <Box key={item.category} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.category}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        ${item.amount} ({item.percentage}%)
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'grey.200',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                          borderRadius: 4,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Trends
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['October', 'November', 'December', 'January'].map((month, index) => {
                  const income = [7800, 8100, 8200, 8450][index];
                  const expenses = [3200, 3100, 3300, 3430][index];
                  return (
                    <Box key={month}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        {month} 2026
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box
                          sx={{
                            height: 20,
                            width: `${(income / 10000) * 100}%`,
                            backgroundColor: 'success.light',
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="caption" color="success.main">
                          +${income}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                        <Box
                          sx={{
                            height: 20,
                            width: `${(expenses / 10000) * 100}%`,
                            backgroundColor: 'error.light',
                            borderRadius: 1,
                          }}
                        />
                        <Typography variant="caption" color="error.main">
                          -${expenses}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
