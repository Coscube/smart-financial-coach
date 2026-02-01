import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, MenuItem } from '@mui/material';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Remove static transactions, use state instead

const initialForm = {
  amount: '',
  category: '',
  description: '',
  transaction_date: '',
};

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState('expense'); // 'expense' or 'income'
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState(null);

  // Fetch transactions from backend based on viewType
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = viewType === 'expense' ? '/expense' : '/income';
        const data = await apiClient.get(endpoint);
        setTransactions(data);
      } catch (err) {
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [viewType]);

  const filteredTransactions = transactions.filter(
    (t) =>
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open/close modal
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
    // Basic validation
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
    };
    try {
      const endpoint = viewType === 'expense' ? '/expense' : '/income';
      await apiClient.post(endpoint, newTransaction);
      // Refresh list
      const data = await apiClient.get(endpoint);
      setTransactions(data);
      handleClose();
    } catch (err) {
      setFormError('Failed to add transaction');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Transactions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your financial transactions
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          Add Transaction
        </Button>
        {/* Add Transaction Modal */}
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
          <DialogTitle>Add {viewType === 'expense' ? 'Expense' : 'Income'}</DialogTitle>
          <DialogContent>
            <TextField
              margin="normal"
              label="Amount"
              name="amount"
              type="number"
              fullWidth
              value={form.amount}
              onChange={handleFormChange}
              required
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
              {viewType === 'expense'
                ? [
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
                  ].map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </MenuItem>
                  ))
                : ['salary', 'freelance', 'investment', 'gift', 'other_income'].map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </MenuItem>
                  ))}
            </TextField>
            <TextField
              margin="normal"
              label="Description"
              name="description"
              fullWidth
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
              required
            />
            {formError && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
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
      </Box>

      {/* Toggle Button for Income/Expense */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Button
          variant={viewType === 'expense' ? 'contained' : 'outlined'}
          color={viewType === 'expense' ? 'error' : 'inherit'}
          onClick={() => setViewType('expense')}
          sx={{ mr: 1 }}
        >
          Expense
        </Button>
        <Button
          variant={viewType === 'income' ? 'contained' : 'outlined'}
          color={viewType === 'income' ? 'success' : 'inherit'}
          onClick={() => setViewType('income')}
        >
          Income
        </Button>
      </Box>

      {/* Search */}
      <Card sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search transactions..."
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

      {/* Transactions Table */}
      <Card>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>Loading...</Box>
        ) : error ? (
          <Box sx={{ p: 3, color: 'error.main', textAlign: 'center' }}>{error}</Box>
        ) : filteredTransactions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
            No {viewType === 'expense' ? 'expense' : 'income'} entries found.
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {transaction.transaction_date
                        ? new Date(transaction.transaction_date).toLocaleDateString()
                        : ''}
                    </TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>
                      <Chip label={transaction.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: viewType === 'income' ? 'success.main' : 'error.main',
                        fontWeight: 500,
                      }}
                    >
                      {viewType === 'income' ? '+' : '-'}$
                      {transaction.amount?.toLocaleString?.() ?? transaction.amount}
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
