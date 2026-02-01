import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FlagIcon from '@mui/icons-material/Flag';

const goals = [
  {
    id: '1',
    name: 'Emergency Fund',
    targetAmount: 10000,
    currentAmount: 7500,
    deadline: '2026-06-01',
    category: 'Savings',
    icon: '🛡️',
  },
  {
    id: '2',
    name: 'Summer Vacation',
    targetAmount: 3000,
    currentAmount: 1800,
    deadline: '2026-08-01',
    category: 'Travel',
    icon: '✈️',
  },
  {
    id: '3',
    name: 'New Laptop',
    targetAmount: 2000,
    currentAmount: 500,
    deadline: '2026-04-01',
    category: 'Tech',
    icon: '💻',
  },
  {
    id: '4',
    name: 'Investment Portfolio',
    targetAmount: 15000,
    currentAmount: 8000,
    deadline: '2026-12-31',
    category: 'Investment',
    icon: '📈',
  },
];

function GoalCard({ goal }) {
  const percentage = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const deadline = new Date(goal.deadline);
  const today = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ mr: 2 }}>
            {goal.icon}
          </Typography>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{goal.name}</Typography>
            <Chip label={goal.category} size="small" variant="outlined" />
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {percentage.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              height: 12,
              borderRadius: 6,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 6,
                background: `linear-gradient(90deg, #1976d2, #42a5f5)`,
              },
            }}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Saved
            </Typography>
            <Typography variant="h6" color="success.main">
              ${goal.currentAmount.toLocaleString()}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Remaining
            </Typography>
            <Typography variant="h6">${remaining.toLocaleString()}</Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Target
            </Typography>
            <Typography variant="body1">${goal.targetAmount.toLocaleString()}</Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Days Left
            </Typography>
            <Typography variant="body1" color={daysRemaining < 30 ? 'warning.main' : 'text.primary'}>
              {daysRemaining} days
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export function Goals() {
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Financial Goals
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your progress towards your financial goals
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Goal
        </Button>
      </Box>

      {/* Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 2 }}>
              <Box
                sx={{
                  backgroundColor: 'primary.main',
                  borderRadius: 2,
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FlagIcon sx={{ color: 'white', fontSize: 40 }} />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Total Goals Progress
              </Typography>
              <Typography variant="h4">
                ${totalSaved.toLocaleString()} / ${totalTarget.toLocaleString()}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <LinearProgress
                variant="determinate"
                value={(totalSaved / totalTarget) * 100}
                sx={{
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 10,
                    background: 'linear-gradient(90deg, #1976d2, #9c27b0)',
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'right' }}>
                {((totalSaved / totalTarget) * 100).toFixed(1)}% Complete
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Goals Grid */}
      <Grid container spacing={3}>
        {goals.map((goal) => (
          <Grid size={{ xs: 12, md: 6 }} key={goal.id}>
            <GoalCard goal={goal} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
