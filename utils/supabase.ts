import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// ⚠️ 警告: 请将下面的 URL 和 Key 替换为你自己的 Supabase 项目凭证
// 你可以在 Supabase Dashboard -> Project Settings -> API 中找到
const SUPABASE_URL = 'https://lgbjxzipiqworlziwcsk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmp4emlwaXF3b3Jseml3Y3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTUyNDMsImV4cCI6MjA4MjMzMTI0M30.jxRIkGD7MaqzoioLZTgMFMoOTTlaPuXOq55oTZGGtsc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage, // 临时修复: Web 端暂不持久化 Session 以避免 SSR 报错
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
