import { supabase } from './supabase';

// 简单的内存缓存
const cache: Record<string, string> = {};

export async function getAppSecret(keyName: string): Promise<string | null> {
  if (cache[keyName]) return cache[keyName];

  try {
    const { data, error } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('name', keyName)
      .single();

    if (data && data.value) {
      cache[keyName] = data.value;
      return data.value;
    }
  } catch (err) {
    console.warn(`Failed to fetch secret ${keyName} from Supabase:`, err);
  }

  // Fallback to Env
  const envMap: Record<string, string | undefined> = {
      'DEEPSEEK_API_KEY': process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      'BAIDU_API_KEY': process.env.EXPO_PUBLIC_BAIDU_API_KEY,
      'BAIDU_SECRET_KEY': process.env.EXPO_PUBLIC_BAIDU_SECRET_KEY,
  };

  return envMap[keyName] || null;
}
