import { soundManager } from '@/utils/audio';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomAlert } from '@/components/ui/custom-alert';
import { Toast } from '@/components/ui/toast';
import { useTaskContext } from '@/contexts/TaskContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 2. 配置与包装 ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HOUR_HEIGHT = 100; // Increased height for better visibility
const START_HOUR = 6;   
const END_HOUR = 23;    
const PALETTE = ['#0a7ea4', '#9b59b6', '#e67e22', '#2ecc71', '#e74c3c', '#34495e'];

// --- 3. 类型定义 ---
interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  estimated_duration?: number; 
  actual_duration: number;
  start_time?: string | null;
  created_at?: string;
  updated_at?: string;
  is_course?: boolean; // 标记是否为课程
  location?: string;   // 课程地点
  color?: string;      // 自定义颜色
  is_deadline?: boolean; // 标记是否为 Deadline
}

interface Course {
  id: number;
  name: string;
  location: string;
  day_of_week: number; // 1-7
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
  color?: string;     // 自定义颜色
}

interface CurrentTimeLineProps {
  selectedDate: Date;
}

const CurrentTimeLine = ({ selectedDate }: CurrentTimeLineProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const isToday = selectedDate.getDate() === now.getDate() && 
                  selectedDate.getMonth() === now.getMonth() && 
                  selectedDate.getFullYear() === now.getFullYear();

  if (!isToday) return null;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  if (currentHour < START_HOUR || currentHour > END_HOUR) return null;
  
  const top = (currentHour - START_HOUR) * HOUR_HEIGHT + (currentMinute / 60) * HOUR_HEIGHT;
  
  return (
    <View style={{ position: 'absolute', top, left: 65, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', marginLeft: -4 }} />
      <View style={{ flex: 1, height: 1, backgroundColor: 'red' }} />
    </View>
  );
};

const ScheduleContent = () => {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const { setCurrentTask } = useTaskContext();
  
  const timelineRef = useRef<ScrollView>(null);
  
  // Draft storage for Task
  const taskDraft = useRef({
    title: '',
    description: '',
    estimatedDuration: '',
    startTime: null as Date | null,
    tempHour: new Date().getHours(),
    tempMinute: 0,
    selectedColor: PALETTE[0]
  });

  // --- 状态管理 ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [modalVisible, setModalVisible] = useState(false);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [weeklyModalVisible, setWeeklyModalVisible] = useState(false);
  
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'info' });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] as any[] });

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [tempHour, setTempHour] = useState(START_HOUR);
  const [tempMinute, setTempMinute] = useState(0);
  const [fabMenuVisible, setFabMenuVisible] = useState(false); // New state for FAB menu
  const [isPickerVisible, setIsPickerVisible] = useState(false); // State for time picker visibility
  const [pickerMode, setPickerMode] = useState<'task' | 'course_start' | 'course_end'>('task'); // Picker mode
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]); // Color picker state
  const [isDeadlineMode, setIsDeadlineMode] = useState(false); // Deadline mode state
  const [showDatePicker, setShowDatePicker] = useState(false); // Date picker state
  
  // Date Picker State
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempDay, setTempDay] = useState(new Date().getDate());

  // Course Form State
  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [courseDay, setCourseDay] = useState(1);
  const [courseStartHour, setCourseStartHour] = useState(8);
  const [courseStartMinute, setCourseStartMinute] = useState(0);
  const [courseEndHour, setCourseEndHour] = useState(9);
  const [courseEndMinute, setCourseEndMinute] = useState(35);
  const [courseColor, setCourseColor] = useState(PALETTE[0]); // Course color state

  // 占位符颜色计算 (基于当前主题文本颜色，设置 60% 不透明度)
  const placeholderColor = Colors[theme].text + '99';

  // --- 4. 核心逻辑 ---
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  useEffect(() => {
    loadCachedCourses().then(() => fetchCourses());
  }, []);

  // Auto-scroll to current time
  useEffect(() => {
    if (viewMode === 'timeline' && timelineRef.current) {
      const now = new Date();
      const isToday = selectedDate.getDate() === now.getDate() && 
                      selectedDate.getMonth() === now.getMonth() && 
                      selectedDate.getFullYear() === now.getFullYear();
      
      if (isToday) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
          const scrollY = (currentHour - START_HOUR) * HOUR_HEIGHT + (currentMinute / 60) * HOUR_HEIGHT - SCREEN_HEIGHT / 3;
          setTimeout(() => timelineRef.current?.scrollTo({ y: Math.max(0, scrollY), animated: true }), 500);
        }
      }
    }
  }, [viewMode, selectedDate]);

  const loadCachedCourses = async () => {
    try {
      const cached = await AsyncStorage.getItem('courses_data');
      if (cached) {
        setCourses(JSON.parse(cached));
      }
    } catch (e) {
      console.error('Failed to load cached courses', e);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) throw error;
        setCourses(data || []);
        await AsyncStorage.setItem('courses_data', JSON.stringify(data || []));
      } else {
        // Guest mode: load from local storage
        const cached = await AsyncStorage.getItem('courses_data');
        if (cached) {
          setCourses(JSON.parse(cached));
        }
      }
    } catch (e) {
      console.error('Failed to fetch courses', e);
    }
  };

  const openEditCourseModal = (task?: Task) => {
    if (task) {
      const courseId = -task.id;
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setEditingCourse(course);
        setCourseName(course.name);
        setCourseLocation(course.location);
        setCourseDay(course.day_of_week);
        const [startH, startM] = course.start_time.split(':').map(Number);
        const [endH, endM] = course.end_time.split(':').map(Number);
        setCourseStartHour(startH);
        setCourseStartMinute(startM);
        setCourseEndHour(endH);
        setCourseEndMinute(endM);
        setCourseColor(course.color || PALETTE[0]);
      }
    } else {
      setEditingCourse(null);
      setCourseName(''); setCourseLocation(''); setCourseDay(1);
      setCourseStartHour(8); setCourseStartMinute(0);
      setCourseEndHour(9); setCourseEndMinute(35);
      setCourseColor(PALETTE[0]);
    }
    setCourseModalVisible(true);
  };

  const handleSaveCourse = async () => {
    if (!courseName.trim()) { showAlert('提示', '请输入课程名称'); return; }
    
    const startTotal = courseStartHour * 60 + courseStartMinute;
    const endTotal = courseEndHour * 60 + courseEndMinute;

    if (endTotal <= startTotal) {
      showAlert('提示', '结束时间必须晚于开始时间');
      return;
    }

    // Check for overlapping courses
    const hasOverlap = courses.some(c => {
      if (editingCourse && c.id === editingCourse.id) return false; // Skip self if editing
      if (c.day_of_week !== courseDay) return false; // Only check same day

      const [cStartH, cStartM] = c.start_time.split(':').map(Number);
      const [cEndH, cEndM] = c.end_time.split(':').map(Number);
      const cStartTotal = cStartH * 60 + cStartM;
      const cEndTotal = cEndH * 60 + cEndM;

      // Check overlap: (StartA < EndB) and (EndA > StartB)
      return startTotal < cEndTotal && endTotal > cStartTotal;
    });

    if (hasOverlap) {
      showAlert('无法添加', '该时段已有课程，请调整时间');
      return;
    }

    const startTimeStr = `${String(courseStartHour).padStart(2, '0')}:${String(courseStartMinute).padStart(2, '0')}:00`;
    const endTimeStr = `${String(courseEndHour).padStart(2, '0')}:${String(courseEndMinute).padStart(2, '0')}:00`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Logged in user: Save to Supabase
        if (editingCourse) {
           const { error } = await supabase.from('courses').update({
            name: courseName.trim(),
            location: courseLocation.trim(),
            day_of_week: courseDay,
            start_time: startTimeStr,
            end_time: endTimeStr,
            color: courseColor,
          }).eq('id', editingCourse.id);
          if (error) throw error;
          showToast('课程已更新', 'success');
        } else {
          const { error } = await supabase.from('courses').insert({
            user_id: user.id,
            name: courseName.trim(),
            location: courseLocation.trim(),
            day_of_week: courseDay,
            start_time: startTimeStr,
            end_time: endTimeStr,
            color: courseColor,
          });
          if (error) throw error;
          showToast('课程已添加', 'success');
        }
        // Refresh from Supabase
        fetchCourses();
      } else {
        // Guest user: Save to AsyncStorage
        const cached = await AsyncStorage.getItem('courses_data');
        let localCourses: Course[] = cached ? JSON.parse(cached) : [];
        
        if (editingCourse) {
          localCourses = localCourses.map(c => c.id === editingCourse.id ? {
            ...c,
            name: courseName.trim(),
            location: courseLocation.trim(),
            day_of_week: courseDay,
            start_time: startTimeStr,
            end_time: endTimeStr,
            color: courseColor,
          } : c);
          showToast('课程已更新 (本地)', 'success');
        } else {
          const newCourse: Course = {
            id: Date.now(), // Use timestamp for local ID
            name: courseName.trim(),
            location: courseLocation.trim(),
            day_of_week: courseDay,
            start_time: startTimeStr,
            end_time: endTimeStr,
            color: courseColor,
          };
          localCourses.push(newCourse);
          showToast('课程已添加 (本地)', 'success');
        }
        
        await AsyncStorage.setItem('courses_data', JSON.stringify(localCourses));
        setCourses(localCourses);
      }

      setCourseModalVisible(false);
      setCourseName(''); setCourseLocation(''); setCourseDay(1);
      setCourseStartHour(8); setCourseStartMinute(0);
      setCourseEndHour(9); setCourseEndMinute(35);
      setCourseColor(PALETTE[0]);
      setEditingCourse(null);
      
    } catch (e) {
      console.error('Failed to save course', e);
      showAlert('错误', '保存课程失败');
    }
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const jsonValue = await AsyncStorage.getItem('tasks_data');
      const data = jsonValue != null ? JSON.parse(jsonValue) : [];
      setTasks(data);
    } catch (e) {
      console.error('Failed to fetch tasks', e);
    }
    setIsLoading(false);
  };

  const handleSaveTask = async () => {
    if (editingTask?.is_course) {
      showAlert('提示', '课程无法在此编辑，请删除后重新添加');
      return;
    }

    if (!title.trim()) { showAlert('提示', '请输入任务名称'); return; }

    const durationMin = estimatedDuration ? parseInt(estimatedDuration) : 0;
    if (!isDeadlineMode && estimatedDuration && (durationMin > 300 || durationMin < 5)) {
      showAlert('提示', '任务持续时间应在5 - 300分钟之间');
      return;
    }

    let durationInSeconds = isDeadlineMode ? 0 : durationMin * 60;
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      estimated_duration: durationInSeconds,
      start_time: startTime ? startTime.toISOString() : null,
      color: isDeadlineMode ? '#000000' : selectedColor,
      is_deadline: isDeadlineMode,
    };

    // Overlap Validation
    if (startTime && !isDeadlineMode) {
      const now = new Date();
      // Allow 1 minute buffer
      if (startTime.getTime() < now.getTime() - 60000) {
        showAlert('无法创建', '不能在过去的时间添加任务');
        return;
      }

      const startTimeDate = startTime;
      const endTimeDate = new Date(startTimeDate.getTime() + durationInSeconds * 1000);
      
      // Check for exact start time duplicate
      const duplicateStartTask = tasks.find(t => {
        if (editingTask && t.id === editingTask.id) return false;
        if (!t.start_time) return false;
        const tDate = new Date(t.start_time);
        // Check if same minute
        return Math.abs(tDate.getTime() - startTimeDate.getTime()) < 60000; 
      });

      if (duplicateStartTask) {
        showAlert('无法创建', '该时间点已存在任务，请调整开始时间');
        return;
      }
      
      const otherTasks = tasks.filter(t => {
        if (editingTask && t.id === editingTask.id) return false;
        if (!t.start_time) return false;
        const tDate = new Date(t.start_time);
        return tDate.getDate() === startTimeDate.getDate() && 
               tDate.getMonth() === startTimeDate.getMonth() && 
               tDate.getFullYear() === startTimeDate.getFullYear();
      });

      const overlappingTasks = otherTasks.filter(t => {
        const tStart = new Date(t.start_time!).getTime();
        const tEnd = tStart + (t.estimated_duration || 0) * 1000;
        const nStart = startTimeDate.getTime();
        const nEnd = endTimeDate.getTime();
        return tStart < nEnd && tEnd > nStart;
      });

      if (overlappingTasks.length >= 2) {
        const points = [
            startTimeDate.getTime(), 
            endTimeDate.getTime(),
            ...overlappingTasks.map(t => new Date(t.start_time!).getTime()),
            ...overlappingTasks.map(t => new Date(t.start_time!).getTime() + (t.estimated_duration || 0) * 1000)
        ].sort((a, b) => a - b);

        for (let i = 0; i < points.length - 1; i++) {
            const pMid = (points[i] + points[i+1]) / 2;
            let count = 1; 
            if (pMid < startTimeDate.getTime() || pMid > endTimeDate.getTime()) count = 0;
            
            overlappingTasks.forEach(t => {
                const tStart = new Date(t.start_time!).getTime();
                const tEnd = tStart + (t.estimated_duration || 0) * 1000;
                if (pMid > tStart && pMid < tEnd) count++;
            });

            if (count >= 3) {
                showAlert('无法创建', '该时间段任务过多（最多允许2个任务重叠）');
                return;
            }
        }
      }
    }

    try {
      const jsonValue = await AsyncStorage.getItem('tasks_data');
      let currentTasks: Task[] = jsonValue != null ? JSON.parse(jsonValue) : [];

      if (editingTask) {
        currentTasks = currentTasks.map(t => t.id === editingTask.id ? { ...t, ...taskData, start_time: taskData.start_time ?? undefined } : t);
        showToast('任务已更新', 'success');
      } else {
        const newTask: Task = {
          id: Date.now(),
          ...taskData,
          status: 'pending',
          actual_duration: 0,
        };
        currentTasks = [newTask, ...currentTasks];
        showToast('任务已创建', 'success');
        
        // Clear draft and state after successful creation
        const defaultDraft = {
            title: '', description: '', estimatedDuration: '', startTime: null,
            tempHour: new Date().getHours(), tempMinute: 0, selectedColor: PALETTE[0]
        };
        taskDraft.current = defaultDraft;
        setTitle(''); setDescription(''); setEstimatedDuration(''); setStartTime(null);
        setTempHour(new Date().getHours()); setTempMinute(0); setSelectedColor(PALETTE[0]);
      }
      
      await AsyncStorage.setItem('tasks_data', JSON.stringify(currentTasks));
      setTasks(currentTasks);
      setModalVisible(false);
    } catch (e) {
      console.error('Failed to save task', e);
      showAlert('错误', '保存失败');
    }
  };

  const deleteTask = async (id: number) => {
    const isCourse = id < 0;
    const realId = isCourse ? -id : id;
    const itemType = isCourse ? '课程' : '任务';

    showAlert('确认删除', `确定要删除这个${itemType}吗？`, [
      { text: '取消', style: 'cancel', onPress: closeAlert },
      { text: '删除', style: 'destructive', onPress: async () => {
          try {
            if (isCourse) {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { error } = await supabase.from('courses').delete().eq('id', realId);
                if (error) throw error;
              }
              
              const newCourses = courses.filter(c => c.id !== realId);
              setCourses(newCourses);
              await AsyncStorage.setItem('courses_data', JSON.stringify(newCourses));
              showToast('课程已删除', 'success');
            } else {
              const jsonValue = await AsyncStorage.getItem('tasks_data');
              let currentTasks: Task[] = jsonValue != null ? JSON.parse(jsonValue) : [];
              currentTasks = currentTasks.filter(t => t.id !== id);
              await AsyncStorage.setItem('tasks_data', JSON.stringify(currentTasks));
              setTasks(currentTasks);
              showToast('任务已删除', 'success');
            }
            closeAlert();
          } catch (e) {
            console.error(`Failed to delete ${itemType}`, e);
            showToast('删除失败', 'error');
          }
      }},
    ]);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (newStatus === 'completed') {
      soundManager.playSound('complete');
    }
    try {
      const jsonValue = await AsyncStorage.getItem('tasks_data');
      let currentTasks: Task[] = jsonValue != null ? JSON.parse(jsonValue) : [];
      currentTasks = currentTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      await AsyncStorage.setItem('tasks_data', JSON.stringify(currentTasks));
      setTasks(currentTasks);
    } catch (e) {
      console.error('Failed to update task status', e);
    }
  };

  const startFocus = (task: Task) => {
    setCurrentTask({ ...task, start_time: task.start_time ?? undefined });
    router.push('/(tabs)');
  };

  const showAlert = (title: string, message: string, buttons: any[] = []) => {
    setAlertConfig({
      visible: true, title, message,
      buttons: buttons.length > 0 ? buttons : [{ text: '确定', style: 'default', onPress: closeAlert }],
    });
  };
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToastConfig({ visible: true, message, type });

  const openCreateModal = (isDeadline = false) => {
    setIsDeadlineMode(isDeadline);
    setEditingTask(null);
    // Restore draft
    const draft = taskDraft.current;
    setTitle(draft.title);
    setDescription(draft.description);
    setEstimatedDuration(draft.estimatedDuration);
    
    // Set default start time based on selectedDate
    if (draft.startTime) {
      setStartTime(draft.startTime);
      setTempHour(draft.tempHour);
      setTempMinute(draft.tempMinute);
    } else {
      const now = new Date();
      const defaultStart = new Date(selectedDate);
      // If selected date is today, use current time. Otherwise use current time on that day.
      defaultStart.setHours(now.getHours());
      defaultStart.setMinutes(now.getMinutes());
      
      setStartTime(defaultStart);
      setTempHour(now.getHours());
      setTempMinute(now.getMinutes());
    }

    setSelectedColor(draft.selectedColor);
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setIsDeadlineMode(!!task.is_deadline);
    // If we were in create mode (editingTask is null), save the draft
    if (!editingTask) {
       taskDraft.current = {
         title, description, estimatedDuration, startTime,
         tempHour, tempMinute, selectedColor
       };
    }
    setEditingTask(task); setTitle(task.title); setDescription(task.description || '');
    setEstimatedDuration(task.estimated_duration ? (task.estimated_duration / 60).toString() : '');
    if (task.start_time) {
      const date = new Date(task.start_time); setStartTime(date);
      setTempHour(date.getHours()); setTempMinute(date.getMinutes());
    }
    setSelectedColor(task.color || PALETTE[0]);
    setModalVisible(true);
  };

  // --- 5. 数据处理与合并 ---
  const currentDayTasks = useMemo(() => {
    // 1. 获取选中日期的星期几 (0-6, 0 is Sunday)
    const dayOfWeek = selectedDate.getDay() || 7; // Convert to 1-7 (1=Monday, 7=Sunday)
    
    // 2. 筛选当天的课程并转换为 Task 格式
    const todaysCourses = courses
      .filter(c => c.day_of_week === dayOfWeek)
      .map(c => {
        const [startH, startM] = c.start_time.split(':').map(Number);
        const [endH, endM] = c.end_time.split(':').map(Number);
        
        // 构建当天的具体时间
        const startTime = new Date(selectedDate);
        startTime.setHours(startH, startM, 0, 0);
        
        const durationSeconds = ((endH * 60 + endM) - (startH * 60 + startM)) * 60;
        
        return {
          id: -c.id, // 使用负数 ID 避免冲突
          title: c.name,
          description: c.location,
          status: 'pending',
          estimated_duration: durationSeconds,
          actual_duration: 0,
          start_time: startTime.toISOString(),
          is_course: true,
          location: c.location,
          color: c.color
        } as Task;
      });

    // 3. 筛选当天的任务 (这里假设任务没有具体日期，或者需要根据日期筛选)
    // 目前 tasks 存储的是所有任务，如果需要按日期筛选，需要 task 有 date 字段
    // 假设当前 tasks 是所有任务，我们暂时只展示所有任务，或者你可以添加日期筛选逻辑
    // 这里为了演示，我们假设 tasks 是当天的或者不区分日期的待办
    // 如果要严格按日期，需要在 Task 中添加 date 字段并筛选
    // 现有的 Task 只有 start_time (ISO string)，我们可以用它来筛选
    
    const todaysUserTasks = tasks.filter(t => {
      if (!t.start_time) return true; // 没有时间的任务显示在每一天 (或者只显示在今天，取决于需求)
      const taskDate = new Date(t.start_time);
      
      // 如果是 Deadline，且截止日期在今天或之后，则显示在今天
      if (t.is_deadline) {
        const todayStart = new Date(selectedDate);
        todayStart.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(taskDate);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate.getTime() >= todayStart.getTime();
      }

      return taskDate.getDate() === selectedDate.getDate() &&
             taskDate.getMonth() === selectedDate.getMonth() &&
             taskDate.getFullYear() === selectedDate.getFullYear();
    });

    // 4. 合并并排序 (Deadline 优先，然后课程，最后任务)
    return [...todaysCourses, ...todaysUserTasks].sort((a, b) => {
      // Deadline 置顶
      if (a.is_deadline && !b.is_deadline) return -1;
      if (!a.is_deadline && b.is_deadline) return 1;
      
      if (a.is_course && !b.is_course) return -1; // 课程次之
      if (!a.is_course && b.is_course) return 1;
      
      // 如果都有时间，按时间排序
      if (a.start_time && b.start_time) {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      }
      return 0;
    });
  }, [tasks, courses, selectedDate]);

  // --- 6. 时间轴算法 ---
  const processedTimelineTasks = useMemo(() => {
    const validTasks = currentDayTasks.filter(t => t.start_time && t.estimated_duration && !t.is_deadline);
    
    const processGroup = (groupTasks: Task[], colStartPct: number, colWidthPct: number) => {
      const layoutItems = groupTasks.map(task => {
        const start = new Date(task.start_time!);
        const startHour = start.getHours();
        if (startHour < START_HOUR) return null;
        const startMinTotal = startHour * 60 + start.getMinutes();
        const top = (startHour - START_HOUR) * HOUR_HEIGHT + (start.getMinutes() / 60) * HOUR_HEIGHT;
        const height = Math.max((task.estimated_duration! / 3600) * HOUR_HEIGHT, 30);
        return { 
          ...task, 
          startMinTotal, 
          endMinTotal: startMinTotal + (task.estimated_duration! / 60), 
          layout: { top, height, widthPercent: 100, leftPercent: 0, zIndex: 1 } 
        };
      }).filter((t): t is NonNullable<typeof t> => t !== null);

      layoutItems.sort((a, b) => a.startMinTotal - b.startMinTotal);
      
      // Lane Algorithm for visual stacking with hierarchy
      const levels: number[] = []; // Stores the end time (in minutes) of the last task in each level

      layoutItems.forEach((task, index) => {
        let assignedLevel = -1;
        const buffer = 5; // 5 minutes buffer to treat "close" tasks as overlapping for visual separation

        // Try to find an available level
        for (let i = 0; i < levels.length; i++) {
          if (levels[i] + buffer <= task.startMinTotal) {
            assignedLevel = i;
            levels[i] = task.endMinTotal;
            break;
          }
        }

        // If no level found, create a new one
        if (assignedLevel === -1) {
          assignedLevel = levels.length;
          levels.push(task.endMinTotal);
        }

        const offsetStep = 15; // Smaller step for tighter stacking
        task.layout.widthPercent = 85; 
        task.layout.leftPercent = Math.min(assignedLevel * offsetStep, 60);
        task.layout.zIndex = index + 1; // Ensure later tasks are visually on top
      });

      // Map to global column
      layoutItems.forEach(task => {
        // Scale width to column width
        task.layout.widthPercent = task.layout.widthPercent * (colWidthPct / 100);
        // Offset is relative to column start + local offset scaled
        task.layout.leftPercent = colStartPct + task.layout.leftPercent * (colWidthPct / 100);
      });

      return layoutItems;
    };

    const courses = validTasks.filter(t => t.is_course);
    const tasks = validTasks.filter(t => !t.is_course);

    // Courses Left (0-50%), Tasks Right (50-100%)
    const layoutCourses = processGroup(courses, 0, 50);
    const layoutTasks = processGroup(tasks, 50, 50);

    return [...layoutCourses, ...layoutTasks];
  }, [currentDayTasks]);

  const processedDeadlines = useMemo(() => {
    return currentDayTasks.filter(t => {
      if (!t.is_deadline || !t.start_time) return false;
      const d = new Date(t.start_time);
      return d.getDate() === selectedDate.getDate() && 
             d.getMonth() === selectedDate.getMonth() && 
             d.getFullYear() === selectedDate.getFullYear();
    }).map(task => {
      const start = new Date(task.start_time!);
      const startHour = start.getHours();
      if (startHour < START_HOUR) return null;
      const top = (startHour - START_HOUR) * HOUR_HEIGHT + (start.getMinutes() / 60) * HOUR_HEIGHT;
      return { ...task, top };
    }).filter((t): t is NonNullable<typeof t> => t !== null);
  }, [currentDayTasks, selectedDate]);

  const renderListItem = ({ item }: { item: Task }) => {
    let timeDisplay = '';
    if (item.is_course && item.start_time && item.estimated_duration) {
        const start = new Date(item.start_time);
        const end = new Date(start.getTime() + item.estimated_duration * 1000);
        timeDisplay = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (item.start_time) {
        timeDisplay = new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        timeDisplay = '长期';
    }

    return (
    <ThemedView style={[
      styles.card, 
      { 
        backgroundColor: item.color ? item.color : (item.is_course ? Colors[theme].tint : Colors[theme].background),
        shadowColor: item.color || "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 0,
        opacity: 0.95,
        ...(item.is_deadline ? { borderLeftWidth: 0 } : {})
      }
    ]}>
      {!item.is_course && !item.is_deadline && (
        <View style={{ position: 'absolute', top: -12, left: '50%', marginLeft: -12, zIndex: 10 }}>
          <Ionicons name="pin" size={24} color="#e74c3c" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 }} />
        </View>
      )}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => item.is_course ? openEditCourseModal(item) : openEditModal(item)}
        style={styles.taskInfo}
      >
        <ThemedText style={[
          styles.taskTitle, 
          { color: '#fff', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 },
          item.status === 'completed' && { textDecorationLine: 'line-through', opacity: 0.7 },
          item.is_deadline && { fontSize: 18, fontWeight: 'bold' }
        ]}>{item.title}</ThemedText>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            {item.is_deadline ? (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                    截止: {item.start_time ? new Date(item.start_time).toLocaleDateString() + ' ' + new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </ThemedText>
                </View>
            ) : (
                <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '500' }}>
                {timeDisplay}
                {!item.is_course && item.estimated_duration ? ` · ${Math.floor(item.estimated_duration / 60)}分钟` : ''}
                {item.location ? ` · ${item.location}` : ''}
                </ThemedText>
            )}
        </View>
      </TouchableOpacity>

      {!item.is_course && !item.is_deadline && (
        <TouchableOpacity onPress={() => toggleTaskStatus(item)} style={styles.checkbox}>
          <Ionicons name={item.status === 'completed' ? "checkbox" : "square-outline"} size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {item.is_course && (
        <View style={styles.checkbox}>
          <Ionicons name="school" size={24} color="#fff" />
        </View>
      )}
      {item.is_deadline && (
        <View style={styles.checkbox}>
          <Ionicons name="skull" size={20} color="#fff" />
        </View>
      )}

      {!item.is_course && !item.is_deadline && item.status !== 'completed' && (
        <TouchableOpacity onPress={() => startFocus(item)} style={styles.actionButton}><Ionicons name="play-circle" size={32} color="#fff" /></TouchableOpacity>
      )}
    </ThemedView>
  )};

  const renderTimeline = () => {
    const isToday = selectedDate.getDate() === new Date().getDate() && 
                    selectedDate.getMonth() === new Date().getMonth() && 
                    selectedDate.getFullYear() === new Date().getFullYear();

    // Removed the restriction that only allows viewing today's timeline
    // if (!isToday) { ... }

    const hours = Array.from({ length: END_HOUR - START_HOUR + 2 }, (_, i) => START_HOUR + i);
    


    return (
      <View style={{ flex: 1 }}>
        {/* Column Headers - Outside ScrollView */}
        <View style={{ flexDirection: 'row', marginLeft: 65, borderBottomWidth: 1, borderBottomColor: Colors[theme].icon + '10', backgroundColor: Colors[theme].background, zIndex: 5 }}>
          <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: Colors[theme].icon + '10', backgroundColor: Colors[theme].tint + '05', paddingVertical: 8 }}>
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', opacity: 0.7, textAlign: 'center' }}>课程</ThemedText>
          </View>
          <View style={{ flex: 1, paddingVertical: 8 }}>
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold', opacity: 0.7, textAlign: 'center' }}>任务</ThemedText>
          </View>
        </View>

        <ScrollView ref={timelineRef} style={styles.timelineContainer} contentContainerStyle={{ paddingTop: 10, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
          <View style={styles.timelineContent}>
            {/* Column Backgrounds */}
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 65, right: 0, flexDirection: 'row' }}>
              <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: Colors[theme].icon + '10', backgroundColor: Colors[theme].tint + '05' }} />
              <View style={{ flex: 1 }} />
            </View>

            {hours.map((hour) => (
              <View key={hour} style={{ height: HOUR_HEIGHT, position: 'relative' }}>
                <View style={styles.timelineRow}>
                  <ThemedText style={styles.timelineHourText}>{hour}:00</ThemedText>
                  <View style={[styles.timelineLine, { backgroundColor: Colors[theme].icon + '15' }]} />
                </View>
                {/* Half-hour line */}
                <View style={[styles.timelineRow, { position: 'absolute', top: HOUR_HEIGHT / 2, left: 0, right: 0 }]}>
                  <ThemedText style={[styles.timelineHourText, { fontSize: 10, opacity: 0.2 }]}>{hour}:30</ThemedText>
                  <View style={[styles.timelineLine, { backgroundColor: Colors[theme].icon + '08' }]} />
                </View>
              </View>
            ))}
            
            <CurrentTimeLine selectedDate={selectedDate} />

            {processedDeadlines.map((deadline) => (
              <TouchableOpacity
                key={deadline.id}
                onPress={() => openEditModal(deadline)}
                style={{
                  position: 'absolute',
                  top: deadline.top - 14, 
                  left: 0, 
                  right: 0,
                  height: 28,
                  flexDirection: 'row',
                  alignItems: 'center',
                  zIndex: 1000, 
                }}
              >
                {/* Skull on the time axis (centered in 65px width) */}
                <View style={{ 
                  width: 65, 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 2,
                  shadowColor: "#000",
                  elevation: 5
                }}>
                  <Ionicons name="skull" size={20} color={theme === 'dark' ? '#fff' : '#000'} />
                </View>
                
                {/* Line starting near the skull */}
                <View style={{ 
                  position: 'absolute', 
                  left: 50, 
                  right: 0, 
                  height: 2, 
                  backgroundColor: theme === 'dark' ? '#fff' : '#000', 
                  zIndex: 1,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                  elevation: 3
                }}>
                   {/* Name above the end of the line */}
                   <View style={{ position: 'absolute', right: 10, bottom: 4, backgroundColor: 'transparent' }}>
                      <ThemedText style={{ fontWeight: 'bold', fontSize: 12, color: theme === 'dark' ? '#fff' : '#000', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 }}>{deadline.title}</ThemedText>
                   </View>
                </View>
              </TouchableOpacity>
            ))}

            {processedTimelineTasks.map((task) => (
              <TouchableOpacity
                key={task.id} onPress={() => openEditModal(task)}
                style={[styles.timelineTaskBlock, {
                  top: task.layout.top,
                  height: task.layout.height,
                  left: 65 + (SCREEN_WIDTH - 85) * (task.layout.leftPercent / 100),
                  width: (SCREEN_WIDTH - 85) * (task.layout.widthPercent / 100) - 4, // Reduced width slightly for spacing
                  zIndex: task.layout.zIndex || 1,
                  backgroundColor: task.color ? task.color : (task.is_course ? Colors[theme].tint : (task.status === 'completed' ? '#f0f0f0' : Colors[theme].tint)),
                  borderRadius: 2,
                  padding: 4,
                  ...(task.is_course ? {
                    // Course: Solid flat style
                    opacity: 0.9,
                    shadowColor: "#000",
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    elevation: 4,
                  } : {
                    // Task: Sticky note style
                    shadowColor: "#000",
                    shadowOffset: { width: 3, height: 3 },
                    shadowOpacity: 0.5,
                    shadowRadius: 4.65,
                    elevation: 8,
                  })
                }]}
              >
                {task.is_course && (
                  <View style={{ 
                    position: 'absolute', 
                    top: -6, 
                    left: '50%', 
                    marginLeft: -15, 
                    width: 30, 
                    height: 10, 
                    backgroundColor: 'rgba(255,255,255,0.5)', 
                    transform: [{ rotate: '-2deg' }],
                    zIndex: 10,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)'
                  }} />
                )}
                {!task.is_course && (
                  <View style={{ position: 'absolute', top: -10, right: -5, zIndex: 10, transform: [{ rotate: '15deg' }] }}>
                    <Ionicons name="pin" size={22} color="#e74c3c" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 }} />
                  </View>
                )}
                <ThemedText numberOfLines={1} style={[styles.timelineTaskTitle, { color: '#fff', fontSize: 12, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 }, task.status === 'completed' && { opacity: 0.5 }]}>{task.title}</ThemedText>
                {task.is_course && (
                  <>
                    <ThemedText style={{ fontSize: 9, opacity: 0.9, color: '#fff' }}>
                      {(() => {
                        if (task.start_time && task.estimated_duration) {
                          const start = new Date(task.start_time);
                          const end = new Date(start.getTime() + task.estimated_duration * 1000);
                          return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        }
                        return '';
                      })()}
                    </ThemedText>
                    <ThemedText style={{ fontSize: 9, opacity: 0.9, color: '#fff' }}>{task.location}</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderWeekStrip = () => {
    const today = new Date();
    // Center the week strip around today (Today-3 to Today+3)
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 3 + i);
      return d;
    });

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
      <View style={styles.weekStrip}>
        {weekDates.map((date, index) => {
          const isSelected = date.getDate() === selectedDate.getDate() && 
                             date.getMonth() === selectedDate.getMonth() && 
                             date.getFullYear() === selectedDate.getFullYear();
          const isToday = date.getDate() === today.getDate() && 
                          date.getMonth() === today.getMonth() && 
                          date.getFullYear() === today.getFullYear();
          
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.dayItem, isSelected && { backgroundColor: Colors[theme].tint }]} 
              onPress={() => setSelectedDate(date)}
            >
              <ThemedText style={[styles.dayText, isSelected && { color: '#fff' }]}>{weekDays[date.getDay()]}</ThemedText>
              <ThemedText style={[styles.dateText, isSelected && { color: '#fff' }, isToday && !isSelected && { color: Colors[theme].tint, fontWeight: 'bold' }]}>
                {date.getDate()}
              </ThemedText>
              {isToday && <View style={[styles.todayDot, isSelected ? { backgroundColor: '#fff' } : { backgroundColor: Colors[theme].tint }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderCourseModal = () => (
    <Modal visible={courseModalVisible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle">{editingCourse ? '编辑课程' : '添加课程'}</ThemedText>
            <TouchableOpacity onPress={() => setCourseModalVisible(false)}><Ionicons name="close" size={24} color={Colors[theme].icon} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>课程名称</ThemedText>
            <TextInput 
              style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={courseName} 
              onChangeText={setCourseName}
              placeholder="例如：线性代数"
              placeholderTextColor={placeholderColor}
            />
            
            <ThemedText style={styles.label}>上课地点</ThemedText>
            <TextInput 
              style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
              value={courseLocation} 
              onChangeText={setCourseLocation}
              placeholder="例如：东区一教 504"
              placeholderTextColor={placeholderColor}
            />

            <ThemedText style={styles.label}>星期几 (1-7)</ThemedText>
            <View style={styles.weekSelectContainer}>
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <TouchableOpacity 
                  key={d} 
                  style={[styles.weekOption, courseDay === d && { backgroundColor: Colors[theme].tint, borderColor: Colors[theme].tint }]}
                  onPress={() => setCourseDay(d)}
                >
                  <ThemedText style={[styles.weekOptionText, courseDay === d && { color: '#fff' }]}>
                    {['一', '二', '三', '四', '五', '六', '日'][d-1]}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>开始时间</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                  onPress={() => {
                    setPickerMode('course_start');
                    setTempHour(courseStartHour);
                    setTempMinute(courseStartMinute);
                    setIsPickerVisible(true);
                  }}
                >
                  <ThemedText style={{ textAlign: 'center' }}>
                    {String(courseStartHour).padStart(2, '0')}:{String(courseStartMinute).padStart(2, '0')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              <View style={{ width: 20 }} />
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>结束时间</ThemedText>
                <TouchableOpacity 
                  style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                  onPress={() => {
                    setPickerMode('course_end');
                    setTempHour(courseEndHour);
                    setTempMinute(courseEndMinute);
                    setIsPickerVisible(true);
                  }}
                >
                  <ThemedText style={{ textAlign: 'center' }}>
                    {String(courseEndHour).padStart(2, '0')}:{String(courseEndMinute).padStart(2, '0')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Color Palette Removed for Unified Look */}
          </ScrollView>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: Colors[theme].tint }]} onPress={handleSaveCourse}>
            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>保存课程</ThemedText>
          </TouchableOpacity>
          {editingCourse && (
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#ff444415', marginTop: 10, borderWidth: 1, borderColor: '#ff4444' }]} 
                onPress={() => {
                  setCourseModalVisible(false);
                  deleteTask(-editingCourse.id);
                }}
              >
                <ThemedText style={{ color: '#ff4444', fontWeight: 'bold' }}>删除课程</ThemedText>
              </TouchableOpacity>
            )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderWeeklyScheduleModal = () => {
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const colWidth = (SCREEN_WIDTH - 40) / 7; // 40 for left time column width
    const rowHeight = 50;

    return (
      <Modal visible={weeklyModalVisible} animationType="slide" transparent={false}>
        <ThemedView style={{ flex: 1, paddingTop: 50 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10, alignItems: 'center' }}>
            <ThemedText type="subtitle">课程总览</ThemedText>
            <TouchableOpacity onPress={() => setWeeklyModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors[theme].icon} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors[theme].icon + '20', marginLeft: 40 }}>
            {weekDays.map((day, index) => (
              <View key={index} style={{ width: colWidth, alignItems: 'center', paddingVertical: 8 }}>
                <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>{day}</ThemedText>
              </View>
            ))}
          </View>

          <ScrollView>
            <View style={{ flexDirection: 'row' }}>
              {/* Time Column */}
              <View style={{ width: 40 }}>
                {hours.map(h => (
                  <View key={h} style={{ height: rowHeight, alignItems: 'center', justifyContent: 'flex-start' }}>
                    <ThemedText style={{ fontSize: 10, opacity: 0.5, transform: [{ translateY: -6 }] }}>{h}:00</ThemedText>
                  </View>
                ))}
              </View>

              {/* Grid */}
              <View style={{ flex: 1, position: 'relative', height: hours.length * rowHeight }}>
                {/* Horizontal Lines */}
                {hours.map((h, i) => (
                  <View key={i} style={{ position: 'absolute', top: i * rowHeight, left: 0, right: 0, height: 1, backgroundColor: Colors[theme].icon + '10' }} />
                ))}
                
                {/* Vertical Lines */}
                {weekDays.map((_, i) => (
                  <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: i * colWidth, width: 1, backgroundColor: Colors[theme].icon + '10' }} />
                ))}

                {/* Courses */}
                {courses.map((course) => {
                  const [startH, startM] = course.start_time.split(':').map(Number);
                  const [endH, endM] = course.end_time.split(':').map(Number);
                  
                  if (startH < START_HOUR) return null;

                  const top = (startH - START_HOUR) * rowHeight + (startM / 60) * rowHeight;
                  const height = ((endH * 60 + endM) - (startH * 60 + startM)) / 60 * rowHeight;
                  const left = (course.day_of_week - 1) * colWidth;

                  return (
                    <View 
                      key={course.id} 
                      style={{
                        position: 'absolute',
                        top,
                        left: left + 1,
                        width: colWidth - 2,
                        height: height - 2,
                        backgroundColor: Colors[theme].tint + '20',
                        borderRadius: 4,
                        padding: 2,
                        borderLeftWidth: 2,
                        borderLeftColor: Colors[theme].tint,
                        overflow: 'hidden'
                      }}
                    >
                      <ThemedText style={{ fontSize: 9, fontWeight: 'bold', color: Colors[theme].tint }}>{course.name}</ThemedText>
                      <ThemedText style={{ fontSize: 8, opacity: 0.7 }}>{course.location}</ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={{ height: 50 }} />
          </ScrollView>
        </ThemedView>
      </Modal>
    );
  };

  const renderModernDatePicker = () => {
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const daysInMonth = new Date(tempYear, tempMonth, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <Modal animationType="fade" transparent={true} visible={showDatePicker}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <ThemedView style={[styles.modalContent, { maxHeight: 400 }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">选择日期</ThemedText>
              <TouchableOpacity onPress={() => {
                const newDate = new Date(tempYear, tempMonth - 1, tempDay);
                if (startTime) {
                  newDate.setHours(startTime.getHours());
                  newDate.setMinutes(startTime.getMinutes());
                } else {
                  newDate.setHours(new Date().getHours());
                  newDate.setMinutes(0);
                }
                setStartTime(newDate);
                setShowDatePicker(false);
              }}>
                <ThemedText style={{ color: Colors[theme].tint, fontWeight: 'bold' }}>确定</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', height: 200 }}>
               <View style={{ flex: 1 }}>
                 <ThemedText style={{ textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>年</ThemedText>
                 <ScrollView showsVerticalScrollIndicator={false}>
                   {years.map((y) => (
                     <TouchableOpacity key={y} style={[styles.pickerItem, tempYear === y && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempYear(y)}>
                       <ThemedText style={[styles.pickerItemText, tempYear === y && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{y}年</ThemedText>
                     </TouchableOpacity>
                   ))}
                   <View style={{ height: 100 }} />
                 </ScrollView>
               </View>
               <View style={{ flex: 1 }}>
                 <ThemedText style={{ textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>月</ThemedText>
                 <ScrollView showsVerticalScrollIndicator={false}>
                   {months.map((m) => (
                     <TouchableOpacity key={m} style={[styles.pickerItem, tempMonth === m && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempMonth(m)}>
                       <ThemedText style={[styles.pickerItemText, tempMonth === m && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{m}月</ThemedText>
                     </TouchableOpacity>
                   ))}
                   <View style={{ height: 100 }} />
                 </ScrollView>
               </View>
               <View style={{ flex: 1 }}>
                 <ThemedText style={{ textAlign: 'center', marginBottom: 10, fontWeight: 'bold' }}>日</ThemedText>
                 <ScrollView showsVerticalScrollIndicator={false}>
                   {days.map((d) => (
                     <TouchableOpacity key={d} style={[styles.pickerItem, tempDay === d && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempDay(d)}>
                       <ThemedText style={[styles.pickerItemText, tempDay === d && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{d}日</ThemedText>
                     </TouchableOpacity>
                   ))}
                   <View style={{ height: 100 }} />
                 </ScrollView>
               </View>
            </View>
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderModernTimePicker = () => {
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); 
    return (
      <Modal animationType="fade" transparent={true} visible={isPickerVisible}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setIsPickerVisible(false)}>
          <ThemedView style={styles.modernPickerContainer}>
            <View style={styles.modernPickerHeader}>
              <TouchableOpacity onPress={() => setIsPickerVisible(false)}><ThemedText>取消</ThemedText></TouchableOpacity>
              <ThemedText type="subtitle">选择时间</ThemedText>
              <TouchableOpacity onPress={() => {
                if (pickerMode === 'task') {
                  const baseDate = selectedDate; 
                  const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), tempHour, tempMinute);
                  setStartTime(newDate);
                } else if (pickerMode === 'course_start') {
                  setCourseStartHour(tempHour);
                  setCourseStartMinute(tempMinute);
                } else if (pickerMode === 'course_end') {
                  setCourseEndHour(tempHour);
                  setCourseEndMinute(tempMinute);
                }
                setIsPickerVisible(false);
              }}><ThemedText style={{ color: Colors[theme].tint, fontWeight: 'bold' }}>确定</ThemedText></TouchableOpacity>
            </View>
            <View style={styles.pickerColumnsContainer}>
               <View style={styles.pickerColumn}><ScrollView showsVerticalScrollIndicator={false}>{hours.map((h) => (<TouchableOpacity key={h} style={[styles.pickerItem, tempHour === h && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempHour(h)}><ThemedText style={[styles.pickerItemText, tempHour === h && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{h}点</ThemedText></TouchableOpacity>))}<View style={{ height: 100 }} /></ScrollView></View>
               <View style={styles.pickerColumn}><ScrollView showsVerticalScrollIndicator={false}>{minutes.map((m) => (<TouchableOpacity key={m} style={[styles.pickerItem, tempMinute === m && { backgroundColor: Colors[theme].tint + '20' }]} onPress={() => setTempMinute(m)}><ThemedText style={[styles.pickerItemText, tempMinute === m && { color: Colors[theme].tint, fontWeight: 'bold' }]}>{String(m).padStart(2, '0')}分</ThemedText></TouchableOpacity>))}<View style={{ height: 100 }} /></ScrollView></View>
            </View>
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toastConfig.visible} message={toastConfig.message} type={toastConfig.type as any} onHide={() => setToastConfig(p => ({ ...p, visible: false }))} />
      
      <View style={styles.headerContainer}>
        <ThemedText type="subtitle" style={{ fontSize: 20 }}>日程管理</ThemedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.switchViewButton, { backgroundColor: Colors[theme].tint + '15', borderColor: Colors[theme].tint + '30', borderWidth: 1 }]} 
            onPress={() => setWeeklyModalVisible(true)}
          >
            <View style={styles.buttonInner}>
              <Ionicons name="grid-outline" size={18} color={Colors[theme].tint} />
              <ThemedText style={[styles.switchText, { color: Colors[theme].tint }]}>总览</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} style={[styles.switchViewButton, { backgroundColor: Colors[theme].tint + '15', borderColor: Colors[theme].tint + '30', borderWidth: 1 }]} onPress={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}>
              <View style={styles.buttonInner}>
                <Ionicons name={viewMode === 'list' ? "calendar-outline" : "list-outline"} size={18} color={Colors[theme].tint} />
                <ThemedText style={[styles.switchText, { color: Colors[theme].tint }]}>{viewMode === 'list' ? '时间轴' : '列表'}</ThemedText>
              </View>
            </TouchableOpacity>
        </View>
      </View>

      {renderWeekStrip()}

      {isLoading ? <ActivityIndicator size="large" color={Colors[theme].tint} style={{ marginTop: 40 }} /> : (
          <View style={{ flex: 1 }}>{viewMode === 'list' ? (
            <FlatList 
              data={currentDayTasks} 
              keyExtractor={(item) => item.id.toString()} 
              renderItem={renderListItem} 
              contentContainerStyle={styles.listContent} 
              ListEmptyComponent={<ThemedText style={{ textAlign: 'center', marginTop: 40, opacity: 0.5 }}>今天没有安排</ThemedText>}
              ListFooterComponent={
                currentDayTasks.length > 0 ? (
                  <ThemedText style={{ textAlign: 'center', marginTop: 20, marginBottom: 20, fontSize: 12, opacity: 0.4 }}>
                    点击任务名称可编辑 · 点击左侧方框标记完成
                  </ThemedText>
                ) : null
              }
            />
          ) : renderTimeline()}</View>
      )}

        <View style={{ position: 'absolute', bottom: 30, right: 30, alignItems: 'flex-end' }}>
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(selectedDate);
            selected.setHours(0, 0, 0, 0);
            const isPast = selected.getTime() < today.getTime();

            if (isPast) return null;

            return (
              <>
                {fabMenuVisible && (
                  <View style={{ marginBottom: 15, gap: 15, alignItems: 'flex-end' }}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} 
                      onPress={() => { 
                        setFabMenuVisible(false); 
                        openCreateModal(true); // Open in Deadline Mode
                      }}
                    >
                      <View style={{ backgroundColor: Colors[theme].background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity:0.2, shadowRadius:2 }}>
                        <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>添加 Deadline</ThemedText>
                      </View>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', elevation: 5 }}>
                        <Ionicons name="skull" size={24} color="#fff" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} 
                      onPress={() => { 
                        setFabMenuVisible(false); 
                        openEditCourseModal();
                      }}
                    >
                      <View style={{ backgroundColor: Colors[theme].background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity:0.2, shadowRadius:2 }}>
                        <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>添加课程</ThemedText>
                      </View>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors[theme].tint, justifyContent: 'center', alignItems: 'center', elevation: 5 }}>
                        <Ionicons name="school" size={24} color="#fff" />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} 
                      onPress={() => { setFabMenuVisible(false); openCreateModal(); }}
                    >
                      <View style={{ backgroundColor: Colors[theme].background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity:0.2, shadowRadius:2 }}>
                        <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>添加任务</ThemedText>
                      </View>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors[theme].tint, justifyContent: 'center', alignItems: 'center', elevation: 5 }}>
                        <Ionicons name="checkbox" size={24} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity 
                  style={[styles.fab, { backgroundColor: Colors[theme].tint, position: 'relative', bottom: 0, right: 0 }]} 
                  onPress={() => setFabMenuVisible(!fabMenuVisible)}
                >
                  <Ionicons name={fabMenuVisible ? "close" : "add"} size={32} color="#fff" />
                </TouchableOpacity>
              </>
            );
          })()}
        </View>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{editingTask ? '编辑' : (isDeadlineMode ? '新建 Deadline' : '新建任务')}</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={Colors[theme].icon} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.label}>{isDeadlineMode ? 'Deadline 名称' : '任务名称'}</ThemedText>
              <TextInput 
                style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
                value={title} 
                onChangeText={setTitle}
                placeholder={isDeadlineMode ? "例如：提交作业" : "想要完成什么？"}
                placeholderTextColor={placeholderColor}
              />
              <View style={styles.rowInputs}>
                {!isDeadlineMode && (
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.label}>时长(分)</ThemedText>
                    <TextInput 
                      style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
                      value={estimatedDuration} 
                      onChangeText={setEstimatedDuration} 
                      keyboardType="numeric" 
                      placeholder="5-300（可不填）"
                      placeholderTextColor={placeholderColor}
                    />
                  </View>
                )}
                {!isDeadlineMode && <View style={{ width: 10 }} />}
                
                {isDeadlineMode && (
                  <View style={{ flex: 1.5, marginRight: 10 }}>
                    <ThemedText style={styles.label}>截止日期</ThemedText>
                    <TouchableOpacity 
                      style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}
                      onPress={() => {
                        const d = startTime || new Date();
                        setTempYear(d.getFullYear());
                        setTempMonth(d.getMonth() + 1);
                        setTempDay(d.getDate());
                        setShowDatePicker(true);
                      }}
                    >
                      <ThemedText>{startTime ? startTime.toLocaleDateString() : new Date().toLocaleDateString()}</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={{ flex: 1.5 }} onPress={() => {
                  setPickerMode('task');
                  if (startTime) {
                    setTempHour(startTime.getHours());
                    setTempMinute(startTime.getMinutes());
                  } else {
                    const now = new Date();
                    setTempHour(now.getHours());
                    setTempMinute(0);
                  }
                  setIsPickerVisible(true);
                }}>
                  <ThemedText style={styles.label}>{isDeadlineMode ? '截止时间' : '开始时间'}</ThemedText>
                  <View style={[styles.dateButton, { borderColor: Colors[theme].icon + '40' }]}>
                    <ThemedText>{startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '点击选择'}</ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
              <ThemedText style={styles.label}>备注</ThemedText>
              <TextInput 
                style={[styles.input, styles.textArea, { color: Colors[theme].text, borderColor: Colors[theme].icon + '40' }]} 
                value={description} 
                onChangeText={setDescription} 
                multiline 
                placeholder="添加一些细节..."
                placeholderTextColor={placeholderColor}
              />

              {/* Color Palette Restored */}
              {!isDeadlineMode && (
                <>
                  <ThemedText style={styles.label}>颜色标记</ThemedText>
                  <View style={styles.colorPalette}>
                    {PALETTE.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.selectedColorOption]}
                        onPress={() => setSelectedColor(color)}
                      />
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: Colors[theme].tint + '15', borderWidth: 1, borderColor: Colors[theme].tint }]} 
              onPress={handleSaveTask}
            >
              <ThemedText style={{ color: Colors[theme].tint, fontWeight: 'bold' }}>保存</ThemedText>
            </TouchableOpacity>
            {editingTask && (
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: '#ff444415', marginTop: 10, borderWidth: 1, borderColor: '#ff4444' }]} 
                onPress={() => {
                  setModalVisible(false);
                  deleteTask(editingTask.id);
                }}
              >
                <ThemedText style={{ color: '#ff4444', fontWeight: 'bold' }}>{editingTask.is_course ? '删除课程' : '删除任务'}</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>

      {renderWeeklyScheduleModal()}
      {renderCourseModal()}
      {renderModernTimePicker()}
      {renderModernDatePicker()}
      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={closeAlert} />
    </ThemedView>
  );
};

export default function ScheduleScreen() {
  return (
      <ScheduleContent />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  switchViewButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchText: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: 30, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, gap: 12 },
  checkbox: { padding: 2 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 20, fontWeight: '600' },
  durationText: { fontSize: 14, opacity: 0.5, marginTop: 4 },
  actionButton: { padding: 8 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  label: { fontSize: 12, opacity: 0.6, marginBottom: 8, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 15 },
  rowInputs: { flexDirection: 'row' },
  dateButton: { borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center', height: 50 },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: { padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  timelineContainer: { flex: 1 },
  timelineContent: { position: 'relative', paddingRight: 20 },
  timelineRow: { flexDirection: 'row' },
  timelineHourText: { width: 65, textAlign: 'center', fontSize: 12, opacity: 0.3, transform: [{ translateY: -8 }] },
  timelineLine: { flex: 1, height: 1 },
  timelineTaskBlock: { position: 'absolute', borderRadius: 8, padding: 8, justifyContent: 'center' },
  timelineTaskTitle: { fontSize: 11, fontWeight: 'bold'},
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modernPickerContainer: { height: 350, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modernPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pickerColumnsContainer: { flexDirection: 'row', flex: 1 },
  pickerColumn: { flex: 1, alignItems: 'center' },
  pickerItem: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  pickerItemText: { fontSize: 18 },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, marginBottom: 15 },
  dayItem: { alignItems: 'center', padding: 8, borderRadius: 12, minWidth: 45 },
  dayText: { fontSize: 12, opacity: 0.6, marginBottom: 4 },
  dateText: { fontSize: 16, fontWeight: '600' },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  weekSelectContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  weekOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', borderColor: '#ccc' },
  weekOptionText: { fontSize: 14 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center' },
  colorPalette: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  colorOption: { width: 32, height: 32, borderRadius: 16 },
  selectedColorOption: { borderWidth: 3, borderColor: '#fff', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
});

