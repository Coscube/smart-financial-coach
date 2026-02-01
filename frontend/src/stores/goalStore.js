import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useGoalStore = create(
  devtools((set) => ({
    goals: [],
    isLoading: false,
    error: null,
    setGoals: (goals) => set({ goals }),
    addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
    updateGoal: (id, updates) =>
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      })),
    deleteGoal: (id) =>
      set((state) => ({
        goals: state.goals.filter((g) => g.id !== id),
      })),
    addContribution: (id, amount) =>
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g
        ),
      })),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }))
);
