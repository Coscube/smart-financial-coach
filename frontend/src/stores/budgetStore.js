import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useBudgetStore = create(
  devtools((set) => ({
    categories: [],
    isLoading: false,
    error: null,
    setCategories: (categories) => set({ categories }),
    addCategory: (category) =>
      set((state) => ({ categories: [...state.categories, category] })),
    updateCategory: (id, updates) =>
      set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      })),
    deleteCategory: (id) =>
      set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
      })),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }))
);
