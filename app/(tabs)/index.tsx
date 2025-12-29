import { StyleSheet, TouchableOpacity, Platform, View } from 'react-native';
import { useState, useEffect, useRef } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import CircularSlider from '@/components/CircularSlider';
import { CustomAlert } from '@/components/ui/custom-alert';
import { useTaskContext } from '@/contexts/TaskContext';

const MIN_MINUTES = 25;
const MAX_MINUTES = 300; // 5 hours

export default function HomeScreen() {
  const [totalDuration, setTotalDuration] = useState(MIN_MINUTES * 60);
  const [timeLeft, setTimeLeft] = useState(MIN_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const { currentTask, setCurrentTask } = useTaskContext();

  // Update timer when a task is selected
  useEffect(() => {
    if (currentTask && currentTask.estimated_duration) {
      setTotalDuration(currentTask.estimated_duration);
      setTimeLeft(currentTask.estimated_duration);
      setIsActive(false); // Optional: don't auto-start, let user click start
    }
  }, [currentTask]);

  // 自定义弹窗状态
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
    await uploadStudyLog(totalDuration);
    resetTimer();
    setCurrentTask(null);
  };

  const uploadStudyLog = async (duration: number) => {
    // 1. 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 2. 上传数据
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

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    // 结束后重置为默认时间 (25分钟)
    setTotalDuration(MIN_MINUTES * 60);
    setTimeLeft(MIN_MINUTES * 60);
  };

  const handleEndSession = () => {
    // 暂停计时
    setIsActive(false);
    
    const elapsedTime = totalDuration - timeLeft;
    
    if (elapsedTime < 5 * 60) {
      showAlert('提示', '专注时间不足 5 分钟，无法计入榜单。确定要放弃吗？', [
        { text: '继续专注', style: 'cancel', onPress: () => { setIsActive(true); closeAlert(); } },
        { text: '放弃', style: 'destructive', onPress: () => { resetTimer(); closeAlert(); } }
      ]);
    } else {
      showAlert('结束专注', `已专注 ${Math.floor(elapsedTime / 60)} 分钟，确定结束并上传数据吗？`, [
        { text: '继续', style: 'cancel', onPress: () => { setIsActive(true); closeAlert(); } },
        { 
          text: '确定', 
          onPress: async () => {
            closeAlert();
            await uploadStudyLog(elapsedTime);
            setCurrentTask(null);
            resetTimer();
          }
        }
      ]);
    }
  };

  const handleTimeChange = (seconds: number) => {
    if (!isActive) {
      setTotalDuration(seconds);
      setTimeLeft(seconds);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ThemedView style={styles.container}>
      {currentTask && (
        <View style={{ position: 'absolute', top: 20, alignItems: 'center', width: '100%', zIndex: 10 }}>
          <ThemedText style={{ opacity: 0.6, fontSize: 14 }}>正在专注任务</ThemedText>
          <ThemedText type="subtitle" style={{ color: Colors[theme].tint }}>{currentTask.title}</ThemedText>
        </View>
      )}
      <ThemedView style={styles.timerContainer}>
        <View style={styles.sliderWrapper}>
          <CircularSlider
            totalDuration={totalDuration}
            timeLeft={timeLeft}
            onTimeChange={handleTimeChange}
            isActive={isActive}
            theme={theme}
          />
          <View style={styles.timeTextContainer}>
            <ThemedText type="title" style={styles.timerText}>
              {formatTime(timeLeft)}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.statusText}>
              {isActive ? '专注中...' : '滑动调整'}
            </ThemedText>
          </View>
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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sliderWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
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
});

