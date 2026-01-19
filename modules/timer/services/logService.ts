import { supabase } from '@/utils/supabase';

export const logService = {
  async uploadStudyLog(userId: string, duration: number, taskId: number | null) {
    const { error } = await supabase.from('study_logs').insert({
      user_id: userId,
      duration: duration,
      task_id: taskId,
    });

    if (error) throw error;
  }
};
