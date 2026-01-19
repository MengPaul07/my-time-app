import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';

interface LeaderboardTabsProps {
  activeTab: 'today' | 'total';
  onTabChange: (tab: 'today' | 'total') => void;
  theme: 'light' | 'dark';
}

export const LeaderboardTabs: React.FC<LeaderboardTabsProps> = ({
  activeTab,
  onTabChange,
  theme,
}) => {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          activeTab === 'today' && { backgroundColor: Colors[theme].tint }
        ]}
        onPress={() => onTabChange('today')}
      >
        <ThemedText style={[
          styles.tabText, 
          activeTab === 'today' && { color: 'white' }
        ]}>今日榜单</ThemedText>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.tabButton, 
          activeTab === 'total' && { backgroundColor: Colors[theme].tint }
        ]}
        onPress={() => onTabChange('total')}
      >
        <ThemedText style={[
          styles.tabText, 
          activeTab === 'total' && { color: 'white' }
        ]}>总榜单</ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
});
