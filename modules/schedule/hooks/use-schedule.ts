import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { soundManager } from '@/utils/audio';
import { Task, Course } from '@/types/app';
import { PALETTE, START_HOUR, END_HOUR, HOUR_HEIGHT } from '@/constants/config';
import { Colors } from '@/components/constants/theme';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { useTimerStore } from '@/modules/timer/store/useTimerStore';

export function useSchedule(theme: 'light' | 'dark') {
  const router = useRouter();
  const timelineRef = useRef<ScrollView>(null);
  
  // 仓库状态 (Store State)
  const { session, guestMode: isGuest } = useUserStore();
  const { 
    tasks, courses, isLoading, selectedDate, 
    setSelectedDate, fetchData, updateTask, deleteTask: deleteTaskStore, addTask,
    setTasks, setCourses, addCourse, updateCourse, deleteCourse: deleteCourseStore
  } = useTaskStore();
  
  const { setCurrentTask } = useTimerStore();

  // --- 视图模式 ---
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [modalVisible, setModalVisible] = useState(false);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [weeklyModalVisible, setWeeklyModalVisible] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] as any[] });

  // --- 任务表单状态 ---
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isDeadlineMode, setIsDeadlineMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // --- 课程表单状态 ---
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseLocation, setCourseLocation] = useState('');
  const [courseDay, setCourseDay] = useState(1);
  const [courseStartHour, setCourseStartHour] = useState(8);
  const [courseStartMinute, setCourseStartMinute] = useState(0);
  const [courseEndHour, setCourseEndHour] = useState(9);
  const [courseEndMinute, setCourseEndMinute] = useState(35);

  // --- 选择器状态 ---
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'task' | 'course_start' | 'course_end'>('task');
  const [tempHour, setTempHour] = useState(START_HOUR);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(new Date().getMonth() + 1);
  const [tempDay, setTempDay] = useState(new Date().getDate());

  // ---------------------------------
  // 1. 数据加载逻辑 (Data Loading)
  // ---------------------------------
  useEffect(() => {
    fetchData(session?.user?.id || null, selectedDate);
  }, [session, selectedDate, fetchData]);

  // ---------------------------------
  // 2. 任务操作 (Task Actions)
  // ---------------------------------
  const handleSaveTask = async () => {
    if (!title.trim()) { showAlert('提示', '请输入任务名称'); return; }

    const durationInSeconds = isDeadlineMode ? 0 : (estimatedDuration ? parseInt(estimatedDuration) * 60 : 0);
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      estimated_duration: durationInSeconds,
      start_time: startTime ? startTime.toISOString() : null,
      color: isDeadlineMode ? '#000000' : selectedColor,
      is_deadline: isDeadlineMode,
    };

    try {
      if (editingTask) {
        await updateTask(editingTask.id, taskData, !session?.user?.id);
        showToast('任务已更新', 'success');
      } else {
        await addTask(taskData, session?.user?.id || null);
        showToast('任务已创建', 'success');
      }
      setModalVisible(false);
    } catch (e: any) {
      console.error(e);
      showAlert('错误', `保存任务失败: ${e.message || '未知错误'}`);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    if (newStatus === 'completed') soundManager.playSound('complete');
    await updateTask(task.id, { status: newStatus as any }, !session?.user?.id);
  };

  const startFocus = (task: Task) => {
    setCurrentTask(task);
    router.push('/(tabs)');
  };

  // ---------------------------------
  // 3. 课程操作 (Course Actions)
  // ---------------------------------
  const handleSaveCourse = async () => {
    if (!courseName.trim()) { showAlert('提示', '请输入课程名称'); return; }
    const startTimeStr = `${String(courseStartHour).padStart(2, '0')}:${String(courseStartMinute).padStart(2, '0')}:00`;
    const endTimeStr = `${String(courseEndHour).padStart(2, '0')}:${String(courseEndMinute).padStart(2, '0')}:00`;

    const courseData = {
      name: courseName.trim(), 
      location: courseLocation.trim(),
      day_of_week: courseDay, 
      start_time: startTimeStr, 
      end_time: endTimeStr,
    };

    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, courseData, !session?.user?.id);
        showToast('课程已更新', 'success');
      } else {
        await addCourse(courseData, session?.user?.id || null);
        showToast('课程已添加', 'success');
      }
      setCourseModalVisible(false);
    } catch (e) {
      console.error(e);
      showAlert('错误', '保存课程失败');
    }
  };

  // ---------------------------------
  // 4. 删除逻辑 (Deletion)
  // ---------------------------------
  const deleteItem = async (id: number) => {
    const isCourse = id < 0;
    const realId = isCourse ? -id : id;
    const itemType = isCourse ? '课程' : '任务';

    showAlert('确认删除', `确定要删除这个${itemType}吗？`, [
      { text: '取消', style: 'cancel', onPress: closeAlert },
      { text: '删除', style: 'destructive', onPress: async () => {
          try {
            if (isCourse) {
              await deleteCourseStore(realId, !session?.user?.id);
            } else {
              await deleteTaskStore(realId, !session?.user?.id);
            }
            showToast(`${itemType}已删除`, 'success');
            closeAlert();
            setModalVisible(false);
            setCourseModalVisible(false);
          } catch (e) {
            console.error(e);
          }
      }},
    ]);
  };

  // ---------------------------------
  // 5. 弹窗控制 (Modal Handlers)
  // ---------------------------------
  const openCreateModal = (isDeadline = false) => {
    setIsDeadlineMode(isDeadline);
    setEditingTask(null);
    setTitle(''); setDescription(''); setEstimatedDuration('');
    const now = new Date();
    const defaultStart = new Date(selectedDate);
    defaultStart.setHours(now.getHours()); defaultStart.setMinutes(now.getMinutes());
    setStartTime(defaultStart);
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    if (task.is_course) {
      openEditCourseModal(task);
      return;
    }
    setIsDeadlineMode(!!task.is_deadline);
    setEditingTask(task); setTitle(task.title); setDescription(task.description || '');
    setEstimatedDuration(task.estimated_duration ? (task.estimated_duration / 60).toString() : '');
    if (task.start_time) setStartTime(new Date(task.start_time));
    setSelectedColor(task.color || PALETTE[0]);
    setModalVisible(true);
  };

  const openEditCourseModal = (task?: Task) => {
    if (task) {
      const courseId = -task.id;
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setEditingCourse(course);
        setCourseName(course.name);
        setCourseLocation(course.location || '');
        setCourseDay(course.day_of_week);
        const [startH, startM] = course.start_time.split(':').map(Number);
        const [endH, endM] = course.end_time.split(':').map(Number);
        setCourseStartHour(startH); setCourseStartMinute(startM);
        setCourseEndHour(endH); setCourseEndMinute(endM);
      }
    } else {
      setEditingCourse(null);
      setCourseName(''); setCourseLocation(''); setCourseDay(1);
      setCourseStartHour(8); setCourseStartMinute(0);
      setCourseEndHour(9); setCourseEndMinute(35);
    }
    setCourseModalVisible(true);
  };

  const showAlert = (title: string, message: string, buttons: any[] = []) => {
    setAlertConfig({
      visible: true, title, message,
      buttons: buttons.length > 0 ? buttons : [{ text: '确定', style: 'default', onPress: closeAlert }],
    });
  };
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToastConfig({ visible: true, message, type });

  // ---------------------------------
  // 6. 数据处理与计算 (Computed Data)
  // ---------------------------------
  const currentDayTasks = useMemo(() => {
    const dayOfWeek = selectedDate.getDay() || 7;
    const todaysCourses = courses.filter(c => c.day_of_week === dayOfWeek).map(c => {
      const [startH, startM] = c.start_time.split(':').map(Number);
      const [endH, endM] = c.end_time.split(':').map(Number);
      const startTime = new Date(selectedDate); startTime.setHours(startH, startM, 0, 0);
      return {
        id: -c.id, title: c.name, description: c.location, status: 'pending',
        estimated_duration: ((endH * 60 + endM) - (startH * 60 + startM)) * 60,
        actual_duration: 0, start_time: startTime.toISOString(), is_course: true,
        location: c.location, color: Colors[theme].tint
      } as Task;
    });

    const todaysUserTasks = tasks.filter(t => {
      if (!t.start_time) return true;
      const taskDate = new Date(t.start_time);
      return taskDate.getDate() === selectedDate.getDate() &&
             taskDate.getMonth() === selectedDate.getMonth() &&
             taskDate.getFullYear() === selectedDate.getFullYear();
    });

    return [...todaysCourses, ...todaysUserTasks].sort((a, b) => {
      if (a.is_deadline && !b.is_deadline) return -1;
      if (!a.is_deadline && b.is_deadline) return 1;
      if (a.start_time && b.start_time) return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      return 0;
    });
  }, [tasks, courses, selectedDate, theme]);

  const processedTimelineTasks = useMemo(() => {
    // 1. 分离课程和任务
    const validItems = currentDayTasks.filter(t => t.start_time && t.estimated_duration && !t.is_deadline);
    const courseItems = validItems.filter(t => t.is_course);
    const taskItems = validItems.filter(t => !t.is_course);

    // 辅助函数：将列表转换为带布局信息的对象并应用堆叠算法
    const processGroup = (items: typeof validItems, isCourseGroup: boolean) => {
        // 转换基础布局
        const events = items.map(task => {
            const start = new Date(task.start_time!);
            const startTime = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
            const duration = task.estimated_duration! / 60; 
            const endTime = startTime + duration;
            const top = (startTime / 60) * HOUR_HEIGHT;
            const height = Math.max((duration / 60) * HOUR_HEIGHT, 30);
            return { original: task, startTime, endTime, top, height, colIndex: 0, maxCols: 1 };
        }).sort((a, b) => a.startTime - b.startTime);

        // 简易堆叠算法
        const columns: number[] = [];
        events.forEach(ev => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                if (columns[i] <= ev.startTime) {
                    ev.colIndex = i;
                    columns[i] = ev.endTime;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                ev.colIndex = columns.length;
                columns.push(ev.endTime);
            }
        });

        // 布局映射
        return events.map(ev => {
            let layout;
            if (isCourseGroup) {
                // 课程栏：固定在左侧，宽度固定
                // 如果有重叠，简单平铺 (Tiling)
                const widthPerCol = 100 / Math.max(columns.length, 1);
                layout = {
                    top: ev.top,
                    height: ev.height,
                    leftPercent: ev.colIndex * widthPerCol * 0.35, // 缩放到35%的总宽度内
                    widthPercent: widthPerCol * 0.35, 
                    zIndex: 1
                };
            } else {
                // 任务栏：在右侧区域 (35% -> 100%)
                // 采用层叠式布局 (Cascading) 而非平铺，以保证文字可读性
                const baseLeft = 35; // 起始位置
                const availableWidth = 65; // 可用宽度
                
                // 如果重叠太多，适当缩小每个卡片的宽度，形成层叠效果
                // 比如每层向右偏移 10%
                const offsetStep = Math.min(10, 50 / Math.max(columns.length, 1)); 
                const cardWidth = Math.min(85, availableWidth - (ev.colIndex * offsetStep)); 

                layout = {
                    top: ev.top,
                    height: ev.height,
                    leftPercent: baseLeft + (ev.colIndex * offsetStep),
                    widthPercent: cardWidth,
                    zIndex: ev.colIndex + 10 // 确保重叠时后面的在上层
                };
            }
            return { ...ev.original, layout };
        });
    };

    const processedCourses = processGroup(courseItems, true);
    const processedTasks = processGroup(taskItems, false);

    return [...processedCourses, ...processedTasks];
  }, [currentDayTasks]);

  const processedDeadlines = useMemo(() => {
    return currentDayTasks.filter(t => t.is_deadline && t.start_time).map(task => {
      const start = new Date(task.start_time!);
      const top = (start.getHours() - START_HOUR) * HOUR_HEIGHT + (start.getMinutes() / 60) * HOUR_HEIGHT;
      return { ...task, top };
    });
  }, [currentDayTasks]);

  return {
    // 基础状态
    tasks, courses, selectedDate, setSelectedDate, isLoading, viewMode, setViewMode,
    // 弹窗状态
    modalVisible, setModalVisible, courseModalVisible, setCourseModalVisible, 
    weeklyModalVisible, setWeeklyModalVisible, fabMenuVisible, setFabMenuVisible,
    toastConfig, setToastConfig, alertConfig, closeAlert,
    // 任务表单
    editingTask, title, setTitle, description, setDescription, estimatedDuration, setEstimatedDuration,
    startTime, setStartTime, isDeadlineMode, selectedColor, setSelectedColor, showDatePicker, setShowDatePicker,
    // 课程表单
    editingCourse, courseName, setCourseName, courseLocation, setCourseLocation, courseDay, setCourseDay,
    courseStartHour, setCourseStartHour, courseStartMinute, setCourseStartMinute,
    courseEndHour, setCourseEndHour, courseEndMinute, setCourseEndMinute,
    // 选择器状态
    isPickerVisible, setIsPickerVisible, pickerMode, setPickerMode, tempHour, setTempHour, tempMinute, setTempMinute,
    tempYear, setTempYear, tempMonth, setTempMonth, tempDay, setTempDay,
    // 引用
    timelineRef,
    // 操作
    handleSaveTask, toggleTaskStatus, startFocus, handleSaveCourse, deleteItem,
    openCreateModal, openEditModal, openEditCourseModal,
    // 处理后的数据
    currentDayTasks, processedTimelineTasks, processedDeadlines
  };
}
