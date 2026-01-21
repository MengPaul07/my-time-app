import { create } from 'zustand';
import { TimerState, Task } from '@/types/app';

interface TimerStore extends TimerState {
  currentTask: Task | null;
  
  // Actions
  setTimeLeft: (time: number) => void;
  setTotalDuration: (time: number) => void;
  setIsActive: (active: boolean) => void;
  setIsSessionActive: (active: boolean) => void;
  setCurrentTask: (task: Task | null) => void;
  setMode: (mode: 'focus' | 'break') => void;
  
  reset: () => void;
}

const initialState: TimerState = {
  timeLeft: 1500, // 25 mins
  totalDuration: 1500,
  isActive: false,
  isSessionActive: false,
  currentTask: null,
  mode: 'focus',
};

export const useTimerStore = create<TimerStore>((set) => ({
  ...initialState,
  currentTask: null,

  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setTotalDuration: (totalDuration) => set({ totalDuration }),
  setIsActive: (isActive) => set({ isActive }),
  setIsSessionActive: (isSessionActive) => set({ isSessionActive }),
  setCurrentTask: (currentTask) => set({ 
    currentTask, 
  }),
  setMode: (mode) => set({ mode }),

  reset: () => set(initialState),
}));
