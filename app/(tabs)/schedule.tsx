import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomAlert } from '@/components/ui/custom-alert';
import { Toast } from '@/components/ui/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 导入重构后的组件
import { CalendarStrip } from '@/modules/schedule/components/CalendarStrip';
import { ListView } from '@/modules/schedule/components/ListView';
import { TimelineView } from '@/modules/schedule/components/TimelineView';
import { TaskModal } from '@/modules/schedule/components/TaskModal';
import { CourseModal } from '@/modules/schedule/components/CourseModal';
import { WeeklyScheduleModal } from '@/modules/schedule/components/WeeklyScheduleModal';
import { FloatingActionButton } from '@/modules/schedule/components/FloatingActionButton';
import { ModernDatePicker, ModernTimePicker } from '@/modules/schedule/components/ModernPicker';
import { AIAssistantModal } from '@/modules/ai/components/AIAssistantModal';
import { START_HOUR, END_HOUR, HOUR_HEIGHT } from '@/constants/config';

// 导入逻辑钩子
import { useSchedule } from '@/modules/schedule/hooks/use-schedule';

import * as ImagePicker from 'expo-image-picker';
import { parseScheduleFromImage } from '@/modules/ai/services/scheduleParser';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';

const ScheduleContent = () => {
  const theme = useColorScheme() ?? 'light';
  const [aiModalVisible, setAiModalVisible] = React.useState(false);
  

  // 使用逻辑钩子
  const {
    tasks, courses, selectedDate, setSelectedDate, isLoading, viewMode, setViewMode,
    modalVisible, setModalVisible, courseModalVisible, setCourseModalVisible, 
    weeklyModalVisible, setWeeklyModalVisible, fabMenuVisible, setFabMenuVisible,
    toastConfig, setToastConfig, alertConfig, closeAlert,
    editingTask, title, setTitle, description, setDescription, estimatedDuration, setEstimatedDuration,
    startTime, setStartTime, isDeadlineMode, selectedColor, setSelectedColor, showDatePicker, setShowDatePicker,
    editingCourse, courseName, setCourseName, courseLocation, setCourseLocation, courseDay, setCourseDay,
    courseStartHour, setCourseStartHour, courseStartMinute, setCourseStartMinute,
    courseEndHour, setCourseEndHour, courseEndMinute, setCourseEndMinute,
    isPickerVisible, setIsPickerVisible, pickerMode, setPickerMode, tempHour, setTempHour, tempMinute, setTempMinute,
    tempYear, setTempYear, tempMonth, setTempMonth, tempDay, setTempDay,
    timelineRef,
    handleSaveTask, toggleTaskStatus, startFocus, handleSaveCourse, deleteItem,
    openCreateModal, openEditModal,
    currentDayTasks, processedTimelineTasks, processedDeadlines
  } = useSchedule(theme);

  const { addCourse } = useTaskStore();
  const { session } = useUserStore();

  const handleImportSchedule = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
          setToastConfig({ visible: true, message: '需要相册权限', type: 'error' });
          return; 
      }
      
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false, 
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            setToastConfig({ visible: true, message: 'AI 正在解析课表(DeepSeek)...', type: 'info' });

            // 调用服务
            const parsedCourses = await parseScheduleFromImage(uri);
            
            if (!parsedCourses || parsedCourses.length === 0) {
                setToastConfig({ visible: true, message: '未能识别出有效课程', type: 'error' });
                return;
            }

            let count = 0;
            for (const c of parsedCourses) {
                if (c.name) {
                    await addCourse(c, session?.user?.id || null);
                    count++;
                }
            }
            setToastConfig({ visible: true, message: `成功导入 ${count} 门课程`, type: 'success' });
        }
      } catch (e: any) {
          console.error(e);
          setToastConfig({ visible: true, message: `解析失败: ${e.message}`, type: 'error' });
      }
  };


  // --- 生命周期 ---

  // 自动滚动到当前时间
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
          const scrollY = (currentHour - START_HOUR) * HOUR_HEIGHT + (currentMinute / 60) * HOUR_HEIGHT - 300;
          setTimeout(() => timelineRef.current?.scrollTo({ y: Math.max(0, scrollY), animated: true }), 500);
        }
      }
    }
  }, [viewMode, selectedDate]);

  return (
    <ThemedView style={styles.container}>
      <Toast 
        visible={toastConfig.visible} 
        message={toastConfig.message} 
        type={toastConfig.type as any} 
        onHide={() => setToastConfig(p => ({ ...p, visible: false }))} 
      />
      
      <View style={styles.headerContainer}>
        <ThemedText type="subtitle" style={{ fontSize: 24, fontWeight: 'bold' }}>日程管理</ThemedText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}>
            <Ionicons name={viewMode === 'list' ? "calendar-outline" : "list-outline"} size={24} color={Colors[theme].tint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setWeeklyModalVisible(true)}>
            <Ionicons name="grid-outline" size={24} color={Colors[theme].tint} />
          </TouchableOpacity>
        </View>
      </View>

      <CalendarStrip 
        selectedDate={selectedDate} 
        setSelectedDate={setSelectedDate} 
        setShowDatePicker={setShowDatePicker} 
        theme={theme} 
      />

      {isLoading ? <ActivityIndicator size="large" color={Colors[theme].tint} style={{ marginTop: 40 }} /> : (
        <View style={{ flex: 1 }}>
          {viewMode === 'list' ? (
            <ListView 
              tasks={currentDayTasks} 
              theme={theme} 
              onEditItem={openEditModal} 
              onToggleStatus={toggleTaskStatus} 
              onStartFocus={startFocus} 
            />
          ) : (
            <TimelineView 
              selectedDate={selectedDate} 
              processedTimelineTasks={processedTimelineTasks} 
              processedDeadlines={processedDeadlines} 
              onEditTask={openEditModal} 
              timelineRef={timelineRef} 
              theme={theme} 
            />
          )}
        </View>
      )}

      {/* 悬浮按钮 (FAB) */}
      <FloatingActionButton
        fabMenuVisible={fabMenuVisible}
        setFabMenuVisible={setFabMenuVisible}
        onAddCourse={() => setCourseModalVisible(true)}
        onAddDeadline={() => openCreateModal(true)}
        onAddTask={() => openCreateModal(false)}
        onAiTask={() => setAiModalVisible(true)}
        onImportSchedule={handleImportSchedule}
        theme={theme}
      />

      <AIAssistantModal 
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onTaskConfirmed={(taskDate) => {
           if (taskDate) {
             const isSameDay = taskDate.getDate() === selectedDate.getDate() &&
                               taskDate.getMonth() === selectedDate.getMonth() &&
                               taskDate.getFullYear() === selectedDate.getFullYear();
             
             if (!isSameDay) {
                // 如果任务不在当前显示的日期，跳转过去
                setSelectedDate(taskDate);
                // 延迟一下显示 Toast，因为页面切换可能需要时间
                setTimeout(() => {
                   setToastConfig({
                     visible: true,
                     message: `已跳转至 ${taskDate.getMonth()+1}月${taskDate.getDate()}日`,
                     type: 'info'
                   });
                }, 300);
             } else {
                setToastConfig({ visible: true, message: '任务添加成功', type: 'success' });
             }
           } else {
             // 浮动任务
             setToastConfig({ visible: true, message: '浮动任务已添加', type: 'success' });
           }
        }}
      />

      <TaskModal 
        visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSaveTask}
        title={title} setTitle={setTitle} description={description} setDescription={setDescription}
        estimatedDuration={estimatedDuration} setEstimatedDuration={setEstimatedDuration}
        startTime={startTime} onOpenTimePicker={() => { setPickerMode('task'); setIsPickerVisible(true); }}
        onOpenDatePicker={() => setShowDatePicker(true)} selectedColor={selectedColor} setSelectedColor={setSelectedColor}
        isDeadlineMode={isDeadlineMode} editingTask={editingTask} theme={theme} onDelete={() => editingTask && deleteItem(editingTask.id)}
      />

      <CourseModal 
        visible={courseModalVisible} onClose={() => setCourseModalVisible(false)} onSave={handleSaveCourse}
        onDelete={() => editingCourse && deleteItem(editingCourse.id < 0 ? editingCourse.id : -editingCourse.id)}
        courseName={courseName} setCourseName={setCourseName} courseLocation={courseLocation} setCourseLocation={setCourseLocation}
        courseDay={courseDay} setCourseDay={setCourseDay} courseStartHour={courseStartHour} courseStartMinute={courseStartMinute}
        courseEndHour={courseEndHour} courseEndMinute={courseEndMinute}
        onOpenStartTimePicker={() => { setPickerMode('course_start'); setIsPickerVisible(true); }}
        onOpenEndTimePicker={() => { setPickerMode('course_end'); setIsPickerVisible(true); }}
        editingCourse={editingCourse} theme={theme}
      />

      <WeeklyScheduleModal 
        visible={weeklyModalVisible} onClose={() => setWeeklyModalVisible(false)} 
        courses={courses} theme={theme} 
      />

      <ModernDatePicker 
        visible={showDatePicker} onClose={() => setShowDatePicker(false)} 
        onConfirm={(y, m, d) => {
          const newDate = new Date(y, m - 1, d);
          if (startTime) { newDate.setHours(startTime.getHours()); newDate.setMinutes(startTime.getMinutes()); }
          setStartTime(newDate); setShowDatePicker(false);
        }}
        tempYear={tempYear} setTempYear={setTempYear} tempMonth={tempMonth} setTempMonth={setTempMonth}
        tempDay={tempDay} setTempDay={setTempDay} theme={theme}
      />

      <ModernTimePicker 
        visible={isPickerVisible} onClose={() => setIsPickerVisible(false)}
        onConfirm={(h, m) => {
          if (pickerMode === 'task') {
            const newDate = new Date(selectedDate); newDate.setHours(h); newDate.setMinutes(m);
            setStartTime(newDate);
          } else if (pickerMode === 'course_start') { setCourseStartHour(h); setCourseStartMinute(m); }
          else if (pickerMode === 'course_end') { setCourseEndHour(h); setCourseEndMinute(m); }
          setIsPickerVisible(false);
        }}
        tempHour={tempHour} setTempHour={setTempHour} tempMinute={tempMinute} setTempMinute={setTempMinute}
        theme={theme}
      />

      <CustomAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} buttons={alertConfig.buttons} onClose={closeAlert} />
    </ThemedView>
  );
};

export default function ScheduleScreen() {
  return <ScheduleContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  iconButton: { padding: 8 },
});