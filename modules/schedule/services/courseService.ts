import { supabase } from '@/utils/supabase';
import { Course } from '@/types/app';

export const courseService = {
  async fetchCourses(userId: string) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data as Course[];
  },

  async addCourse(course: Omit<Course, 'id' | 'user_id'>, userId: string) {
    const { data, error } = await supabase.from('courses').insert({
      ...course,
      user_id: userId,
    }).select().single();

    if (error) throw error;
    return data as Course;
  },

  async updateCourse(courseId: number, updates: Partial<Course>) {
    const { error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId);
    
    if (error) throw error;
  },

  async deleteCourse(courseId: number) {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);
      
    if (error) throw error;
  }
};
