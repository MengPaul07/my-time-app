import { useEffect, useState, useCallback } from 'react';
import { DeviceEventEmitter, Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { useRouter, useSegments } from 'expo-router';
import Constants from 'expo-constants';
import { supabase } from '@/utils/supabase';
import { useUserStore } from '@/modules/auth/store/useUserStore';

// 版本比较辅助函数
const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

export function useAuthSession(devBypassAuth: boolean = false) {
  const setSessionStore = useUserStore(s => s.setSession);
  const setGuestModeStore = useUserStore(s => s.setGuestMode);
  const setInitializedStore = useUserStore(s => s.setInitialized);
  const { session, guestMode, initialized } = useUserStore();

  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    buttons: [] as any[] 
  });
  
  const segments = useSegments();
  const router = useRouter();

  const checkHotUpdates = useCallback(async () => {
    if (__DEV__) return;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        setAlertConfig({
          visible: true,
          title: '更新已就绪',
          message: '新版本已下载完成，重启应用以生效。',
          buttons: [
            {
              text: '稍后',
              style: 'cancel',
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            },
            {
              text: '立即重启',
              onPress: async () => {
                await Updates.reloadAsync();
              }
            }
          ]
        });
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
    }
  }, []);

  const checkAppVersion = useCallback(async () => {
    try {
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      
      const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      if (compareVersions(data.version, currentVersion) > 0) {
        setAlertConfig({
          visible: true,
          title: '发现新版本',
          message: `最新版本: ${data.version}\n${data.description || ''}`,
          buttons: [
            {
              text: data.force_update ? '退出' : '以后再说',
              style: 'cancel',
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            },
            {
              text: '立即下载',
              onPress: () => {
                Linking.openURL(data.download_url);
                setAlertConfig(prev => ({ ...prev, visible: false }));
              }
            }
          ]
        });
      }
    } catch (e) {
      console.error('Version check failed', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const guest = await AsyncStorage.getItem('guest_mode');
      setSessionStore(currentSession);
      setGuestModeStore(guest === 'true');
      setInitializedStore(true);
      
      await checkHotUpdates();
      await checkAppVersion();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSessionStore(currentSession);
    });

    const guestSubscription = DeviceEventEmitter.addListener('guest_mode_changed', (isGuest) => {
      setGuestModeStore(isGuest);
    });

    return () => {
      subscription.unsubscribe();
      guestSubscription.remove();
    };
  }, [checkHotUpdates, checkAppVersion, setSessionStore, setGuestModeStore, setInitializedStore]);

  useEffect(() => {
    if (!initialized || devBypassAuth) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !guestMode && !inAuthGroup) {
      router.replace('/auth');
    } else if ((session || guestMode) && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, guestMode, segments, initialized, devBypassAuth]);

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  return {
    session,
    guestMode,
    initialized,
    alertConfig,
    closeAlert
  };
}
