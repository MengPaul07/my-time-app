/**
 * 强类型定义文件
 * 统一管理应用内所有核心实体与状态类型
 */

// --- 任务相关 (Tasks) ---
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: number;
  user_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  estimated_duration?: number; //存储为秒 (Seconds)
  actual_duration: number; // 秒
  start_time?: string | null; // ISOString
  created_at?: string;
  updated_at?: string;
  is_course?: boolean;
  location?: string;
  color?: string;
  is_deadline?: boolean;
}

// --- 课程相关 (Courses) ---
export interface Course {
  id: number;
  user_id?: string;
  name: string;
  location: string;
  day_of_week: number; // 1-7
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  color?: string;
}

// --- 用户与配置文件 (User & Profile) ---
export interface Profile {
  id: string;
  username?: string;
  avatar_url?: string;
  updated_at?: string;
  full_name?: string;
}

export interface UserStats {
  total_focus_time: number; // 秒
  today_focus_time: number;
  completed_tasks: number;
  streak_days: number;
}

// --- 计时器相关 (Timer) ---
export interface TimerState {
  timeLeft: number;
  totalDuration: number;
  isActive: boolean;
  isSessionActive: boolean;
  currentTask: Task | null;
  mode: 'focus' | 'break';
}

// --- UI 状态相关 (UI State) ---
export interface ToastConfig {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}
