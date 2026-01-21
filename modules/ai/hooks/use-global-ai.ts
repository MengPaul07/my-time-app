import { useState, useCallback } from 'react';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
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
  const { addTask, updateTask, deleteTask, tasks, fetchData, selectedDate, 
    courses, addCourse, updateCourse, deleteCourse 
  } = useTaskStore();

  const { session } = useUserStore(); // 获取当前用户会话

  const sendMessage = useCallback(async (text: string) => {
    // 1. Add user message
    const newMsgs = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMsgs);
    setIsThinking(true);

    try {
      // 2. Prepare context
      const tasksContext = tasks.map(t => `- ${t.title} [${t.is_deadline ? 'DDL' : 'Task'}] @ ${t.start_time || 'Floating'}`).join('\n');
      const coursesContext = courses.map(c => `- ${c.name} @ 周${c.day_of_week} ${c.start_time}-${c.end_time}`).join('\n');

      // 3. Prepare History (last 3 messages)
      const history = messages.slice(-3);

      // 4. Call AI Service
      const response = await assistantService.processUserRequest(text, tasksContext, coursesContext, history);
      
      // 5. Handle Actions
      let systemReply = response.reply;
      const actions = response.actions || [];
      const userId = session?.user?.id || null;

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
                          // is_course: false, // 数据库无此字段，Task 默认为非 Course
                          is_deadline: !!isDeadline,
                          color: isDeadline ? '#FF3B30' : '#AF52DE'
                      }, userId);
                      
                      if (startTime && new Date(startTime).toDateString() === selectedDate.toDateString()) {
                          await fetchData(userId, selectedDate);
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
                      }, userId);
                  }
                  else if (action.type === 'delete_task' && action.data?.targetTitleStr) {
                      const targetStr = action.data.targetTitleStr.toLowerCase().trim();
                      const isGuest = !userId;
                      
                      // 增强对“删除所有”的判定逻辑
                      const allKeywords = ['all', '所有', '全部'];
                      const genericKeywords = ['任务', 'task', 'tasks'];
                      
                      const hasAllKeyword = allKeywords.some(k => targetStr.includes(k));
                      const isGenericOnly = genericKeywords.includes(targetStr);
                      
                      // 如果包含 "all/所有" 或者是仅仅说了 "任务" 且意图是 deleteAllMatched，则认为是全删
                      const isDeleteAll = hasAllKeyword || (isGenericOnly && action.data.deleteAllMatched);

                      console.log(`[AI Delete Task] Try to delete '${targetStr}'. IsDeleteAll=${isDeleteAll}`);

                      let targets: Task[] = [];
                      if (isDeleteAll) {
                          targets = [...tasks]; 
                      } else if (action.data.deleteAllMatched) {
                          targets = tasks.filter(t => t.title.toLowerCase().includes(targetStr));
                      } else {
                          const targetTask = tasks.find(t => t.title.toLowerCase().includes(targetStr));
                          if (targetTask) targets = [targetTask];
                      }

                      console.log(`[AI Delete Task] Found ${targets.length} matched tasks.`);

                      // 并发删除提高效率 (Promise.all)
                      if (targets.length > 0) {
                          const results = await Promise.allSettled(targets.map(t => deleteTask(t.id, isGuest)));
                          const failed = results.filter(r => r.status === 'rejected');
                          if (failed.length > 0) console.warn(`[AI Delete Task] ${failed.length} deletions failed.`);
                      }
                  }
                  else if (action.type === 'delete_course' && action.data?.targetNameStr) {
                      const targetStr = action.data.targetNameStr.toLowerCase().trim();
                      const isGuest = !userId;

                      // 增强对“删除所有”的判定逻辑
                      const allKeywords = ['all', '所有', '全部'];
                      const genericKeywords = ['课程', 'course', 'courses', '课'];
                      
                      const hasAllKeyword = allKeywords.some(k => targetStr.includes(k));
                      const isGenericOnly = genericKeywords.includes(targetStr);

                      // 如果包含 "all/所有" 或者是仅仅说了 "课程" 且意图是 deleteAllMatched，则认为是全删
                      const isDeleteAll = hasAllKeyword || (isGenericOnly && action.data.deleteAllMatched);

                      console.log(`[AI Delete Course] Try to delete '${targetStr}'. IsDeleteAll=${isDeleteAll}`);

                      let targets: any[] = [];
                      if (isDeleteAll) {
                           targets = [...courses];
                      } else if (action.data.deleteAllMatched) {
                           targets = courses.filter(c => c.name.toLowerCase().includes(targetStr));
                      } else {
                           const targetCourse = courses.find(c => c.name.toLowerCase().includes(targetStr));
                           if (targetCourse) targets = [targetCourse];
                      }
                      
                      console.log(`[AI Delete Course] Found ${targets.length} matched courses.`);

                      if (targets.length > 0) {
                           const results = await Promise.allSettled(targets.map(c => deleteCourse(c.id, isGuest)));
                           const failed = results.filter(r => r.status === 'rejected');
                           if (failed.length > 0) console.warn(`[AI Delete Course] ${failed.length} deletions failed.`);
                      }
                  }

                  else if (action.type === 'update_task' && action.data?.targetTitleStr) {
                      const targetStr = action.data.targetTitleStr.toLowerCase();
                      const isGuest = !userId;
                      const targetTask = tasks.find(t => t.title.toLowerCase().includes(targetStr));
                      if (targetTask && action.data.updates) {
                          const updates = { ...action.data.updates };
                          if (updates.startTime) {
                             updates.start_time = new Date(updates.startTime).toISOString();
                             delete updates.startTime;
                          }
                          await updateTask(targetTask.id, updates, isGuest);
                      }
                  }
                  else if (action.type === 'update_course' && action.data?.targetNameStr) {
                      const targetStr = action.data.targetNameStr.toLowerCase();
                      const isGuest = !userId;
                      const targetCourse = courses.find(c => c.name.toLowerCase().includes(targetStr));
                      if (targetCourse && action.data.updates) {
                          await updateCourse(targetCourse.id, action.data.updates, isGuest);
                      }
                  }
                  else if (action.type === 'query_schedule' && action.data?.date) {
                      // ISO "YYYY-MM-DD" defaults to UTC. We want Local Midnight.
                      // split and construct ensures local time.
                      const [tY, tM, tD] = action.data.date.split('-').map(Number);
                      const targetDate = new Date(tY, tM - 1, tD);
                      
                      // Switch View
                      const { setSelectedDate, fetchData } = useTaskStore.getState();
                      setSelectedDate(targetDate);
                      await fetchData(null, targetDate);

                      // Get latest data to display in chat
                      const currentStore = useTaskStore.getState();
                      const allTasks = currentStore.tasks;
                      const allCourses = currentStore.courses;

                      // Filter Tasks
                      const dayTasks = allTasks.filter(t => {
                          if (!t.start_time) return false;
                          const tDate = new Date(t.start_time);
                          return tDate.getFullYear() === targetDate.getFullYear() &&
                                 tDate.getMonth() === targetDate.getMonth() &&
                                 tDate.getDate() === targetDate.getDate();
                      });

                      // Filter Courses (Assumption: 1=Mon...7=Sun)
                      const jsDay = targetDate.getDay(); 
                      const targetDayOfWeek = jsDay === 0 ? 7 : jsDay;
                      const dayCourses = allCourses.filter(c => c.day_of_week === targetDayOfWeek);

                      let summary = `\n\n📅 **${action.data.date} 日程表:**\n`;
                      
                      if (dayCourses.length > 0) {
                          summary += `\n📘 **课程:**\n` + dayCourses.map(c => `- ${c.name} (${c.start_time}-${c.end_time}) @ ${c.location}`).join('\n');
                      } else {
                          summary += `\n📘 **课程:** 无`;
                      }

                      if (dayTasks.length > 0) {
                          summary += `\n\n✅ **任务:**\n` + dayTasks.map(t => `- ${t.title} (${t.start_time ? new Date(t.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Todo'})`).join('\n');
                      } else {
                           summary += `\n\n✅ **任务:** 无`;
                      }

                      systemReply += summary;
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
