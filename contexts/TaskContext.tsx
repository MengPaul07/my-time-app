import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Task {
  id: number;
  title: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  estimated_duration?: number;
  actual_duration?: number;
  start_time?: string;
}

interface TaskContextType {
  currentTask: Task | null;
  setCurrentTask: (task: Task | null) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  return (
    <TaskContext.Provider value={{ currentTask, setCurrentTask }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
