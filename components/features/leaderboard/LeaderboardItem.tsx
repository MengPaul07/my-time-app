import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface LeaderboardEntry {
  user_id: string;
  total_duration: number;
  username?: string | null;
  last_task_title?: string | null;
}

interface LeaderboardItemProps {
  item: LeaderboardEntry;
  index: number;
  theme: 'light' | 'dark';
  formatDuration: (seconds: number) => string;
}

export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  item,
  index,
  theme,
  formatDuration,
}) => {
  const isTop3 = index < 3;
  const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : Colors[theme].text;
  const avatarLetter = item.username ? item.username[0].toUpperCase() : 'U';

  return (
    <ThemedView style={[styles.card, { borderColor: Colors[theme].icon + '20', backgroundColor: Colors[theme].background }]}>
      {/* Rank */}
      <View style={styles.rankContainer}>
        <ThemedText style={[styles.rankText, { color: rankColor, fontSize: isTop3 ? 24 : 16 }]}>
          {index + 1}
        </ThemedText>
      </View>
      
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: Colors[theme].tint }]}>
        <ThemedText style={styles.avatarText}>{avatarLetter}</ThemedText>
      </View>
      
      {/* User Info */}
      <View style={styles.userInfo}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
          {item.username || `用户 ${item.user_id.slice(0, 4)}`}
        </ThemedText>
        {item.last_task_title && (
          <ThemedText numberOfLines={1} style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
            最近: {item.last_task_title}
          </ThemedText>
        )}
      </View>

      {/* Duration */}
      <View style={styles.durationContainer}>
        <ThemedText style={[styles.durationText, { color: Colors[theme].tint }]}>
          {formatDuration(item.total_duration)}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '900',
    fontStyle: 'italic',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  durationContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  durationText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
});
