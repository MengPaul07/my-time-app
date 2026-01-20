
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
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

  // 使用逻辑钩子
  const {
    totalDuration, timeLeft, isActive, isSessionActive, isMuted, isGuest, currentTime, alertConfig,
    currentTask, animState, waveAnim, rockAnim, bobAnim, smoothProgress,
    toggleTimer, resetTimer, handleEndSession, handleTimeChange, toggleMute, closeAlert,
  } = useTimer();

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
        toggleTimer={toggleTimer}
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
  }
});


