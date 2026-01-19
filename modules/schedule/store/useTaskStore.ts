import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Course } from '@/types/app';
import { taskService } from '@/modules/schedule/services/taskService';
import { courseService } from '@/modules/schedule/services/courseService';

const ENABLE_SUPABASE = false; // 强制本地模式 (Supabase已保留但失效)

interface TaskState {
  tasks: Task[];
  courses: Course[];
  isLoading: boolean;
  selectedDate: Date;

  // Actions
  setTasks: (tasks: Task[]) => void;
  setCourses: (courses: Course[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedDate: (date: Date) => void;
  
  // Async Actions
  fetchData: (userId: string | null, date: Date) => Promise<void>;
  updateTask: (taskId: number, updates: Partial<Task>, isGuest?: boolean) => Promise<void>;
  deleteTask: (taskId: number, isGuest?: boolean) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'actual_duration' | 'status'>, userId: string | null) => Promise<void>;
  
  // Course Actions
  addCourse: (course: Omit<Course, 'id' | 'user_id'>, userId: string | null) => Promise<void>;
  updateCourse: (courseId: number, updates: Partial<Course>, isGuest?: boolean) => Promise<void>;
  deleteCourse: (courseId: number, isGuest?: boolean) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  courses: [],
  isLoading: false,
  selectedDate: new Date(),

  setTasks: (tasks) => set({ tasks }),
  setCourses: (courses) => set({ courses }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  fetchData: async (userId, date) => {
    set({ isLoading: true });
    try {
      if (ENABLE_SUPABASE && userId) {
        // 利用 Promise.all 并行请求
        const [tasks, courses] = await Promise.all([
          taskService.fetchTasks(userId, date),
          courseService.fetchCourses(userId)
        ]);
        set({ tasks, courses });
      } else {
        // 游客模式 / 本地模式
        const cachedTasks = await AsyncStorage.getItem('tasks_data');
        const cachedCourses = await AsyncStorage.getItem('courses_data');
        if (cachedTasks) set({ tasks: JSON.parse(cachedTasks) });
        if (cachedCourses) set({ courses: JSON.parse(cachedCourses) });
      }
    } catch (error) {
      console.error('Error fetching task store data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (taskId, updates, isGuest) => {
    const { tasks } = get();
    try {
      if (ENABLE_SUPABASE && !isGuest) {
        await taskService.updateTask(taskId, updates);
      }
      
      const newTasks = tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      set({ tasks: newTasks });
      
      if (!ENABLE_SUPABASE || isGuest) {
        await AsyncStorage.setItem('tasks_data', JSON.stringify(newTasks));
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  },

  addTask: async (taskData, userId) => {
    const { tasks } = get();
    try {
      if (ENABLE_SUPABASE && userId) {
        const newTask = await taskService.addTask(taskData, userId);
        set({ tasks: [newTask, ...tasks] });
      } else {
        const newTask: Task = {
          id: Date.now(),
          ...taskData,
          status: 'pending',
          actual_duration: 0
        };
        const newTasks = [newTask, ...tasks];
        set({ tasks: newTasks });
        await AsyncStorage.setItem('tasks_data', JSON.stringify(newTasks));
      }
    } catch (error) {
      console.error('Error adding task:', error);
      throw error; // Rethrow so UI knows it failed
    }
  },

  deleteTask: async (taskId, isGuest) => {
    const { tasks } = get();
    try {
      if (ENABLE_SUPABASE && !isGuest) {
        await taskService.deleteTask(taskId);
      }
      
      const newTasks = tasks.filter((t) => t.id !== taskId);
      set({ tasks: newTasks });
      
      if (!ENABLE_SUPABASE || isGuest) {
        await AsyncStorage.setItem('tasks_data', JSON.stringify(newTasks));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  },

  addCourse: async (courseData, userId) => {
    const { courses } = get();
    try {
      if (ENABLE_SUPABASE && userId) {
        const newCourse = await courseService.addCourse(courseData, userId);
        set({ courses: [...courses, newCourse] });
      } else {
        const newCourse: Course = {
          id: -Date.now(), // 负数ID区别于Task，或者保持原逻辑
          user_id: undefined,
          ...courseData
        };
        const newCourses = [...courses, newCourse];
        set({ courses: newCourses });
        await AsyncStorage.setItem('courses_data', JSON.stringify(newCourses));
      }
    } catch (error) {
      console.error('Error adding course:', error);
    }
  },

  updateCourse: async (courseId, updates, isGuest) => {
    const { courses } = get();
    try {
      if (ENABLE_SUPABASE && !isGuest) {
        await courseService.updateCourse(courseId, updates);
      }
      
      const newCourses = courses.map((c) => (c.id === courseId ? { ...c, ...updates } : c));
      set({ courses: newCourses });
      
      if (!ENABLE_SUPABASE || isGuest) {
        await AsyncStorage.setItem('courses_data', JSON.stringify(newCourses));
      }
    } catch (error) {
      console.error('Error updating course:', error);
    }
  },

  deleteCourse: async (courseId, isGuest) => {
    const { courses } = get();
    try {
      if (ENABLE_SUPABASE && !isGuest) {
        await courseService.deleteCourse(courseId);
      }
      
      const newCourses = courses.filter((c) => c.id !== courseId);
      set({ courses: newCourses });
      
      if (!ENABLE_SUPABASE || isGuest) {
        await AsyncStorage.setItem('courses_data', JSON.stringify(newCourses));
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  },
}));
