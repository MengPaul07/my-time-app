import { supabase } from '@/utils/supabase';
import { Task } from '@/types/app';

export const taskService = {
  async fetchTasks(userId: string, date: Date) {
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
  },

  async addTask(task: Omit<Task, 'id' | 'actual_duration' | 'status'>, userId: string) {
    const { data, error } = await supabase.from('tasks').insert({
      ...task,
      user_id: userId,
      status: 'pending',
      actual_duration: 0
    }).select().single();

    if (error) throw error;
    return data as Task;
  },

  async updateTask(taskId: number, updates: Partial<Task>) {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) throw error;
  },

  async deleteTask(taskId: number) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  }
};
