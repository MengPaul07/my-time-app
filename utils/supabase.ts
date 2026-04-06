import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!hasSupabaseEnv) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Cloud sync is disabled in this session.'
  );
}

const supabaseUrl = SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey = SUPABASE_ANON_KEY || 'public-anon-key';

export const isSupabaseEnabled = hasSupabaseEnv;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Web 端暂不持久化 Session，避免 SSR/本地缓存相关问题。
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: hasSupabaseEnv,
    detectSessionInUrl: false,
  },
});
