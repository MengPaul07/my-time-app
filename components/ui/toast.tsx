import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onHide: () => void;
  duration?: number;
}

export function Toast({ visible, message, type = 'info', onHide, duration = 2000 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const backgroundColor = type === 'error' ? '#ff4444' : type === 'success' ? '#4caf50' : Colors[theme].tint;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.toast, { opacity, backgroundColor }]}>
        <ThemedText style={styles.text}>{message}</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100, // Show near top
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
