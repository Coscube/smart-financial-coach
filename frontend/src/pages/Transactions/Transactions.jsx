import { useState } from 'react';
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

const transactions = [
  { id: '1', date: '2026-01-30', description: 'Salary Deposit', category: 'Income', amount: 5000, type: 'income' },
  { id: '2', date: '2026-01-29', description: 'Grocery Store', category: 'Food & Dining', amount: 125.50, type: 'expense' },
  { id: '3', date: '2026-01-28', description: 'Electric Bill', category: 'Utilities', amount: 85.00, type: 'expense' },
  { id: '4', date: '2026-01-27', description: 'Gas Station', category: 'Transportation', amount: 45.00, type: 'expense' },
  { id: '5', date: '2026-01-26', description: 'Freelance Payment', category: 'Income', amount: 800, type: 'income' },
  { id: '6', date: '2026-01-25', description: 'Restaurant', category: 'Food & Dining', amount: 65.00, type: 'expense' },
  { id: '7', date: '2026-01-24', description: 'Netflix Subscription', category: 'Entertainment', amount: 15.99, type: 'expense' },
  { id: '8', date: '2026-01-23', description: 'Rent Payment', category: 'Housing', amount: 1200, type: 'expense' },
];

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions.filter(
    (t) =>
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Button variant="contained" startIcon={<AddIcon />}>
          Add Transaction
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
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={transaction.category}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: transaction.type === 'income' ? 'success.main' : 'error.main',
                      fontWeight: 500,
                    }}
                  >
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
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
      </Card>
    </Box>
  );
}
