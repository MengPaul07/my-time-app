import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // 使用逻辑钩子处理 Auth 逻辑
  const {
    email, setEmail, password, setPassword, loading, errorMsg,
    handleGuestLogin, signInWithEmail, signUpWithEmail
  } = useAuth();

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

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: Colors[theme].icon, marginTop: 10 }]}
          disabled={loading}
          onPress={handleGuestLogin}
        >
          <ThemedText style={[styles.buttonText, { color: Colors[theme].text }]}>游客登录</ThemedText>
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
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 12,
  },
});
