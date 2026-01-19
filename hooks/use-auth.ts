import { useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export function useAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  async function handleGuestLogin() {
    try {
      await AsyncStorage.setItem('guest_mode', 'true');
      DeviceEventEmitter.emit('guest_mode_changed', true);
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    }
  }

  async function signInWithEmail() {
    setErrorMsg('');
    
    if (!isValidEmail(email)) {
      setErrorMsg('请输入正确的邮箱地址 (例如: user@example.com)');
      return;
    }
    
    if (!password) {
      setErrorMsg('请输入密码');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('账号或密码错误');
        } else {
          setErrorMsg(error.message);
        }
      }
    } catch (err: any) {
      console.error('Unexpected login error:', err);
      setErrorMsg(err.message || '请检查网络连接');
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    setErrorMsg('');
    
    if (!isValidEmail(email)) {
      setErrorMsg('请输入正确的邮箱地址 (例如: user@example.com)');
      return;
    }
    
    if (!password) {
      setErrorMsg('请输入密码');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Signup error:', error);
        if (error.message.includes('User already registered')) {
          setErrorMsg('该邮箱已被注册，请直接登录');
        } else if (error.message.includes('Password should be at least')) {
          setErrorMsg('密码长度需大于6位');
        } else {
          setErrorMsg(error.message);
        }
      } else if (!session) {
        setErrorMsg('注册成功, 请检查你的邮箱进行验证！');
      }
    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      setErrorMsg(err.message || '请检查网络连接');
    } finally {
      setLoading(false);
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    errorMsg,
    handleGuestLogin,
    signInWithEmail,
    signUpWithEmail
  };
}
