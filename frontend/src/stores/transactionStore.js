import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useTransactionStore = create(
  devtools((set) => ({
    transactions: [],
    isLoading: false,
    error: null,
    setTransactions: (transactions) => set({ transactions }),
    addTransaction: (transaction) =>
      set((state) => ({ transactions: [transaction, ...state.transactions] })),
    updateTransaction: (id, updates) =>
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      })),
    deleteTransaction: (id) =>
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      })),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }))
);
