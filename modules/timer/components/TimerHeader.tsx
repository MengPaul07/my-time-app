import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface TimerHeaderProps {
  currentTime: Date;
  currentTask: { title: string } | null;
  isMuted: boolean;
  theme: 'light' | 'dark';
  toggleMute: () => void;
  toggleTheme: () => void;
}

export const TimerHeader: React.FC<TimerHeaderProps> = ({
  currentTime,
  currentTask,
  isMuted,
  theme,
  toggleMute,
  toggleTheme,
}) => {
  const formatClockTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.headerBar}>
      {/* 左侧：时间 */}
      <View style={{ alignItems: 'flex-start' }}>
        <ThemedText style={{ fontSize: 16, fontWeight: '600', color: Colors[theme].text, fontVariant: ['tabular-nums'] }}>{formatClockTime(currentTime)}</ThemedText>
        <ThemedText style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>{formatDate(currentTime)}</ThemedText>
      </View>

      {/* 中央：任务信息 */}
      {currentTask && (
        <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center', height: '100%', pointerEvents: 'none' }}>
           <ThemedText style={{ fontSize: 10, opacity: 0.6 }}>正在专注</ThemedText>
           <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ maxWidth: 150, color: Colors[theme].text }}>{currentTask.title}</ThemedText>
        </View>
      )}

      {/* 右侧：按钮 */}
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity 
          style={{ padding: 8 }}
          onPress={toggleMute}
        >
          <IconSymbol name={isMuted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'} size={20} color={Colors[theme].text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ padding: 8 }}
          onPress={toggleTheme}
        >
          <IconSymbol name={theme === 'dark' ? 'sun.max.fill' : 'moon.fill'} size={20} color={Colors[theme].text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(120, 120, 120, 0.1)',
    borderRadius: 40,
    marginBottom: 20,
  },
});
