
import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

// --- Features & Components ---
import { TimerHeader } from '@/modules/timer/components/TimerHeader';
import { TimerControls } from '@/modules/timer/components/TimerControls';
import CircularSlider from '@/modules/timer/components/CircularSlider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomAlert } from '@/components/ui/custom-alert';

// --- Contexts & Hooks ---
import { useTheme } from '@/contexts/ThemeContext';
import { useTimer } from '@/modules/timer/hooks/use-timer';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { useTimerStore } from '@/modules/timer/store/useTimerStore';

// ===================================
// 常量定义 (Constants)
// ===================================
const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;

// ===================================
// 主组件 (HomeScreen)
// ===================================
export default function HomeScreen() {
  const { toggleTheme, activeTheme, theme: themeMode } = useTheme();
  
  const theme = themeMode;
  const colors = activeTheme.colors[themeMode];
  const AnimationComponent = activeTheme.AnimationComponent;
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskMinutes, setQuickTaskMinutes] = useState('25');
  const [quickCreateError, setQuickCreateError] = useState('');
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const addTask = useTaskStore((state) => state.addTask);
  const { session } = useUserStore();
  const setCurrentTask = useTimerStore((state) => state.setCurrentTask);

  // 使用逻辑钩子
  const {
    totalDuration, timeLeft, isActive, isSessionActive, isMuted, isGuest, currentTime, alertConfig,
    currentTask, animState, waveAnim, rockAnim, bobAnim, smoothProgress,
    focusFeedback, dismissFocusFeedback,
    toggleTimer, resetTimer, handleEndSession, handleTimeChange, toggleMute, closeAlert,
  } = useTimer();

  const canStartWithoutPrompt = useMemo(() => {
    if (isSessionActive || isActive) {
      return true;
    }
    return !!currentTask;
  }, [isSessionActive, isActive, currentTask]);

  const inheritedSliderMinutes = useMemo(() => {
    const minutes = Math.round(timeLeft / 60);
    return Math.max(5, Number.isFinite(minutes) ? minutes : 25);
  }, [timeLeft]);

  const handleToggleTimer = () => {
    if (!canStartWithoutPrompt) {
      setCreateTaskModalVisible(true);
      setQuickTaskMinutes(String(inheritedSliderMinutes));
      setQuickCreateError('');
      return;
    }
    toggleTimer();
  };

  const handleCreateTaskAndStart = async () => {
    const title = quickTaskTitle.trim();
    const minutes = Math.max(1, Number.parseInt(quickTaskMinutes || String(inheritedSliderMinutes), 10) || inheritedSliderMinutes);

    if (!title) {
      setQuickCreateError('请先输入专注任务名称。');
      return;
    }

    setIsQuickCreating(true);
    setQuickCreateError('');

    try {
      const startIso = new Date().toISOString();
      await addTask(
        {
          title,
          description: '由专注页快速创建',
          start_time: startIso,
          estimated_duration: Math.max(5, minutes) * 60,
          is_deadline: false,
          color: '#AF52DE',
        },
        session?.user?.id || null
      );

      const latestTasks = useTaskStore.getState().tasks;
      const createdTask =
        latestTasks.find((task) => task.title === title && task.start_time === startIso) || latestTasks[0] || null;

      if (!createdTask) {
        setQuickCreateError('任务创建成功但未找到任务，请到日程页重试。');
        return;
      }

      setCurrentTask(createdTask);
      setCreateTaskModalVisible(false);
      setQuickTaskTitle('');
      setQuickTaskMinutes(String(inheritedSliderMinutes));
      toggleTimer();
    } catch (error) {
      console.error('Quick create focus task failed:', error);
      setQuickCreateError('创建任务失败，请稍后再试。');
    } finally {
      setIsQuickCreating(false);
    }
  };

  // ---------------------------------
  // 动画样式定义 (Animated Styles)
  // 严格 UI 绑定的样式保留在组件中
  // ---------------------------------
  const sliderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animState.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(animState.value, [0, 1], [1, 0.8]) }],
    position: 'absolute', 
    zIndex: isSessionActive ? 0 : 10,
  }));

  const timeTextStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(animState.value, [0, 1], [0, -50]) },
      { scale: interpolate(animState.value, [0, 1], [1, 0.8]) }
    ],
  }));

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------------------------------
  // 渲染界面 (Render)
  // ---------------------------------
  return (
    <ThemedView style={styles.container}>
      <TimerHeader
        currentTime={currentTime}
        currentTask={currentTask}
        isMuted={isMuted}
        theme={theme}
        toggleMute={toggleMute}
        toggleTheme={toggleTheme}
      />

      {isGuest && (
        <ThemedView style={styles.guestNotice}>
          <ThemedText style={[styles.guestNoticeText, { color: colors.text }]}>
            游客模式无法上传数据，如需请在“我的-设置”中退出注册
          </ThemedText>
        </ThemedView>
      )}

      {focusFeedback.visible && (
        <ThemedView style={[styles.feedbackCard, { borderColor: colors.tint + '55', backgroundColor: colors.tint + '12' }]}>
          <View style={styles.feedbackHeaderRow}>
            <ThemedText type="defaultSemiBold" style={styles.feedbackTitle}>{focusFeedback.title}</ThemedText>
            <TouchableOpacity onPress={dismissFocusFeedback} hitSlop={8}>
              <ThemedText style={{ opacity: 0.65 }}>关闭</ThemedText>
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.feedbackSummary}>{focusFeedback.summary}</ThemedText>
          <View style={styles.feedbackMetricsRow}>
            <ThemedText style={styles.feedbackMetric}>学习 {focusFeedback.learningDelta >= 0 ? '+' : ''}{focusFeedback.learningDelta}</ThemedText>
            <ThemedText style={styles.feedbackMetric}>能量 {focusFeedback.energyDelta >= 0 ? '+' : ''}{focusFeedback.energyDelta}</ThemedText>
            <ThemedText style={styles.feedbackMetric}>疲劳 {focusFeedback.fatigueDelta >= 0 ? '+' : ''}{focusFeedback.fatigueDelta}</ThemedText>
          </View>
        </ThemedView>
      )}

      <ThemedView style={styles.timerContainer}>
        <View style={styles.sliderWrapper}>
          <Animated.View style={sliderStyle}>
            <CircularSlider
              totalDuration={totalDuration}
              timeLeft={timeLeft}
              onTimeChange={handleTimeChange}
              isActive={isSessionActive}
              theme={theme}
            />
          </Animated.View>

          <AnimationComponent
            theme={theme}
            animState={animState}
            smoothProgress={smoothProgress}
            waveAnim={waveAnim}
            rockAnim={rockAnim}
            bobAnim={bobAnim}
            isSessionActive={isSessionActive}
          />

          <Animated.View style={[styles.timeTextContainer, timeTextStyle]}>
            <ThemedText type="title" style={styles.timerText}>
              {formatTime(timeLeft)}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.statusText}>
              {isActive ? '专注中...' : (isSessionActive ? '暂停中' : '滑动调整')}
            </ThemedText>
          </Animated.View>
        </View>
      </ThemedView>

      <TimerControls
        theme={theme}
        isActive={isActive}
        timeLeft={timeLeft}
        totalDuration={totalDuration}
        toggleTimer={handleToggleTimer}
        handleEndSession={handleEndSession}
        resetTimer={resetTimer}
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />

      <Modal
        visible={createTaskModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateTaskModalVisible(false)}
      >
        <View style={styles.modalMask}>
          <View style={[styles.quickModalCard, { backgroundColor: colors.background }]}> 
            <ThemedText type="subtitle" style={styles.quickModalTitle}>开始专注前先创建任务</ThemedText>
            <ThemedText style={[styles.quickModalHint, { color: colors.text }]}>需要绑定一个“正在专注”的任务，创建后将自动开始专注。</ThemedText>

            <TextInput
              value={quickTaskTitle}
              onChangeText={setQuickTaskTitle}
              placeholder="例如：线代作业第3题"
              placeholderTextColor={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
              style={[
                styles.quickInput,
                {
                  borderColor: theme === 'dark' ? '#374151' : '#D1D5DB',
                  color: colors.text,
                  backgroundColor: theme === 'dark' ? '#111827' : '#F8FAFC',
                },
              ]}
            />

            <TextInput
              value={quickTaskMinutes}
              onChangeText={setQuickTaskMinutes}
              keyboardType="number-pad"
              placeholder="时长（分钟）"
              placeholderTextColor={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
              style={[
                styles.quickInput,
                {
                  borderColor: theme === 'dark' ? '#374151' : '#D1D5DB',
                  color: colors.text,
                  backgroundColor: theme === 'dark' ? '#111827' : '#F8FAFC',
                },
              ]}
            />

            {!!quickCreateError && <ThemedText style={styles.quickErrorText}>{quickCreateError}</ThemedText>}

            <View style={styles.quickModalActions}>
              <TouchableOpacity
                style={[styles.quickBtn, styles.quickBtnGhost, { borderColor: theme === 'dark' ? '#4B5563' : '#CBD5E1' }]}
                onPress={() => setCreateTaskModalVisible(false)}
                disabled={isQuickCreating}
              >
                <ThemedText>取消</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: colors.tint }]}
                onPress={handleCreateTaskAndStart}
                disabled={isQuickCreating}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>{isQuickCreating ? '创建中...' : '创建并开始'}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

// ---------------------------------
// 样式定义 (Styles)
// ---------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    flex: 1,
    justifyContent: 'center',
  },
  sliderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  timeTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 50,
    lineHeight: 70,
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    marginTop: 5,
    opacity: 0.6,
  },
  guestNotice: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  guestNoticeText: {
    fontSize: 12,
    opacity: 0.8,
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  quickModalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  quickModalTitle: {
    fontSize: 18,
  },
  quickModalHint: {
    opacity: 0.75,
    fontSize: 13,
    marginBottom: 2,
  },
  quickInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  quickErrorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  quickModalActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnGhost: {
    borderWidth: 1,
  },
  feedbackCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 4,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 14,
  },
  feedbackSummary: {
    fontSize: 12,
    opacity: 0.78,
  },
  feedbackMetricsRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 10,
  },
  feedbackMetric: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
});


