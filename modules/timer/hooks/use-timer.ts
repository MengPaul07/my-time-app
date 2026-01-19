import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Easing, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { soundManager } from '@/utils/audio';
import { supabase } from '@/utils/supabase';
import { logService } from '@/modules/timer/services/logService';
import { useTimerStore } from '@/modules/timer/store/useTimerStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';

const MIN_MINUTES = 25;

export function useTimer() {
  // 1. 仓库状态 (Store State)
  const {
    totalDuration, timeLeft, isActive, isSessionActive, currentTask, mode,
    setTotalDuration, setTimeLeft, setIsActive, setIsSessionActive, setCurrentTask, setMode, reset: resetStore
  } = useTimerStore();
  
  const { guestMode: isGuest } = useUserStore();
  const { updateTask } = useTaskStore();

  // 2. 本地 UI 状态
  const [isMuted, setIsMuted] = useState(soundManager.getMuteStatus());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [] as any[],
  });

  const timerRef = useRef<any>(null);

  // 2. 动画共享值
  const animState = useSharedValue(0);
  const waveAnim = useSharedValue(0);
  const rockAnim = useSharedValue(0);
  const bobAnim = useSharedValue(0);
  const smoothProgress = useSharedValue(0);

  // 3. 核心逻辑
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (currentTask && currentTask.estimated_duration) {
      setTotalDuration(currentTask.estimated_duration);
      setTimeLeft(currentTask.estimated_duration);
      setIsActive(false);
    }
  }, [currentTask]);

  useEffect(() => {
    animState.value = withTiming(isSessionActive ? 1 : 0, { duration: 800, easing: Easing.inOut(Easing.ease) });
    
    if (isActive) {
      waveAnim.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
      rockAnim.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ), -1, true
      );
      bobAnim.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) })
        ), -1, true
      );
    } else {
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

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      handleTimerComplete();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

  // 4. 处理函数
  const showAlert = (title: string, message: string, buttons: any[] = []) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: '确定', style: 'default', onPress: closeAlert }],
    });
  };

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const toggleMute = () => {
    const newStatus = soundManager.toggleMute();
    setIsMuted(newStatus);
  };

  const toggleTimer = () => {
    if (!isActive) {
      soundManager.playSound('start');
      setIsSessionActive(true);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsSessionActive(false);
    setTotalDuration(MIN_MINUTES * 60);
    setTimeLeft(MIN_MINUTES * 60);
    setCurrentTask(null);
  };

  const handleTimeChange = (seconds: number) => {
    if (!isSessionActive) {
      setTotalDuration(seconds);
      setTimeLeft(seconds);
    }
  };

  const uploadStudyLog = async (duration: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        await logService.uploadStudyLog(user.id, duration, currentTask?.id || null);
        showAlert('恭喜!', `专注完成 ${Math.floor(duration / 60)} 分钟，数据已同步到云端。`);
      } catch (error: any) {
        showAlert('上传失败', error.message || '未知错误');
      }
    } else {
      showAlert('恭喜!', '专注完成 (未登录，数据未同步)');
    }
  };

  const handleTimerComplete = async () => {
    soundManager.playSound('complete');
    await uploadStudyLog(totalDuration);
    askTaskCompletion();
  };

  const askTaskCompletion = () => {
    if (currentTask) {
      showAlert('专注完成', `你完成了任务 "${currentTask.title}" 吗？`, [
        { text: '未完成', style: 'cancel', onPress: () => { closeAlert(); resetTimer(); } },
        { text: '已完成', onPress: async () => { closeAlert(); await completeCurrentTask(); resetTimer(); } }
      ]);
    } else {
      resetTimer();
    }
  };

  const completeCurrentTask = async () => {
    if (!currentTask) return;
    try {
      await updateTask(currentTask.id, { status: 'completed' });
    } catch (e) {
      console.error('Failed to complete task', e);
    }
  };

  const handleEndSession = () => {
    setIsActive(false);
    const elapsedTime = totalDuration - timeLeft;
    
    const afterSessionEnd = () => {
      if (currentTask) {
        setTimeout(() => {
          showAlert('专注结束', `你完成了任务 "${currentTask.title}" 吗？`, [
            { text: '未完成', style: 'cancel', onPress: () => { closeAlert(); resetTimer(); } },
            { text: '已完成', onPress: async () => { closeAlert(); await completeCurrentTask(); resetTimer(); } }
          ]);
        }, 500); 
      } else {
        resetTimer();
      }
    };

    if (elapsedTime < 5 * 60) {
      showAlert('提示', '专注时间不足 5 分钟，无法计入榜单。确定要放弃吗？', [
        { text: '继续专注', style: 'cancel', onPress: () => { setIsActive(true); closeAlert(); } },
        { text: '放弃', style: 'destructive', onPress: () => { soundManager.playSound('end'); closeAlert(); afterSessionEnd(); } }
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
            afterSessionEnd();
          }
        }
      ]);
    }
  };

  return {
    totalDuration, timeLeft, isActive, isSessionActive, isMuted, isGuest, currentTime, alertConfig,
    currentTask, animState, waveAnim, rockAnim, bobAnim, smoothProgress,
    toggleTimer, resetTimer, handleEndSession, handleTimeChange, toggleMute, closeAlert,
  };
}
