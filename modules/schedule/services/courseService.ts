import { Platform } from 'react-native';
import { Course } from '@/types/app';
import { BACKEND_URL } from '@/constants/backend';
import { supabase } from '@/utils/supabase';

const USE_CUSTOM_BACKEND = false;

export const courseService = {
  async fetchCourses(userId: string) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        const url = `${BACKEND_URL}/api/courses?userId=${userId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch courses');
        return await response.json() as Course[];
    } else {
        // --- Supabase Mode ---
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', userId);
    
        if (error) throw error;
        return data as Course[];
    }
  },

  async addCourse(course: Omit<Course, 'id' | 'user_id'>, userId: string) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        const payload = { ...course, user_id: userId };
        const response = await fetch(`${BACKEND_URL}/api/courses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to create course');
        return await response.json() as Course;
    } else {
        // --- Supabase Mode ---
        const { data, error } = await supabase.from('courses').insert({
          ...course,
          user_id: userId,
        }).select().single();
    
        if (error) throw error;
        return data as Course;
    }
  },

  async updateCourse(courseId: number, updates: Partial<Course>) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        const response = await fetch(`${BACKEND_URL}/api/courses/${courseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error('Failed to update course');
    } else {
        // --- Supabase Mode ---
        const { error } = await supabase
          .from('courses')
          .update(updates)
          .eq('id', courseId);
        
        if (error) throw error;
    }
  },

  async deleteCourse(courseId: number) {
    if (USE_CUSTOM_BACKEND) {
        // --- Backend Mode ---
        const response = await fetch(`${BACKEND_URL}/api/courses/${courseId}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete course');
    } else {
        // --- Supabase Mode ---
        const { error } = await supabase
          .from('courses')
          .delete()
          .eq('id', courseId);
        
        if (error) throw error;
    }
  }
};

