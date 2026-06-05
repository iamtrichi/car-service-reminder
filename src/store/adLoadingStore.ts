import { create } from 'zustand';

interface AdLoadingState {
  isAdLoading: boolean;
  setAdLoading: (loading: boolean) => void;
}

export const useAdLoadingStore = create<AdLoadingState>((set) => ({
  isAdLoading: false,
  setAdLoading: (isAdLoading) => set({ isAdLoading }),
}));