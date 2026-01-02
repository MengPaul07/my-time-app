import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import CircularSlider from '@/components/CircularSlider';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomAlert } from '@/components/ui/custom-alert';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTaskContext } from '@/contexts/TaskContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
// Update the path to the correct location of soundManager or ensure the file exists
import { soundManager } from '@/utils/audio'; // Adjusted to use the correct alias path
import { supabase } from '@/utils/supabase';


// ========== 常量定义 ========== //
const MIN_MINUTES = 25;
const MAX_MINUTES = 300; // 5 hours
const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8;

// ========== 主组件 ========== //
export default function HomeScreen() {
  // ========== 状态管理 ========== //
  const [totalDuration, setTotalDuration] = useState(MIN_MINUTES * 60);
  const [timeLeft, setTimeLeft] = useState(MIN_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMuted, setIsMuted] = useState(soundManager.getMuteStatus());
  const [isGuest, setIsGuest] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date()); // Add current time state
  const timerRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const { toggleTheme } = useTheme();
  const theme = colorScheme ?? 'light';
  const { currentTask, setCurrentTask } = useTaskContext();
  
  // ========== 动画逻辑 ========== //
  const { width } = Dimensions.get('window');
  const TRACK_WIDTH = width - 80;
  const animState = useSharedValue(0); // 0: Inactive, 1: Active
  const waveAnim = useSharedValue(0);
  const rockAnim = useSharedValue(0);
  const bobAnim = useSharedValue(0); // Vertical bobbing for boat
  const smoothProgress = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.getItem('guest_mode').then(val => setIsGuest(val === 'true'));
    
    // Clock timer
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    // View Transition: Controlled by isSessionActive
    animState.value = withTiming(isSessionActive ? 1 : 0, { duration: 800, easing: Easing.inOut(Easing.ease) });
    
    // Animation Movement: Controlled by isActive (Timer Running)
    if (isActive) {
      waveAnim.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
      rockAnim.value = withRepeat<number>(
        withSequence(
          withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.sin) }), // Slower, smoother rocking
          withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      bobAnim.value = withRepeat<number>(
        withSequence(
          withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.quad) }), // Up
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) })   // Down
        ),
        -1,
        true
      );
    } else {
      // Stop animations when paused
      waveAnim.value = 0;
      rockAnim.value = withTiming(0);
      bobAnim.value = withTiming(0);
    }
  }, [isActive, isSessionActive]);

  useEffect(() => {
    if (isSessionActive && totalDuration > 0) {
        const target = (totalDuration - timeLeft) / totalDuration;
        smoothProgress.value = withTiming(target, { duration: 1000, easing: Easing.linear });
    } else if (!isSessionActive) {
        smoothProgress.value = 0;
    }
  }, [timeLeft, isSessionActive, totalDuration]);

  const sliderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animState.value, [0, 1], [1, 0]),
    transform: [{ scale: interpolate(animState.value, [0, 1], [1, 0.8]) }],
    position: 'absolute', 
    zIndex: isSessionActive ? 0 : 10,
  }));

  const timeTextStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(animState.value, [0, 1], [0, -50]) }, // Move UP instead of down to avoid overlap
      { scale: interpolate(animState.value, [0, 1], [1, 0.8]) }
    ],
  }));

  const boatSceneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animState.value, [0.5, 1], [0, 1]),
    transform: [{ translateY: interpolate(animState.value, [0, 1], [20, 0]) }],
    zIndex: isSessionActive ? 10 : 0,
  }));

  const boatStyle = useAnimatedStyle(() => {
    const translateX = interpolate(smoothProgress.value, [0, 1], [-TRACK_WIDTH/2 + 20, TRACK_WIDTH/2 - 20]);
    return {
      transform: [
        { translateX },
        { translateY: bobAnim.value },
        { rotate: `${rockAnim.value}deg` }
      ],
    };
  });
  
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(waveAnim.value, [0, 1], [0, -200]) }],
    flexDirection: 'row',
    width: TRACK_WIDTH * 2, 
  }));

  const taskInfoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(animState.value, [0, 1], [0, 1]),
    transform: [
      { translateX: interpolate(animState.value, [0, 1], [-100, 0]) },
    ],
  }));

  let hadAlert = false;

  // ========== 页面焦点逻辑 ========== //
  // (Removed hardcoded update alert)


  // ========== 任务切换逻辑 ========== //
  useEffect(() => {
    if (currentTask && currentTask.estimated_duration) {
      setTotalDuration(currentTask.estimated_duration);
      setTimeLeft(currentTask.estimated_duration);
      setIsActive(false); // Optional: don't auto-start, let user click start
    }
  }, [currentTask]);

  // ========== 弹窗管理 ========== //
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [] as any[],
  });

  const showAlert = (title: string, message: string, buttons: any[] = []) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: '确定', style: 'default', onPress: closeAlert }],
    });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  // ========== 定时器逻辑 ========== //
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() =>{
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = async () => {
    /**
     * 处理计时器完成后的逻辑。
     */
    soundManager.playSound('complete');
    await uploadStudyLog(totalDuration);
    
    if (currentTask) {
      showAlert('专注完成', `你完成了任务 "${currentTask.title}" 吗？`, [
        { 
          text: '未完成', 
          style: 'cancel', 
          onPress: () => {
            closeAlert();
            resetTimer();
            setCurrentTask(null);
          } 
        },
        { 
          text: '已完成', 
          onPress: async () => {
            closeAlert();
            try {
              const jsonValue = await AsyncStorage.getItem('tasks_data');
              let currentTasks = jsonValue != null ? JSON.parse(jsonValue) : [];
              currentTasks = currentTasks.map((t: any) => t.id === currentTask.id ? { ...t, status: 'completed' } : t);
              await AsyncStorage.setItem('tasks_data', JSON.stringify(currentTasks));
            } catch (e) {
              console.error('Failed to complete task', e);
            }
            resetTimer();
            setCurrentTask(null);
          } 
        }
      ]);
    } else {
      resetTimer();
      setCurrentTask(null);
    }
  };

  const uploadStudyLog = async (duration: number) => {
    /**
     * 上传学习日志到 Supabase。
     * @param duration - 学习时长（秒）。
     */
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase.from('study_logs').insert({
        user_id: user.id,
        duration: duration,
        task_id: currentTask?.id || null,
      });

      if (error) {
        showAlert('上传失败', error.message);
      } else {
        showAlert('恭喜!', `专注完成 ${Math.floor(duration / 60)} 分钟，数据已同步到云端。`);
      }
    } else {
      showAlert('恭喜!', '专注完成 (未登录，数据未同步)');
    }
  };

  // ========== 用户操作函数 ========== //
  const toggleTimer = () => {
    /**
     * 切换计时器的运行状态。
     */
    if (!isActive) {
      soundManager.playSound('start');
      setIsSessionActive(true);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    /**
     * 重置计时器到默认状态。
     */
    setIsActive(false);
    setIsSessionActive(false);
    setTotalDuration(MIN_MINUTES * 60);
    setTimeLeft(MIN_MINUTES * 60);
    setCurrentTask(null);
  };

  const handleEndSession = () => {
    /**
     * 结束当前专注会话。
     */
    setIsActive(false);
    const elapsedTime = totalDuration - timeLeft;
    
    const promptCompletion = () => {
      if (currentTask) {
        setTimeout(() => {
          showAlert('专注结束', `你完成了任务 "${currentTask.title}" 吗？`, [
            { 
              text: '未完成', 
              style: 'cancel', 
              onPress: () => {
                closeAlert();
                resetTimer();
                setCurrentTask(null);
              } 
            },
            { 
              text: '已完成', 
              onPress: async () => {
                closeAlert();
                try {
                  const jsonValue = await AsyncStorage.getItem('tasks_data');
                  let currentTasks = jsonValue != null ? JSON.parse(jsonValue) : [];
                  currentTasks = currentTasks.map((t: any) => t.id === currentTask.id ? { ...t, status: 'completed' } : t);
                  await AsyncStorage.setItem('tasks_data', JSON.stringify(currentTasks));
                } catch (e) {
                  console.error('Failed to complete task', e);
                }
                resetTimer();
                setCurrentTask(null);
              } 
            }
          ]);
        }, 500); // Small delay to ensure previous alert is closed
      } else {
        resetTimer();
        setCurrentTask(null);
      }
    };

    if (elapsedTime < 5 * 60) {
      showAlert('提示', '专注时间不足 5 分钟，无法计入榜单。确定要放弃吗？', [
        { text: '继续专注', style: 'cancel', onPress: () => { setIsActive(true); closeAlert(); } },
        { text: '放弃', style: 'destructive', onPress: () => { 
            soundManager.playSound('end'); 
            closeAlert(); 
            promptCompletion();
          } 
        }
      ]);
    } else {
      showAlert('结束专注', `已专注 ${Math.floor(elapsedTime / 60)} 分钟，确定结束并上传数据吗？`, [
        { text: '继续', style: 'cancel', onPress: () => { setIsActive(true); closeAlert(); } },
        { 
          text: '确定', 
          onPress: async () => {
            soundManager.playSound('end');
            closeAlert();
            await uploadStudyLog(elapsedTime);
            promptCompletion();
          }
        }
      ]);
    }
  };

  const handleTimeChange = (seconds: number) => {
    /**
     * 处理时间调整。
     * @param seconds - 调整后的时间（秒）。
     */
    if (!isSessionActive) {
      setTotalDuration(seconds);
      setTimeLeft(seconds);
    }
  };

  const toggleMute = () => {
    const newStatus = soundManager.toggleMute();
    setIsMuted(newStatus);
  };

  const formatTime = (seconds: number) => {
    /**
     * 格式化时间为 "hh:mm:ss" 或 "mm:ss"。
     * @param seconds - 时间（秒）。
     * @returns 格式化后的时间字符串。
     */
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatClockTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // ========== 渲染部分 ========== //
  return (
    <ThemedView style={styles.container}>
   
      <View style={styles.headerBar}>
        {/* Left: Time */}
        <View style={{ alignItems: 'flex-start' }}>
           <ThemedText style={{ fontSize: 16, fontWeight: '600', color: Colors[theme].text, fontVariant: ['tabular-nums'] }}>{formatClockTime(currentTime)}</ThemedText>
           <ThemedText style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>{formatDate(currentTime)}</ThemedText>
        </View>

        {/* Center: Task Info */}
        {currentTask && (
          <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', height: '100%', pointerEvents: 'none' }}>
             <ThemedText style={{ fontSize: 10, opacity: 0.6 }}>正在专注</ThemedText>
             <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ maxWidth: 150, color: Colors[theme].text }}>{currentTask.title}</ThemedText>
          </View>
        )}

        {/* Right: Buttons */}
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity 
            style={{ padding: 8 }}
            onPress={toggleMute}
          >
            <IconSymbol name={isMuted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'} size={20} color={Colors[theme].text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ padding: 8 }}
            onPress={toggleTheme}
          >
            <IconSymbol name={theme === 'dark' ? 'sun.max.fill' : 'moon.fill'} size={20} color={Colors[theme].text} />
          </TouchableOpacity>
        </View>
      </View>
         {isGuest && (
        <ThemedView style={{ padding: 8, backgroundColor: Colors[theme].tint + '15', borderRadius: 8, marginBottom: 10, width: '100%', alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 12, color: Colors[theme].text, opacity: 0.8 }}>
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

          {/* Boat Scene */}
          <Animated.View style={[styles.boatScene, boatSceneStyle]}>
             {/* Boat */}
             <Animated.View style={[{ position: 'absolute', bottom: 2, zIndex: 10 }, boatStyle]}>
                <Svg width="60" height="50" viewBox="0 0 24 24" fill="none">
                  <Path d="M2 16C2 16 4 20 12 20C20 20 22 16 22 16H2Z" fill={Colors[theme].tint} />
                  <Path d="M12 3V16H18L12 3Z" fill={Colors[theme].tint} opacity={0.8} />
                  <Path d="M11 6V16H6L11 6Z" fill={Colors[theme].tint} opacity={0.6} />
                </Svg>
             </Animated.View>
             
             {/* Waves */}
             <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, zIndex: 20 }, waveStyle]}>
                <Svg width={2000} height="30" viewBox="0 0 2000 30">
                   <Defs>
                     <LinearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                       <Stop offset="0" stopColor={Colors[theme].tint} stopOpacity="0.3" />
                       <Stop offset="1" stopColor={Colors[theme].tint} stopOpacity="0.1" />
                     </LinearGradient>
                   </Defs>
                   <Path 
                     d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 T 250 10 T 300 10 T 350 10 T 400 10 T 450 10 T 500 10 T 550 10 T 600 10 T 650 10 T 700 10 T 750 10 T 800 10 T 850 10 T 900 10 T 950 10 T 1000 10 T 1050 10 T 1100 10 T 1150 10 T 1200 10 T 1250 10 T 1300 10 T 1350 10 T 1400 10 T 1450 10 T 1500 10 T 1550 10 T 1600 10 T 1650 10 T 1700 10 T 1750 10 T 1800 10 T 1850 10 T 1900 10 T 1950 10 T 2000 10 V 30 H 0 Z" 
                     fill="url(#waveGrad)" 
                   />
                   <Path 
                     d="M0 15 Q 25 5 50 15 T 100 15 T 150 15 T 200 15 T 250 15 T 300 15 T 350 15 T 400 15 T 450 15 T 500 15 T 550 15 T 600 15 T 650 15 T 700 15 T 750 15 T 800 15 T 850 15 T 900 15 T 950 15 T 1000 15 T 1050 15 T 1100 15 T 1150 15 T 1200 15 T 1250 15 T 1300 15 T 1350 15 T 1400 15 T 1450 15 T 1500 15 T 1550 15 T 1600 15 T 1650 15 T 1700 15 T 1750 15 T 1800 15 T 1850 15 T 1900 15 T 1950 15 T 2000 15 V 30 H 0 Z" 
                     fill={Colors[theme].tint} 
                     opacity={0.5} 
                   />
                </Svg>
             </Animated.View>
          </Animated.View>

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

      <ThemedView style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.mainButton, { backgroundColor: Colors[theme].tint }]}
          onPress={toggleTimer}
        >
          <IconSymbol
            name={isActive ? 'pause.fill' : 'play.fill'}
            size={32}
            color="#FFFFFF"
          />
          <ThemedText style={styles.buttonText}>
            {isActive ? '暂停' : (timeLeft < totalDuration ? '继续' : '开始专注')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, { borderColor: Colors[theme].icon }]} 
          onPress={timeLeft < totalDuration ? handleEndSession : resetTimer}
        >
          <IconSymbol name={timeLeft < totalDuration ? "stop.fill" : "arrow.counterclockwise"} size={24} color={Colors[theme].text} />
          <ThemedText style={[styles.secondaryButtonText, { color: Colors[theme].text }]}>
            {timeLeft < totalDuration ? '结束' : '重置'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>

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

const styles = StyleSheet.create({
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(120, 120, 120, 0.1)',
    borderRadius: 40,
    marginBottom: 20,
  },
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
  controlsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    gap: 12,
  },
  mainButton: {
    width: '80%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryButton: {
    width: '50%',
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    fontSize: 16,
  },
  boatScene: {
    position: 'absolute',
    width: '100%',
    height: 150,
    bottom: '15%', // Position it lower relative to container
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
});

