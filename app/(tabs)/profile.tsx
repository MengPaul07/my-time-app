import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomAlert } from '@/components/ui/custom-alert';
import { Toast } from '@/components/ui/toast';
import { ProfileHeader } from '@/components/features/profile/ProfileHeader';
import { ProfileStats } from '@/components/features/profile/ProfileStats';
import { ProfileCharts } from '@/components/features/profile/ProfileCharts';
import { ProfileSettingsModal } from '@/components/features/profile/ProfileSettingsModal';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 导入逻辑钩子
import { useProfile } from '@/hooks/use-profile';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // 使用逻辑钩子
  const {
    session, profile, stats, weeklyStats, todayHourlyStats,
    username, setUsername, isEditing, setIsEditing, isLoading, 
    isCheckingUpdate, isSettingsVisible, setIsSettingsVisible,
    toastConfig, setToastConfig, alertConfig, closeAlert,
    fetchUserProfile, fetchUserStats, handleChangeUsername, handleSignOut, checkForUpdates
  } = useProfile(theme);

  // ========== 页面焦点逻辑 ========== //
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
        fetchUserStats(session.user.id);
      }
    }, [session, fetchUserProfile, fetchUserStats])
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={{ fontSize: 20 }}>个人中心</ThemedText>
          <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={Colors[theme].text} />
          </TouchableOpacity>
        </View>
        
        <ProfileHeader
          session={session}
          profile={profile}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          username={username}
          setUsername={setUsername}
          isLoading={isLoading}
          theme={theme}
          onSave={handleChangeUsername}
        />

        <ProfileStats
          stats={stats}
          theme={theme}
          formatDuration={formatDuration}
        />

        <ProfileCharts
          todayHourlyStats={todayHourlyStats}
          weeklyStats={weeklyStats}
          theme={theme}
        />
      </ScrollView>

      <ProfileSettingsModal
        visible={isSettingsVisible}
        onHide={() => setIsSettingsVisible(false)}
        onCheckUpdates={checkForUpdates}
        onSignOut={handleSignOut}
        theme={theme}
        isCheckingUpdate={isCheckingUpdate}
      />

      <Toast 
        visible={toastConfig.visible} 
        message={toastConfig.message} 
        type={toastConfig.type as any} 
        onHide={() => setToastConfig(prev => ({ ...prev, visible: false }))} 
      />

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={closeAlert}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  settingsButton: {
    padding: 8,
  },
});
