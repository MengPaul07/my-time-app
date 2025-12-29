import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '@/utils/supabase';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthWeakPasswordError } from '@supabase/supabase-js';


const isValidEmail = (email: string) => {
  // 这是一个通用的邮箱验证正则，能匹配绝大多数标准邮箱格式
  // 规则：[非空字符] @ [非空字符] . [非空字符]
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // 登录逻辑：使用邮箱和密码登录
  // 注意：如果遇到连接问题，请检查 utils/supabase.ts 中的 URL 和 Key 是否正确
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
      // 向 Supabase 发起登录请求
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

  // 注册逻辑：创建新用户
  // 注意：默认情况下，如果邮箱已注册，Supabase 为了安全（防止枚举攻击）仍会返回成功。
  // 要让它返回 "User already registered" 错误，需在 Supabase Dashboard -> Settings -> Auth -> Security 中关闭 "Enable email enumeration protection"。
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
      // 向 Supabase 发起注册请求
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
        // 如果没有 session，说明需要邮箱验证
        setErrorMsg('注册成功, 请检查你的邮箱进行验证！');
      }
    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      setErrorMsg(err.message || '请检查网络连接');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>欢迎回来</ThemedText>
      <ThemedText style={styles.subtitle}>请登录或注册以同步你的专注数据</ThemedText>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon }]}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="邮箱 (email@address.com)"
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { color: Colors[theme].text, borderColor: Colors[theme].icon }]}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="密码"
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: Colors[theme].tint }]}
          disabled={loading}
          onPress={signInWithEmail}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>登录</ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: Colors[theme].tint }]}
          disabled={loading}
          onPress={signUpWithEmail}
        >
          <ThemedText style={[styles.buttonText, { color: Colors[theme].tint }]}>注册</ThemedText>
        </TouchableOpacity>

        {errorMsg ? (
          <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.7,
  },
  inputContainer: {
    gap: 15,
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#c10000ff',
    textAlign: 'center',
    marginTop: 10,
    fontSize:12,
  },
});
