import { useState, useEffect } from 'react';
import { apiClient } from '../../services';
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  MenuItem,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const initialForm = {
  amount: '',
  category: '',
  description: '',
  transaction_date: '',
};

const expenseCategories = [
  'housing',
  'utilities',
  'groceries',
  'transportation',
  'healthcare',
  'entertainment',
  'dining',
  'shopping',
  'education',
  'insurance',
  'savings',
  'debt_payment',
  'other_expense',
];

const incomeCategories = ['salary', 'freelance', 'investment', 'gift', 'other_income'];

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionType, setTransactionType] = useState(''); // '' for all, 'expense' or 'income'
  const [dateFilter, setDateFilter] = useState('month');
  const [sortBy, setSortBy] = useState('date');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [formTransactionType, setFormTransactionType] = useState('expense'); // For the add form

  // Get date range based on filter
  const getDateRange = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    switch (dateFilter) {
      case 'day':
        // Today only
        return {
          start: new Date(currentYear, currentMonth, today.getDate()),
          end: new Date(currentYear, currentMonth, today.getDate() + 1),
        };
      case 'week':
        // Last 7 days
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart, end: today };
      case 'month':
        // Current month
        return {
          start: new Date(currentYear, currentMonth, 1),
          end: new Date(currentYear, currentMonth + 1, 0),
        };
      case 'year':
        // Current year
        return {
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31),
        };
      case 'period':
        // Custom period
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null,
        };
      default:
        return null;
    }
  };

  // Fetch transactions from backend
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get('/transactions');
        setTransactions(data || []);
      } catch (err) {
        setError('Failed to load transactions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  // Filter transactions by date, search, and type
  const filteredTransactions = transactions.filter((t) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase());

    // Transaction type filter
    const matchesType = !transactionType || t.transaction_type === transactionType;

    // Date filter
    const transactionDate = new Date(t.transaction_date);
    const dateRange = getDateRange();
    let matchesDate = true;

    if (dateRange?.start && dateRange?.end) {
      matchesDate = transactionDate >= dateRange.start && transactionDate <= dateRange.end;
    }

    return matchesSearch && matchesDate && matchesType;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.transaction_date) - new Date(a.transaction_date);
    } else if (sortBy === 'amount') {
      return parseFloat(b.amount) - parseFloat(a.amount);
    }
    return 0;
  });

  // Modal handlers
  const handleOpen = () => {
    setForm(initialForm);
    setFormError(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormError(null);
  };

  // Form change handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Add Transaction handler
  const handleAddTransaction = async () => {
    setFormError(null);

    if (!form.amount || !form.category || !form.transaction_date) {
      setFormError('Amount, category, and date are required.');
      return;
    }

    const { amount, category, description, transaction_date } = form;
    const newTransaction = {
      amount: parseFloat(amount),
      category,
      description,
      transaction_date,
      transaction_type: formTransactionType,
    };

    try {
      await apiClient.post('/transactions', newTransaction);

      // Refresh list from unified endpoint
      const data = await apiClient.get('/transactions');
      setTransactions(data || []);
      handleClose();
    } catch (err) {
      setFormError('Failed to add transaction');
      console.error(err);
    }
  };

  // Format category for display
  const formatCategory = (cat) => cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Transactions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your financial transactions
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen} size="large">
          Add Transaction
        </Button>
      </Box>

      {/* Add Transaction Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Add {formTransactionType === 'expense' ? 'Expense' : 'Income'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            margin="normal"
            label="Amount"
            name="amount"
            type="number"
            fullWidth
            value={form.amount}
            onChange={handleFormChange}
            required
            inputProps={{ step: '0.01' }}
          />
          <TextField
            margin="normal"
            label="Category"
            name="category"
            select
            fullWidth
            value={form.category}
            onChange={handleFormChange}
            required
          >
            {(formTransactionType === 'expense' ? expenseCategories : incomeCategories).map(
              (cat) => (
                <MenuItem key={cat} value={cat}>
                  {formatCategory(cat)}
                </MenuItem>
              )
            )}
          </TextField>
          <TextField
            margin="normal"
            label="Description"
            name="description"
            fullWidth
            multiline
            rows={2}
            value={form.description}
            onChange={handleFormChange}
          />
          <TextField
            margin="normal"
            label="Date"
            name="transaction_date"
            type="date"
            fullWidth
            value={form.transaction_date}
            onChange={handleFormChange}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              max: new Date().toISOString().split('T')[0],
            }}
            required
          />
          {formError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {formError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAddTransaction} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Type Toggle & Filters */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
        {/* Toggle for Add Form Type */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Add Transaction Type
          </Typography>
          <ToggleButtonGroup
            value={formTransactionType}
            exclusive
            onChange={(e, newValue) => {
              if (newValue) setFormTransactionType(newValue);
            }}
            aria-label="transaction form type"
            fullWidth
          >
            <ToggleButton value="expense" aria-label="expense">
              <Typography variant="button">Expense</Typography>
            </ToggleButton>
            <ToggleButton value="income" aria-label="income">
              <Typography variant="button">Income</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Filter by Type */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Filter by Type
          </Typography>
          <ToggleButtonGroup
            value={transactionType}
            exclusive
            onChange={(e, newValue) => {
              setTransactionType(newValue);
            }}
            aria-label="transaction type filter"
            fullWidth
          >
            <ToggleButton value="" aria-label="all">
              <Typography variant="button">All</Typography>
            </ToggleButton>
            <ToggleButton value="expense" aria-label="expense">
              <Typography variant="button">Expense</Typography>
            </ToggleButton>
            <ToggleButton value="income" aria-label="income">
              <Typography variant="button">Income</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Date Range Filters */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Filter by Period
          </Typography>
          <ToggleButtonGroup
            value={dateFilter}
            exclusive
            onChange={(e, newValue) => {
              if (newValue) setDateFilter(newValue);
            }}
            aria-label="date filter"
            fullWidth
          >
            <ToggleButton value="day" aria-label="day">
              <Typography variant="body2">Day</Typography>
            </ToggleButton>
            <ToggleButton value="week" aria-label="week">
              <Typography variant="body2">Week</Typography>
            </ToggleButton>
            <ToggleButton value="month" aria-label="month">
              <Typography variant="body2">Month</Typography>
            </ToggleButton>
            <ToggleButton value="year" aria-label="year">
              <Typography variant="body2">Year</Typography>
            </ToggleButton>
            <ToggleButton value="period" aria-label="period">
              <Typography variant="body2">Period</Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Custom Period Date Pickers */}
          {dateFilter === 'period' && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                flex={1}
              />
              <TextField
                label="End Date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                flex={1}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Search and Sort Header */}
      <Box sx={{ mb: 3 }}>
        <Card sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Total{' '}
                {transactionType === 'expense'
                  ? 'Expenses'
                  : transactionType === 'income'
                    ? 'Income'
                    : 'Transactions'}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color:
                    transactionType === 'income'
                      ? 'success.main'
                      : transactionType === 'expense'
                        ? 'error.main'
                        : 'inherit',
                  fontWeight: 700,
                }}
              >
                ${sortedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                select
                size="small"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="date">Date (Newest)</MenuItem>
                <MenuItem value="amount">Amount (Highest)</MenuItem>
              </TextField>
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by description or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Card>
      </Box>

      {/* Transactions Table */}
      <Card>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, color: 'error.main', textAlign: 'center' }}>
            <Typography>{error}</Typography>
          </Box>
        ) : filteredTransactions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>No transactions found for the selected filters.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedTransactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {transaction.transaction_date
                        ? new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell>{transaction.description || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={formatCategory(transaction.category)}
                        size="small"
                        variant="outlined"
                        color={transaction.transaction_type === 'income' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          transaction.transaction_type?.charAt(0).toUpperCase() +
                          transaction.transaction_type?.slice(1)
                        }
                        size="small"
                        color={transaction.transaction_type === 'income' ? 'success' : 'error'}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: viewType === 'income' ? 'success.main' : 'error.main',
                        fontWeight: 600,
                      }}
                    >
                      ${parseFloat(transaction.amount).toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" aria-label="edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
