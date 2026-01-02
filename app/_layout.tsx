import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Linking, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { CustomAlert } from '@/components/ui/custom-alert';
import { TaskProvider } from '@/contexts/TaskContext';
import { CustomThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';

// 🛠️ 开发调试开关: 设置为 true 可跳过登录检查直接进入 App
const DEV_BYPASS_AUTH = false; 

export const unstable_settings = {
  anchor: '(tabs)',
};

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

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [session, setSession] = useState<Session | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] as any[] });
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. 获取初始 Session 和 Guest Mode
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const guest = await AsyncStorage.getItem('guest_mode');
      setSession(session);
      setGuestMode(guest === 'true');
      setInitialized(true);
    };
    init();

    // 2. 监听 Auth 状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 3. 监听 Guest Mode 变化
    const guestSubscription = DeviceEventEmitter.addListener('guest_mode_changed', (isGuest) => {
      setGuestMode(isGuest);
    });

    // 4. 检查热更新 (Expo Updates)
    const checkHotUpdates = async () => {
      if (__DEV__) return; // 开发模式下跳过

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
    };

    checkHotUpdates();

    // 5. 检查原生应用更新
    const checkAppVersion = async () => {
      try {
        // 在开发环境下跳过检查，避免频繁弹窗
        // if (__DEV__) return; // 暂时注释掉以便测试

        const currentVersion = Constants.expoConfig?.version || '1.0.0';
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        
        console.log(`[VersionCheck] Current: ${currentVersion}, Platform: ${platform}`);

        const { data, error } = await supabase
          .from('app_releases')
          .select('*')
          .eq('platform', platform)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.log('[VersionCheck] Error fetching release:', error);
          return;
        }
        
        if (!data) {
          console.log('[VersionCheck] No release found in database');
          return;
        }

        console.log(`[VersionCheck] Latest in DB: ${data.version}`);

        if (compareVersions(data.version, currentVersion) > 0) {
          setAlertConfig({
            visible: true,
            title: '发现新版本',
            message: `最新版本: ${data.version}\n${data.description || ''}`,
            buttons: [
              {
                text: data.force_update ? '退出' : '以后再说',
                style: 'cancel',
                onPress: () => {
                  setAlertConfig(prev => ({ ...prev, visible: false }));
                  // 如果是强制更新，这里可以做一些限制逻辑
                }
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
    };

    checkAppVersion();

    return () => {
      subscription.unsubscribe();
      guestSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (DEV_BYPASS_AUTH) return;// 🚧 如果开启了调试模式，直接跳过路由保护

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !guestMode && !inAuthGroup) {
      // 如果没登录且不是游客，且不在 auth 页面，跳转到 auth
      router.replace('/auth');
    } else if ((session || guestMode) && inAuthGroup) {
      // 如果已登录或游客，且在 auth 页面，跳转到首页
      router.replace('/(tabs)');
    }
  }, [session, guestMode, initialized, segments]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      <CustomAlert 
        visible={alertConfig.visible} 
        title={alertConfig.title} 
        message={alertConfig.message} 
        buttons={alertConfig.buttons} 
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))} 
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomThemeProvider>
        <TaskProvider>
          <RootLayoutNav />
        </TaskProvider>
      </CustomThemeProvider>
    </GestureHandlerRootView>
  );
}
