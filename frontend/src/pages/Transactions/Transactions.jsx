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
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const initialForm = {
  amount: '',
  category: '',
  description: '',
  transaction_date: '',
};

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionType, setTransactionType] = useState(''); // '' for all, 'expense' or 'income'
  const [dateFilter, setDateFilter] = useState('all'); // Default to showing all transactions
  const [selectedYear, setSelectedYear] = useState(''); // '' for all years
  const [selectedMonth, setSelectedMonth] = useState(''); // '' for all months (0-11 when selected)
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
  const [openExcelDialog, setOpenExcelDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Get available years from transactions
  const availableYears = [...new Set(transactions.map(t => new Date(t.transaction_date).getFullYear()))].sort((a, b) => b - a);
  
  // Get available months for selected year
  const availableMonths = selectedYear 
    ? [...new Set(transactions
        .filter(t => new Date(t.transaction_date).getFullYear() === parseInt(selectedYear))
        .map(t => new Date(t.transaction_date).getMonth())
      )].sort((a, b) => a - b)
    : [];

  // Month names for display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch transactions from backend
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch with a large limit to get all transactions (up to 1000)
        const data = await apiClient.get('/transactions', { skip: 0, limit: 1000 });
        console.log('Fetched transactions:', data);
        console.log('Number of transactions:', Array.isArray(data) ? data.length : 'Not an array');
        if (Array.isArray(data) && data.length > 0) {
          console.log('First transaction:', data[0]);
        }
        setTransactions(data || []);
      } catch (err) {
        setError('Failed to load transactions');
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const expenseData = await apiClient.get('/categories', { transaction_type: 'expense' });
        const incomeData = await apiClient.get('/categories', { transaction_type: 'income' });
        
        // Extract just the category names
        const expenseNames = (expenseData || []).map(cat => cat.name);
        const incomeNames = (incomeData || []).map(cat => cat.name);
        
        setExpenseCategories(expenseNames);
        setIncomeCategories(incomeNames);
        console.log('Loaded expense categories:', expenseNames);
        console.log('Loaded income categories:', incomeNames);
      } catch (err) {
        console.error('Error fetching categories:', err);
        // Fallback to empty arrays if fetch fails
        setExpenseCategories([]);
        setIncomeCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
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

    // Year/Month filter (new approach - filter by actual transaction years/months)
    const transactionDate = new Date(t.transaction_date);
    const txYear = transactionDate.getFullYear();
    const txMonth = transactionDate.getMonth();
    
    let matchesYear = true;
    let matchesMonth = true;
    
    if (selectedYear) {
      matchesYear = txYear === parseInt(selectedYear);
    }
    
    if (selectedMonth !== '') {
      matchesMonth = txMonth === parseInt(selectedMonth);
    }

    // Custom date range filter (Period)
    let matchesDateRange = true;
    if (dateFilter === 'period' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      endDate.setDate(endDate.getDate() + 1); // Include end date
      transactionDate.setHours(0, 0, 0, 0);
      matchesDateRange = transactionDate >= startDate && transactionDate < endDate;
    }

    return matchesSearch && matchesType && matchesYear && matchesMonth && matchesDateRange;
  });

  // Log filtered results
  useEffect(() => {
    console.log(`Filtered transactions: ${filteredTransactions.length}/${transactions.length}`);
    console.log('Filters:', { selectedYear, selectedMonth, transactionType, searchQuery, dateFilter });
    if (filteredTransactions.length > 0) {
      console.log('Sample filtered transaction:', filteredTransactions[0]);
    }
  }, [filteredTransactions, selectedYear, selectedMonth, transactionType, searchQuery, transactions, dateFilter]);

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

  // Excel upload handlers
  const handleOpenExcelDialog = () => {
    setOpenExcelDialog(true);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleCloseExcelDialog = () => {
    setOpenExcelDialog(false);
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const result = await apiClient.uploadFile('/upload/excel', selectedFile);
      setUploadResult(result);
      setSelectedFile(null);
      // Refresh transactions list after successful upload
      const data = await apiClient.get('/transactions');
      setTransactions(data || []);
    } catch (error) {
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Add Transaction handler
  const handleAddTransaction = async () => {
    setFormError(null);

    if (!form.amount || !form.category || !form.transaction_date) {
      setFormError('Amount, category, and date are required.');
      return;
    }

    const { amount, category, description, transaction_date } = form;
    
    // Convert date string to ISO format datetime
    const dateObj = new Date(transaction_date + 'T00:00:00Z');
    
    const newTransaction = {
      amount: parseFloat(amount),
      category,
      description: description || null,
      transaction_date: dateObj.toISOString(),
      transaction_type: formTransactionType,
    };

    console.log('Adding transaction:', newTransaction);

    try {
      const response = await apiClient.post('/transactions', newTransaction);
      console.log('Transaction added successfully:', response);

      // Refresh list with pagination parameters
      const data = await apiClient.get('/transactions', { skip: 0, limit: 1000 });
      console.log('Transactions refreshed:', data);
      setTransactions(data || []);
      setForm(initialForm); // Reset form
      handleClose();
    } catch (err) {
      setFormError('Failed to add transaction: ' + (err.message || 'Unknown error'));
      console.error('Error adding transaction:', err);
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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen} size="large">
            Add Transaction
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={handleOpenExcelDialog}
            size="large"
          >
            Upload Excel
          </Button>
        </Box>
      </Box>

      {/* Add Transaction Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>Add {formTransactionType === 'expense' ? 'Expense' : 'Income'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Transaction Type
            </Typography>
            <ToggleButtonGroup
              value={formTransactionType}
              exclusive
              onChange={(e, newValue) => {
                if (newValue) setFormTransactionType(newValue);
              }}
              aria-label="transaction form type"
              fullWidth
              size="small"
            >
              <ToggleButton value="expense" aria-label="expense">
                <Typography variant="button">Expense</Typography>
              </ToggleButton>
              <ToggleButton value="income" aria-label="income">
                <Typography variant="button">Income</Typography>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
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
            Filter by Year
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedMonth(''); // Reset month when year changes
            }}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">All Years</MenuItem>
            {availableYears.map((year) => (
              <MenuItem key={year} value={year.toString()}>
                {year}
              </MenuItem>
            ))}
          </TextField>

          {selectedYear && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Filter by Month
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                sx={{ mb: 2 }}
              >
                <MenuItem value="">All Months</MenuItem>
                {availableMonths.map((month) => (
                  <MenuItem key={month} value={month.toString()}>
                    {monthNames[month]}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}

          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Custom Date Range
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setDateFilter('period');
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setDateFilter('period');
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>
          {(customStartDate || customEndDate) && (
            <Button
              size="small"
              sx={{ mt: 1 }}
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
                setDateFilter('all');
              }}
            >
              Clear Date Range
            </Button>
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
                        color: transaction.transaction_type === 'income' ? 'success.main' : 'error.main',
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

      {/* Excel Upload Dialog */}
      <Dialog open={openExcelDialog} onClose={handleCloseExcelDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Excel File</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadError}
            </Alert>
          )}
          
          {uploadResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{uploadResult.message}</strong>
              </Typography>
              <Typography variant="body2">
                Expenses imported: {uploadResult.expenses_imported}
              </Typography>
              <Typography variant="body2">
                Income imported: {uploadResult.income_imported}
              </Typography>
              <Typography variant="body2">
                Total: {uploadResult.total_imported} transactions
              </Typography>
              {uploadResult.errors?.length > 0 && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                  {uploadResult.errors.length} row(s) had errors
                </Typography>
              )}
            </Alert>
          )}

          <TextField
            type="file"
            inputProps={{ accept: '.xlsx,.xls' }}
            fullWidth
            onChange={handleFileSelect}
            InputLabelProps={{ shrink: true }}
            label="Choose Excel File"
            variant="outlined"
            disabled={uploading}
          />
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
              ✓ {selectedFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseExcelDialog} disabled={uploading}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
          {!uploadResult && (
            <Button
              onClick={handleUploadFile}
              variant="contained"
              disabled={!selectedFile || uploading}
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
