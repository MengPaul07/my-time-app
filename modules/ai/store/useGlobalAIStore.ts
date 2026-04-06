import { create } from 'zustand';

interface GlobalAIState {
  isExpanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  openAI: () => void;
  closeAI: () => void;
}

export const useGlobalAIStore = create<GlobalAIState>((set) => ({
  isExpanded: false,
  setExpanded: (expanded) => set({ isExpanded: expanded }),
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
  openAI: () => set({ isExpanded: true }),
  closeAI: () => set({ isExpanded: false }),
}));
