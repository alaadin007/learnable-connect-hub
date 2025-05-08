
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ProStore = {
  isPro: boolean;
  credits: number;
  decrementCredits: () => void;
  setIsPro: (isPro: boolean) => void;
  setCredits: (credits: number) => void;
};

export const useProStore = create<ProStore>()(
  persist(
    (set) => ({
      isPro: false,
      credits: 5, // Default number of free credits
      decrementCredits: () => set((state) => ({ credits: Math.max(0, state.credits - 1) })),
      setIsPro: (isPro: boolean) => set({ isPro }),
      setCredits: (credits: number) => set({ credits }),
    }),
    {
      name: 'pro-store',
    }
  )
);
