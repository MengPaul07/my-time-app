import { useState } from 'react';
import { schedulerService } from '../services/schedulerService';
import { AIScheduleSuggestion } from '../types';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { Task } from '@/types/app';
import { supabase } from '@/utils/supabase';

export function useAIScheduler() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<AIScheduleSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    tasks, courses, addTask, updateTask, deleteTask,
    addCourse, updateCourse, deleteCourse
  } = useTaskStore();

  // 1. Prompt 提取与分析层
  const analyzeInput = async (text: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      // 传递当前的任务和课程作为上下文
      const contextData = [...tasks, ...courses];
      const results = await schedulerService.processAIPrompt(text, contextData);
      
      setSuggestions(results);
    } catch (e) {
      setError('AI 分析失败，请重试');
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. 确认入库层 (Confirmation Layer)
  const confirmSuggestion = async () => {
    if (!suggestions || suggestions.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const suggestion of suggestions) {
        // 根据不同操作类型执行不同逻辑
        if (suggestion.action === 'create') {
            await handleCreate(suggestion, user);
        } else if (suggestion.action === 'update') {
            await handleUpdate(suggestion, user);
        } else if (suggestion.action === 'delete') {
            await handleDelete(suggestion, user);
        }
      }
      
    } catch (e: any) {
      console.error(e);
      setError(`操作失败: ${e.message || JSON.stringify(e)}`);
      throw e;
    }
  };
  
  // --- Helpers ---
  const formatTimeHHMMSS = (isoDate: string) => {
     if (!isoDate) return '00:00:00';
     const date = new Date(isoDate);
     return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
  };

  const handleCreate = async (suggestion: AIScheduleSuggestion, user: any) => {
     if (suggestion.targetType === 'course') {
         const newCourse = {
            name: suggestion.title || '新课程',
            location: suggestion.location || '',
            day_of_week: suggestion.dayOfWeek || 1,
            start_time: suggestion.startTime ? formatTimeHHMMSS(suggestion.startTime) : '08:00:00',
            end_time: suggestion.endTime ? formatTimeHHMMSS(suggestion.endTime) : '09:35:00',
         };
         await addCourse(newCourse, user ? user.id : null);
     } else {
         const durationSeconds = (suggestion.estimatedDuration || 30) * 60;
         const newTask: Omit<Task, 'id' | 'actual_duration' | 'status'> = {
            title: suggestion.title || '新任务',
            description: suggestion.description,
            estimated_duration: durationSeconds,
            start_time: suggestion.startTime, 
            color: '#FFC3A0', 
            is_deadline: false, 
          };
          await addTask(newTask, user ? user.id : null);
     }
  };

  const handleUpdate = async (suggestion: AIScheduleSuggestion, user: any) => {
      if (suggestion.targetType === 'course') {
          const course = courses.find(c => c.name === suggestion.originalTitle);
          if (course) {
             const updates: any = {};
             if (suggestion.title) updates.name = suggestion.title;
             if (suggestion.location) updates.location = suggestion.location;
             if (suggestion.dayOfWeek) updates.day_of_week = suggestion.dayOfWeek;
             if (suggestion.startTime) updates.start_time = formatTimeHHMMSS(suggestion.startTime);
             if (suggestion.endTime) updates.end_time = formatTimeHHMMSS(suggestion.endTime);

             await updateCourse(course.id, updates, !user?.id);
          }
      } else {
          const task = tasks.find(t => t.title === suggestion.originalTitle);
          if (task) {
              const updates: any = {};
              if (suggestion.title) updates.title = suggestion.title;
              if (suggestion.description) updates.description = suggestion.description;
              if (suggestion.startTime) updates.start_time = suggestion.startTime;
              if (suggestion.estimatedDuration) updates.estimated_duration = suggestion.estimatedDuration * 60;
              await updateTask(task.id, updates, !user?.id);
          }
      }
  };

  const handleDelete = async (suggestion: AIScheduleSuggestion, user: any) => {
      if (suggestion.targetType === 'course') {
          const course = courses.find(c => c.name === suggestion.originalTitle);
          if (course) await deleteCourse(course.id, !user?.id);
      } else {
          const task = tasks.find(t => t.title === suggestion.originalTitle);
          if (task) await deleteTask(task.id, !user?.id);
      }
  };

  const clearSuggestion = () => {
    setSuggestions(null);
    setError(null);
  };

  return {
    isAnalyzing,
    suggestions, // renamed from suggestion
    error,
    analyzeInput,
    clearSuggestion,
    confirmSuggestion,
  };
}
