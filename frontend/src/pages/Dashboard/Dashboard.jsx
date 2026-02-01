import { Box, Card, CardContent, Grid, Typography, LinearProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';

function StatCard({ title, value, icon, trend, color }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {trend.isPositive ? (
                  <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16 }} />
                ) : (
                  <TrendingDownIcon sx={{ color: 'error.main', fontSize: 16 }} />
                )}
                <Typography
                  variant="body2"
                  sx={{ color: trend.isPositive ? 'success.main' : 'error.main', ml: 0.5 }}
                >
                  {trend.value}% from last month
                </Typography>
              </Box>
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

export function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back! Here&apos;s your financial overview.
      </Typography>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Balance"
            value="$24,562"
            icon={<AccountBalanceWalletIcon sx={{ color: 'white' }} />}
            trend={{ value: 12, isPositive: true }}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Monthly Income"
            value="$8,450"
            icon={<TrendingUpIcon sx={{ color: 'white' }} />}
            trend={{ value: 8, isPositive: true }}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Monthly Expenses"
            value="$5,230"
            icon={<TrendingDownIcon sx={{ color: 'white' }} />}
            trend={{ value: 3, isPositive: false }}
            color="#ed6c02"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Savings"
            value="$3,220"
            icon={<SavingsIcon sx={{ color: 'white' }} />}
            trend={{ value: 15, isPositive: true }}
            color="#9c27b0"
          />
        </Grid>

        {/* Budget Progress */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Budget Progress
              </Typography>
              <Box sx={{ mt: 2 }}>
                {[
                  { category: 'Housing', spent: 1200, budget: 1500, color: '#1976d2' },
                  { category: 'Food & Dining', spent: 650, budget: 800, color: '#2e7d32' },
                  { category: 'Transportation', spent: 380, budget: 400, color: '#ed6c02' },
                  { category: 'Entertainment', spent: 180, budget: 200, color: '#9c27b0' },
                ].map((item) => (
                  <Box key={item.category} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">{item.category}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ${item.spent} / ${item.budget}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.spent / item.budget) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: item.color,
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Financial Tips
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  💡 You&apos;re doing great! Your spending is 15% below your budget this month.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  📈 Consider increasing your emergency fund contribution by $100/month.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🎯 You&apos;re on track to reach your vacation savings goal by August!
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
