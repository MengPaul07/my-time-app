import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LeaderboardTabs } from '@/components/features/leaderboard/LeaderboardTabs';
import { LeaderboardItem } from '@/components/features/leaderboard/LeaderboardItem';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 导入逻辑钩子
import { useLeaderboard } from '@/hooks/use-leaderboard';

export default function StandingScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';
  const { t } = useTranslation();

  // 使用逻辑钩子
  const {
    data, isLoading, errorMsg, activeTab, setActiveTab, refresh
  } = useLeaderboard();

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="subtitle" style={styles.pageTitle}>{t('standing.title')}</ThemedText>
        <TouchableOpacity onPress={refresh} style={{ padding: 8 }}>
          <IconSymbol name="arrow.clockwise" size={20} color={Colors[theme].text} />
        </TouchableOpacity>
      </ThemedView>

      <LeaderboardTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        theme={theme} 
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors[theme].tint} />
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <ThemedText style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>{errorMsg}</ThemedText>
          <TouchableOpacity onPress={refresh} style={[styles.refreshButton, { backgroundColor: Colors[theme].tint }]}>
            <ThemedText style={styles.refreshText}>{t('standing.retry')}</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={
            <ThemedText style={{ textAlign: 'center', marginTop: 50, opacity: 0.5 }}>
              {activeTab === 'today' ? t('standing.emptyToday') : t('standing.emptyTotal')}
            </ThemedText>
          }
          renderItem={({ item, index }) => (
            <LeaderboardItem 
              item={item} 
              index={index} 
              theme={theme} 
              formatDuration={formatDuration} 
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  refreshText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
});
