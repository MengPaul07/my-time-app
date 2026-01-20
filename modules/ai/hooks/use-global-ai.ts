import { useState, useCallback } from 'react';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { assistantService } from '../services/assistantService';
import { Task } from '@/types/app';
import { Toast } from '@/components/ui/toast';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useGlobalAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  
  // Access global store
  // We need generic add/update/delete methods. 
  // Note: useTaskStore usually requires 'fetchData' to be called for a specific date to load tasks.
  // But for 'global' operations, we might need to be careful.
  const { addTask, updateTask, deleteTask, tasks, fetchData, selectedDate, 
    courses, addCourse, updateCourse, deleteCourse 
  } = useTaskStore();

  const sendMessage = useCallback(async (text: string) => {
    // 1. Add user message
    const newMsgs = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMsgs);
    setIsThinking(true);

    try {
      // 2. Prepare context
      const tasksContext = tasks.map(t => `- ${t.title} [${t.is_deadline ? 'DDL' : 'Task'}] @ ${t.start_time || 'Floating'}`).join('\n');
      const coursesContext = courses.map(c => `- ${c.name} @ 周${c.day_of_week} ${c.start_time}-${c.end_time}`).join('\n');

      // 3. Call AI Service
      const response = await assistantService.processUserRequest(text, tasksContext, coursesContext);
      
      // 4. Handle Actions
      let systemReply = response.reply;
      const actions = response.actions || [];

      if (actions.length > 0) {
           for (const action of actions) {
               try {
                  console.log("Executing AI Action:", action);
                  if (action.type === 'create_task' && action.data) {
                      const { title, description, startTime, estimatedDuration, isDeadline } = action.data;
                      const dbStartTime = startTime ? new Date(startTime).toISOString() : null; // Turn local string into UTC for DB

                      await addTask({
                          title,
                          description,
                          start_time: dbStartTime,
                          estimated_duration: (estimatedDuration || 30) * 60,
                          is_course: false,
                          is_deadline: !!isDeadline,
                          color: isDeadline ? '#FF3B30' : '#AF52DE'
                      }, null);
                      
                      if (startTime && new Date(startTime).toDateString() === selectedDate.toDateString()) {
                          await fetchData(null, selectedDate);
                      }
                  } 
                  else if (action.type === 'create_course' && action.data) {
                      const { name, location, dayOfWeek, startTime, endTime } = action.data;
                      await addCourse({
                          name,
                          location,
                          day_of_week: dayOfWeek,
                          start_time: startTime,
                          end_time: endTime,
                          color: '#FF9500' 
                      }, null);
                  }
                  else if (action.type === 'delete_task' && action.data?.targetTitleStr) {
                      const targetStr = action.data.targetTitleStr.toLowerCase();
                      if (action.data.deleteAllMatched) {
                          const targets = tasks.filter(t => t.title.toLowerCase().includes(targetStr));
                          for (const t of targets) await deleteTask(t.id);
                      } else {
                          const targetTask = tasks.find(t => t.title.toLowerCase().includes(targetStr));
                          if (targetTask) await deleteTask(targetTask.id);
                      }
                  }
                  else if (action.type === 'delete_course' && action.data?.targetNameStr) {
                      const targetStr = action.data.targetNameStr.toLowerCase();
                      if (action.data.deleteAllMatched) {
                           const targets = courses.filter(c => c.name.toLowerCase().includes(targetStr));
                           for (const c of targets) await deleteCourse(c.id);
                      } else {
                           const targetCourse = courses.find(c => c.name.toLowerCase().includes(targetStr));
                           if (targetCourse) await deleteCourse(targetCourse.id);
                      }
                  }
                  else if (action.type === 'update_task' && action.data?.targetTitleStr) {
                      const targetStr = action.data.targetTitleStr.toLowerCase();
                      const targetTask = tasks.find(t => t.title.toLowerCase().includes(targetStr));
                      if (targetTask && action.data.updates) {
                          const updates = { ...action.data.updates };
                          if (updates.startTime) {
                             updates.start_time = new Date(updates.startTime).toISOString();
                             delete updates.startTime;
                          }
                          await updateTask(targetTask.id, updates);
                      }
                  }
                  else if (action.type === 'update_course' && action.data?.targetNameStr) {
                      const targetStr = action.data.targetNameStr.toLowerCase();
                      const targetCourse = courses.find(c => c.name.toLowerCase().includes(targetStr));
                      if (targetCourse && action.data.updates) {
                          await updateCourse(targetCourse.id, action.data.updates);
                      }
                  }
               } catch (err) {
                  console.warn("AI Action Failed:", action, err);
               }
           }
      }
      
      // 5. Add Assistant Reply
      setMessages(prev => [...prev, { role: 'assistant', content: systemReply }]);

    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "抱歉，我处理时遇到了问题。" }]);
    } finally {
      setIsThinking(false);
    }
  }, [messages, tasks, selectedDate]); // Dependencies

  return {
    messages,
    sendMessage,
    isThinking
  };
}
