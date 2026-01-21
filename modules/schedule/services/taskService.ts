import { Platform } from 'react-native';
import { Task } from '@/types/app';
import { BACKEND_URL } from '@/constants/backend';
import { supabase } from '@/utils/supabase';

// Toggle this to switch between Supabase and Custom Backend
const USE_CUSTOM_BACKEND = false;

export const taskService = {
  async fetchTasks(userId: string, date: Date) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        // Format date as YYYY-MM-DD (Local Time) to avoid UTC shift
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;
        
        const url = `${BACKEND_URL}/api/tasks?userId=${userId}&date=${isoDate}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        return await response.json() as Task[];
    } else {
        // --- Supabase Mode ---
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .order('start_time', { ascending: true });

        if (error) throw error;
        return data as Task[];
    }
  },

  async addTask(task: Omit<Task, 'id' | 'actual_duration' | 'status'>, userId: string) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        const payload = {
            ...task,
            user_id: userId,
            status: 'pending',
            actual_duration: 0
        };

        const response = await fetch(`${BACKEND_URL}/api/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to create task');
        return await response.json() as Task;
    } else {
        // --- Supabase Mode ---
        const { data, error } = await supabase.from('tasks').insert({
          ...task,
          user_id: userId,
          status: 'pending',
          actual_duration: 0
        }).select().single();
    
        if (error) throw error;
        return data as Task;
    }
  },

  async updateTask(taskId: number, updates: Partial<Task>) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update task');
    } else {
        // --- Supabase Mode ---
        const { error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', taskId);
    
        if (error) throw error;
    }
  },

  async deleteTask(taskId: number) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete task');
    } else {
        // --- Supabase Mode ---
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId);
    
        if (error) throw error;
    }
  }
};


