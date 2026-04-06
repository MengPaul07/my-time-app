import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';

interface ProfileStatsProps {
  stats: { today: number; total: number; completed: number };
  theme: 'light' | 'dark';
  formatDuration: (seconds: number) => string;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  stats,
  theme,
  formatDuration,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.statsContainer, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
      <View style={styles.statItem}>
        <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
          {formatDuration(stats.today)}
        </ThemedText>
        <ThemedText style={styles.statLabel}>{t('profile.stats.today')}</ThemedText>
      </View>
      
      <View style={[styles.statDivider, { backgroundColor: Colors[theme].icon }]} />
      
      <View style={styles.statItem}>
        <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
          {formatDuration(stats.total)}
        </ThemedText>
        <ThemedText style={styles.statLabel}>{t('profile.stats.total')}</ThemedText>
      </View>
      
      <View style={[styles.statDivider, { backgroundColor: Colors[theme].icon }]} />
      
      <View style={styles.statItem}>
        <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
          {stats.completed}
        </ThemedText>
        <ThemedText style={styles.statLabel}>{t('profile.stats.completed')}</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    opacity: 0.2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
