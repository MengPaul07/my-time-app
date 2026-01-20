import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { CustomAlert } from '@/components/ui/custom-alert';
import { CustomThemeProvider } from '@/contexts/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthSession } from '@/modules/auth/hooks/use-auth-session';
import { GlobalAIAssistant } from '@/modules/ai/components/GlobalAIAssistant';

// 🛠️ 开发调试开关: 设置为 true 可跳过登录检查直接进入 App
const DEV_BYPASS_AUTH = false; 

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  
  // 使用逻辑钩子处理 Auth、Session、热更新和版本检查
  const {
    initialized,
    alertConfig,
    closeAlert
  } = useAuthSession(DEV_BYPASS_AUTH);

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
      
      {/* 全局 AI 悬浮球 */}
      {initialized && <GlobalAIAssistant />}

      <StatusBar style="auto" />
      <CustomAlert 
        visible={alertConfig.visible} 
        title={alertConfig.title} 
        message={alertConfig.message} 
        buttons={alertConfig.buttons} 
        onClose={closeAlert} 
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CustomThemeProvider>
        <RootLayoutNav />
      </CustomThemeProvider>
    </GestureHandlerRootView>
  );
}
