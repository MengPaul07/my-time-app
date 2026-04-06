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
const HEALTH_RECORD_PREFIX = 'health_record_';
const HEALTH_STATUS_HISTORY_KEY = 'health_status_history';

const DEFAULT_LEARNING_STATE = {
  overall: 0,
  courseStudy: 0,
  acmStudy: 0,
  projectStudy: 0,
  englishStudy: 0,
  researchStudy: 0,
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const inferLearningChannel = (title = ''): keyof typeof DEFAULT_LEARNING_STATE => {
  const text = title.toLowerCase();
  if (/(acm|icpc|codeforces|leetcode|算法|刷题|vp)/.test(text)) {
    return 'acmStudy';
  }
  if (/(项目|project|开发|coding|工程)/.test(text)) {
    return 'projectStudy';
  }
  if (/(英语|english|单词|听力|阅读)/.test(text)) {
    return 'englishStudy';
  }
  if (/(科研|research|论文|paper)/.test(text)) {
    return 'researchStudy';
  }
  return 'courseStudy';
};

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
  const [focusFeedback, setFocusFeedback] = useState<{
    visible: boolean;
    title: string;
    summary: string;
    learningDelta: number;
    energyDelta: number;
    fatigueDelta: number;
  }>({
    visible: false,
    title: '',
    summary: '',
    learningDelta: 0,
    energyDelta: 0,
    fatigueDelta: 0,
  });

  const timerRef = useRef<any>(null);

  const syncHealthPanelAfterFocus = async (focusSeconds: number) => {
    if (focusSeconds <= 0) return;

    try {
      const now = new Date();
      const dateKey = getDateKey(now);
      const todayRecordKey = `${HEALTH_RECORD_PREFIX}${dateKey}`;

      const [todayRaw, historyRaw] = await Promise.all([
        AsyncStorage.getItem(todayRecordKey),
        AsyncStorage.getItem(HEALTH_STATUS_HISTORY_KEY),
      ]);

      const focusMinutes = Math.max(1, Math.round(focusSeconds / 60));
      const gain = Math.max(1, Math.min(12, Math.round(focusMinutes / 10)));
      const channel = inferLearningChannel(currentTask?.title || '');

      const todayRecord = todayRaw ? JSON.parse(todayRaw) : null;
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      const latest = Array.isArray(history) && history.length > 0 ? history[0] : null;

      const learningBase = {
        ...DEFAULT_LEARNING_STATE,
        ...(todayRecord?.learningState || {}),
      };
      const nextLearningState = {
        ...learningBase,
        [channel]: clampScore((learningBase as any)[channel] + gain),
      } as typeof DEFAULT_LEARNING_STATE;
      nextLearningState.overall = clampScore(learningBase.overall + Math.max(1, Math.round(gain * 0.8)));

      if (todayRecord) {
        const nextRecord = {
          ...todayRecord,
          capturedAt: now.toISOString(),
          learningState: nextLearningState,
        };
        await AsyncStorage.setItem(todayRecordKey, JSON.stringify(nextRecord));
      }

      const snapshot = {
        date: dateKey,
        capturedAt: now.toISOString(),
        overallScore: clampScore(latest?.overallScore ?? 68),
        learningOverallScore: clampScore(nextLearningState.overall),
        bodyHealthScore: clampScore(latest?.bodyHealthScore ?? 68),
        stressScore: clampScore(latest?.stressScore ?? 45),
        fatigueScore: clampScore((latest?.fatigueScore ?? 40) + (focusMinutes >= 45 ? 3 : 1)),
        energyScore: clampScore((latest?.energyScore ?? 62) - (focusMinutes >= 45 ? 4 : 2)),
        analysis: `专注 ${focusMinutes} 分钟后自动更新：学习进度上升，疲劳略增、能量略降。`,
      };

      const prevLearning = clampScore(latest?.learningOverallScore ?? learningBase.overall ?? 0);
      const prevEnergy = clampScore(latest?.energyScore ?? 62);
      const prevFatigue = clampScore(latest?.fatigueScore ?? 40);
      const learningDelta = snapshot.learningOverallScore - prevLearning;
      const energyDelta = snapshot.energyScore - prevEnergy;
      const fatigueDelta = snapshot.fatigueScore - prevFatigue;

      setFocusFeedback({
        visible: true,
        title: `🎉 完成 ${focusMinutes} 分钟专注`,
        summary: currentTask ? `任务「${currentTask.title}」已写入成长记录` : '本次专注已写入成长记录',
        learningDelta,
        energyDelta,
        fatigueDelta,
      });

      const merged = [snapshot, ...history]
        .filter((item, idx, arr) => idx === arr.findIndex((x) => x.capturedAt === item.capturedAt))
        .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
        .slice(0, 30);

      await AsyncStorage.setItem(HEALTH_STATUS_HISTORY_KEY, JSON.stringify(merged));
    } catch (error) {
      console.warn('Failed to auto update health panel after focus:', error);
    }
  };

  // 2. 动画共享值
  const animState = useSharedValue(0);
  const waveAnim = useSharedValue(0);
  const rockAnim = useSharedValue(0);
  const bobAnim = useSharedValue(0);
  const smoothProgress = useSharedValue(0);

  // 3. 核心逻辑
  useEffect(() => {
    if (!focusFeedback.visible) {
      return;
    }
    const timer = setTimeout(() => {
      setFocusFeedback((prev) => ({ ...prev, visible: false }));
    }, 5000);
    return () => clearTimeout(timer);
  }, [focusFeedback.visible]);

  // 2. 动画共享值
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
    await syncHealthPanelAfterFocus(totalDuration);
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
        {
          text: '放弃',
          style: 'destructive',
          onPress: async () => {
            soundManager.playSound('end');
            closeAlert();
            await syncHealthPanelAfterFocus(elapsedTime);
            afterSessionEnd();
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
            await syncHealthPanelAfterFocus(elapsedTime);
            afterSessionEnd();
          }
        }
      ]);
    }
  };

  return {
    totalDuration, timeLeft, isActive, isSessionActive, isMuted, isGuest, currentTime, alertConfig,
    currentTask, animState, waveAnim, rockAnim, bobAnim, smoothProgress,
    focusFeedback,
    dismissFocusFeedback: () => setFocusFeedback((prev) => ({ ...prev, visible: false })),
    toggleTimer, resetTimer, handleEndSession, handleTimeChange, toggleMute, closeAlert,
  };
}
