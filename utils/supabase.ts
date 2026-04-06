import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// ⚠️ 警告: 请在项目根目录创建 .env 文件，并填写你自己的 Supabase 项目凭证
// 你可以在 Supabase Dashboard -> Project Settings -> API 中找到
// Warning: Create a .env file in the project root and fill in your own Supabase credentials.
// You can find them in Supabase Dashboard -> Project Settings -> API.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage, // 临时修复: Web 端暂不持久化 Session 以避免 SSR 报错
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
