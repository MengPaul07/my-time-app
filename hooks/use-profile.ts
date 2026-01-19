import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import * as Updates from 'expo-updates';
import { supabase } from '@/utils/supabase';
import { Colors } from '@/components/constants/theme';

// --- Interfaces ---
export interface UserProfile {
  username: string | null;
  username_updated_at: string | null;
}

export interface UserStats {
  today: number;
  total: number;
  completed: number;
}

export interface ChartData {
  value: number;
  label: string;
  frontColor?: string;
}

export function useProfile(theme: 'light' | 'dark') {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ today: 0, total: 0, completed: 0 });
  const [weeklyStats, setWeeklyStats] = useState<ChartData[]>([]);
  const [todayHourlyStats, setTodayHourlyStats] = useState<ChartData[]>([]);
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'info' as 'success' | 'error' | 'info' });
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] as any[] });

  // ---------------------------------
  // 1. 数据获取 (Data Fetching)
  // ---------------------------------
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, username_updated_at')
        .eq('id', userId);

      if (error) {
        console.error('获取用户资料失败:', error);
        return;
      }

      if (data && data.length > 0) {
        const p = data[0] as UserProfile;
        setProfile(p);
        setUsername(p.username || '');
      } else {
        setProfile({ username: null, username_updated_at: null });
        setUsername('');
      }
    } catch (error) {
      console.error('获取用户资料异常:', error);
    }
  }, []);

  const fetchUserStats = useCallback(async (userId: string) => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();

      // 初始化图表容器
      const weeklyMap = new Map<string, number>();
      const hourlyMap = new Map<number, number>();
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        weeklyMap.set(key, 0);
      }
      for (let i = 6; i <= 23; i++) {
        hourlyMap.set(i, 0);
      }

      // 获取所有日志 (为了总时长)
      const { data: allLogs, error: allLogsError } = await supabase
        .from('study_logs')
        .select('duration, created_at')
        .eq('user_id', userId);
        
      let today = 0;
      let total = 0;

      if (allLogs) {
        allLogs.forEach(log => {
          total += log.duration;
          const logDate = new Date(log.created_at);
          
          if (log.created_at >= startOfDay) {
            today += log.duration;
            const hour = logDate.getHours();
            if (hourlyMap.has(hour)) {
              hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + log.duration / 60);
            }
          }

          if (log.created_at >= sevenDaysAgo) {
             const key = `${logDate.getMonth() + 1}/${logDate.getDate()}`;
             if (weeklyMap.has(key)) {
               weeklyMap.set(key, weeklyMap.get(key)! + log.duration / 60);
             }
          }
        });
      }

      // 获取已完成任务数
      const { count: completedCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

      setStats({ today, total, completed: completedCount || 0 });

      setWeeklyStats(Array.from(weeklyMap.entries()).map(([label, value]) => ({
        label, value: Math.round(value), frontColor: Colors[theme].tint,
      })));

      setTodayHourlyStats(Array.from(hourlyMap.entries()).map(([hour, value]) => ({
        label: `${hour}时`, value: Math.round(value), frontColor: Colors[theme].tint,
      })));

    } catch (error) {
      console.error('获取统计数据异常:', error);
    }
  }, [theme]);

  // ---------------------------------
  // 2. 会话管理 (Session)
  // ---------------------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
        fetchUserStats(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
        fetchUserStats(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, fetchUserStats]);

  // ---------------------------------
  // 3. 用户操作 (Actions)
  // ---------------------------------
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastConfig({ visible: true, message, type });
  };

  const showAlert = (title: string, message: string, buttons: any[] = []) => {
    setAlertConfig({
      visible: true, title, message,
      buttons: buttons.length > 0 ? buttons : [{ text: '确定', style: 'default', onPress: closeAlert }],
    });
  };

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleChangeUsername = async () => {
    if (!username.trim()) { showAlert('提示', '用户名不能为空'); return; }
    if (username.length > 20) { showAlert('提示', '用户名不能超过 20 个字符'); return; }
    if (!session?.user?.id) { showAlert('错误', '用户未登录'); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: session.user.id,
          username: username.trim(),
          username_updated_at: new Date().toISOString(),
        });

      if (error) {
        showAlert('修改失败', error.message.includes('unique') ? '该用户名已被使用' : error.message);
      } else {
        showAlert('修改成功', '用户名已更新');
        setIsEditing(false);
        fetchUserProfile(session.user.id);
      }
    } catch (error: any) {
      showAlert('修改失败', error.message || '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const wasLoggedIn = !!session;
      await AsyncStorage.removeItem('guest_mode');
      DeviceEventEmitter.emit('guest_mode_changed', false);
      await supabase.auth.signOut();
      if (wasLoggedIn) {
        await AsyncStorage.removeItem('courses_data');
      }
    } catch (e) {
      console.error('Sign out failed', e);
    }
  };

  const checkForUpdates = async () => {
    if (__DEV__) {
      showAlert('开发模式', '开发模式下无法检查更新。');
      return;
    }
    setIsCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        showAlert('发现新版本', '是否立即更新？', [
          { text: '取消', style: 'cancel' },
          { text: '更新', onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (e) {
                showAlert('更新失败', '下载更新时出错');
              }
            }
          }
        ]);
      } else {
        showToast('当前已是最新版本', 'success');
      }
    } catch (error: any) {
      showAlert('检查失败', error.message || '无法连接到更新服务器');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return {
    session, profile, stats, weeklyStats, todayHourlyStats,
    username, setUsername, isEditing, setIsEditing, isLoading, 
    isCheckingUpdate, isSettingsVisible, setIsSettingsVisible,
    toastConfig, setToastConfig, alertConfig, closeAlert,
    fetchUserProfile, fetchUserStats, handleChangeUsername, handleSignOut, checkForUpdates
  };
}
