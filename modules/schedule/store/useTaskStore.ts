import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Course } from '@/types/app';
import { taskService } from '@/modules/schedule/services/taskService';
import { courseService } from '@/modules/schedule/services/courseService';

// To switch between Local Backend and Supabase, update the flag in taskService.ts and courseService.ts
// For this store, we just need to ensure we are using the "cloud" logic (which now delegates to service)
const ENABLE_CLOUD = true; 
const DAILY_STATUS_REFRESH_KEY = 'schedule:last_daily_status_refresh';
const PENDING_STATUS: Task['status'] = 'pending';

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const refreshTaskStatusIfNewDay = async (tasks: Task[], userId: string | null) => {
  const today = getDateKey();
  const lastRefreshDay = await AsyncStorage.getItem(DAILY_STATUS_REFRESH_KEY);
  if (lastRefreshDay === today) {
    return tasks;
  }

  const shouldResetTasks = tasks.filter((task) => !task.is_course && task.status !== 'pending');
  if (shouldResetTasks.length === 0) {
    await AsyncStorage.setItem(DAILY_STATUS_REFRESH_KEY, today);
    return tasks;
  }

  if (ENABLE_CLOUD && userId) {
    const resetResults = await Promise.allSettled(
      shouldResetTasks.map((task) => taskService.updateTask(task.id, { status: PENDING_STATUS }))
    );
    const resetTaskIds = new Set<number>();
    resetResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        resetTaskIds.add(shouldResetTasks[index].id);
      }
    });

    if (resetTaskIds.size === 0) {
      return tasks;
    }

    const refreshedTasks = tasks.map((task) =>
      resetTaskIds.has(task.id)
        ? {
            ...task,
            status: PENDING_STATUS,
          }
        : task
    );
    await AsyncStorage.setItem(DAILY_STATUS_REFRESH_KEY, today);
    return refreshedTasks;
  }

  const refreshedTasks = tasks.map((task) =>
    !task.is_course && task.status !== 'pending'
      ? {
          ...task,
          status: PENDING_STATUS,
        }
      : task
  );
  await AsyncStorage.setItem('tasks_data', JSON.stringify(refreshedTasks));
  await AsyncStorage.setItem(DAILY_STATUS_REFRESH_KEY, today);
  return refreshedTasks;
};

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
      let nextTasks: Task[] = [];
      let nextCourses: Course[] = [];

      // 1. 如果是 Guest Mode (无 userId)，强制走本地存储，避免发送 invalid UUID 到 Supabase
      if (!userId) {
        const cachedTasks = await AsyncStorage.getItem('tasks_data');
        const cachedCourses = await AsyncStorage.getItem('courses_data');
        nextTasks = cachedTasks ? JSON.parse(cachedTasks) : [];
        nextCourses = cachedCourses ? JSON.parse(cachedCourses) : [];
      } 
      // 2. 如果是登录用户且启用了 Cloud，走 Supabase
      else if (ENABLE_CLOUD) {
        const [tasks, courses] = await Promise.all([
          taskService.fetchTasks(userId, date),
          courseService.fetchCourses(userId)
        ]);
        nextTasks = tasks;
        nextCourses = courses;
      } 
      // 3. Fallback (从未发生，除非手动改代码)
      else {
        const cachedTasks = await AsyncStorage.getItem('tasks_data');
        const cachedCourses = await AsyncStorage.getItem('courses_data');
        nextTasks = cachedTasks ? JSON.parse(cachedTasks) : [];
        nextCourses = cachedCourses ? JSON.parse(cachedCourses) : [];
      }

      const refreshedTasks = await refreshTaskStatusIfNewDay(nextTasks, userId);
      set({ tasks: refreshedTasks, courses: nextCourses });
    } catch (error) {
      console.error('Error fetching task store data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (taskId, updates, isGuest) => {
    const { tasks } = get();
    try {
      if (ENABLE_CLOUD && !isGuest) {
         await taskService.updateTask(taskId, updates);
      }
      
      // Optimistic Update
      const newTasks = tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      set({ tasks: newTasks });
      
      if (!ENABLE_CLOUD || isGuest) {
        await AsyncStorage.setItem('tasks_data', JSON.stringify(newTasks));
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  },

  addTask: async (taskData, userId) => {
    const { tasks } = get();
    try {
      if (userId && ENABLE_CLOUD) {
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
        if (!ENABLE_CLOUD || !userId) {
          await AsyncStorage.setItem('tasks_data', JSON.stringify(newTasks));
        }
      }
    } catch (error) {
      console.error('Error adding task:', error);
      throw error; 
    }
  },

  deleteTask: async (taskId, isGuest) => {
    const { tasks } = get();
    try {
      if (ENABLE_CLOUD && !isGuest) {
        await taskService.deleteTask(taskId);
      }
      
      const newTasks = tasks.filter((t) => t.id !== taskId);
      set({ tasks: newTasks });
      
      if (!ENABLE_CLOUD || isGuest) {
        await AsyncStorage.setItem('tasks_data', JSON.stringify(newTasks));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  },

  addCourse: async (courseData, userId) => {
    const { courses } = get();
    try {
      if (userId && ENABLE_CLOUD) {
        const newCourse = await courseService.addCourse(courseData, userId);
        set({ courses: [...courses, newCourse] });
      } else {
        const newCourse: Course = {
          id: -Date.now(), 
          user_id: undefined,
          ...courseData
        };
        const newCourses = [...courses, newCourse];
        set({ courses: newCourses });
        if (!ENABLE_CLOUD || !userId) {
          await AsyncStorage.setItem('courses_data', JSON.stringify(newCourses));
        }
      }
    } catch (error) {
      console.error('Error adding course:', error);
    }
  },

  updateCourse: async (courseId, updates, isGuest) => {
    const { courses } = get();
    try {
      if (ENABLE_CLOUD && !isGuest) {
        await courseService.updateCourse(courseId, updates);
      }
      
      const newCourses = courses.map((c) => (c.id === courseId ? { ...c, ...updates } : c));
      set({ courses: newCourses });
      
      if (!ENABLE_CLOUD || isGuest) {
        await AsyncStorage.setItem('courses_data', JSON.stringify(newCourses));
      }
    } catch (error) {
      console.error('Error updating course:', error);
    }
  },

  deleteCourse: async (courseId, isGuest) => {
    const { courses } = get();
    try {
      if (ENABLE_CLOUD && !isGuest) {
        await courseService.deleteCourse(courseId);
      }
      
      const newCourses = courses.filter((c) => c.id !== courseId);
      set({ courses: newCourses });
      
      if (!ENABLE_CLOUD || isGuest) {
        await AsyncStorage.setItem('courses_data', JSON.stringify(newCourses));
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  },
}));
