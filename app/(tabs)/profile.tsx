import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STORAGE_CF_HANDLE = 'cp:cf:handle';
const STORAGE_PROFILE_LONG_TERM_GOALS = 'profile:long-term-goals';
const STORAGE_GOALS_BUNDLE = 'ai:goals:bundle';
const STORAGE_LEGACY_SCHEDULING_GOALS = 'ai:scheduling:goals';

type GoalExpectation = 'low' | 'medium' | 'high';

type LongTermGoalItem = {
  id: string;
  title: string;
  targetDate: string;
  expectation: GoalExpectation;
  createdAt: string;
};

export default function ProfileScreen() {
  const router = useRouter(); // <--- Add Hook
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

  const [cfHandleInput, setCfHandleInput] = React.useState('');
  const [isSavingHandle, setIsSavingHandle] = React.useState(false);
  const [longTermGoals, setLongTermGoals] = React.useState<LongTermGoalItem[]>([]);
  const [longGoalTitleInput, setLongGoalTitleInput] = React.useState('');
  const [longGoalDateInput, setLongGoalDateInput] = React.useState('');
  const [longGoalExpectation, setLongGoalExpectation] = React.useState<GoalExpectation>('high');
  const [isSavingLongGoals, setIsSavingLongGoals] = React.useState(false);

  // ========== 页面焦点逻辑 ========== //
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
        fetchUserStats(session.user.id);
      }

      const loadCfHandle = async () => {
        const savedHandle = await AsyncStorage.getItem(STORAGE_CF_HANDLE);
        setCfHandleInput(savedHandle ?? '');
      };

      const loadLongTermGoals = async () => {
        const [profileRaw, goalsBundleRaw, legacyRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PROFILE_LONG_TERM_GOALS),
          AsyncStorage.getItem(STORAGE_GOALS_BUNDLE),
          AsyncStorage.getItem(STORAGE_LEGACY_SCHEDULING_GOALS),
        ]);

        if (profileRaw) {
          const parsed = JSON.parse(profileRaw) as LongTermGoalItem[];
          setLongTermGoals(Array.isArray(parsed) ? parsed : []);
          return;
        }

        const bundle = goalsBundleRaw ?? legacyRaw;
        if (!bundle) {
          setLongTermGoals([]);
          return;
        }

        const parsedBundle = JSON.parse(bundle) as any;
        const legacyLongTerm = !Array.isArray(parsedBundle) ? parsedBundle?.longTermGoal : null;
        const legacyTitle = (legacyLongTerm?.title || '').trim();
        if (!legacyTitle) {
          setLongTermGoals([]);
          return;
        }

        const migrated: LongTermGoalItem[] = [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: legacyTitle,
            targetDate: (legacyLongTerm?.targetDate || '').trim(),
            expectation: (legacyLongTerm?.expectation as GoalExpectation) ?? 'high',
            createdAt: new Date().toISOString(),
          },
        ];
        setLongTermGoals(migrated);
        await AsyncStorage.setItem(STORAGE_PROFILE_LONG_TERM_GOALS, JSON.stringify(migrated));
      };

      void loadCfHandle();
      void loadLongTermGoals();
    }, [session, fetchUserProfile, fetchUserStats])
  );

  const handleSaveCfHandle = async () => {
    const nextHandle = cfHandleInput.trim();
    setIsSavingHandle(true);
    try {
      await AsyncStorage.setItem(STORAGE_CF_HANDLE, nextHandle);
      setToastConfig({ visible: true, message: 'CF Handle 已保存', type: 'success' });
    } catch {
      setToastConfig({ visible: true, message: '保存失败，请重试', type: 'error' });
    } finally {
      setIsSavingHandle(false);
    }
  };

  const saveLongTermGoals = async (next: LongTermGoalItem[]) => {
    setLongTermGoals(next);
    await AsyncStorage.setItem(STORAGE_PROFILE_LONG_TERM_GOALS, JSON.stringify(next));
  };

  const isValidDateInput = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime());
  };

  const getCountdownText = (targetDate: string) => {
    if (!isValidDateInput(targetDate)) return '未设置日期';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${targetDate}T00:00:00`);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays > 0) return `D-${diffDays}`;
    if (diffDays === 0) return '今天';
    return `已过 ${Math.abs(diffDays)} 天`;
  };

  const getCountdownMeta = (targetDate: string): { text: string; tone: 'urgent' | 'normal' | 'passed' | 'unknown' } => {
    if (!isValidDateInput(targetDate)) return { text: '未设置', tone: 'unknown' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${targetDate}T00:00:00`);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0) return { text: `+${Math.abs(diffDays)}天`, tone: 'passed' };
    if (diffDays <= 3) return { text: `D-${diffDays}`, tone: 'urgent' };
    return { text: `D-${diffDays}`, tone: 'normal' };
  };

  const handleCreateLongTermGoal = async () => {
    const title = longGoalTitleInput.trim();
    const targetDate = longGoalDateInput.trim();
    if (!title) {
      setToastConfig({ visible: true, message: '请先填写长期目标内容', type: 'error' });
      return;
    }
    if (targetDate && !isValidDateInput(targetDate)) {
      setToastConfig({ visible: true, message: '日期格式应为 YYYY-MM-DD', type: 'error' });
      return;
    }

    setIsSavingLongGoals(true);
    try {
      const next: LongTermGoalItem[] = [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          title,
          targetDate,
          expectation: longGoalExpectation,
          createdAt: new Date().toISOString(),
        },
        ...longTermGoals,
      ].slice(0, 100);
      await saveLongTermGoals(next);
      setLongGoalTitleInput('');
      setLongGoalDateInput('');
      setLongGoalExpectation('high');
      setToastConfig({ visible: true, message: '长期目标已保存', type: 'success' });
    } catch {
      setToastConfig({ visible: true, message: '长期目标保存失败', type: 'error' });
    } finally {
      setIsSavingLongGoals(false);
    }
  };

  const handleDeleteLongTermGoal = async (goalId: string) => {
    try {
      const next = longTermGoals.filter((item) => item.id !== goalId);
      await saveLongTermGoals(next);
      setToastConfig({ visible: true, message: '已删除长期目标', type: 'success' });
    } catch {
      setToastConfig({ visible: true, message: '删除失败，请重试', type: 'error' });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.pageTitle}>个人中心</ThemedText>
          <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={Colors[theme].text} />
          </TouchableOpacity>
        </View>

        <ThemedView style={[styles.handleCard, { borderColor: Colors[theme].border }]}>
          <ThemedText type="defaultSemiBold">Codeforces Handle</ThemedText>
          <TextInput
            value={cfHandleInput}
            onChangeText={setCfHandleInput}
            placeholder="例如 tourist"
            placeholderTextColor={Colors[theme].icon}
            autoCapitalize="none"
            style={[
              styles.handleInput,
              {
                borderColor: Colors[theme].border,
                color: Colors[theme].text,
                backgroundColor: Colors[theme].background,
              },
            ]}
          />
          <TouchableOpacity
            onPress={() => void handleSaveCfHandle()}
            style={[styles.handleSaveBtn, { backgroundColor: Colors[theme].tint }]}
            disabled={isSavingHandle}
          >
            <ThemedText style={styles.handleSaveText}>{isSavingHandle ? '保存中...' : '保存 Handle'}</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={[styles.handleCard, { borderColor: Colors[theme].border }]}>
          <ThemedText type="defaultSemiBold">长期目标（Profile）</ThemedText>
          <TextInput
            value={longGoalTitleInput}
            onChangeText={setLongGoalTitleInput}
            placeholder="目标内容（例如：期末考试 / 面试 / 项目里程碑）"
            placeholderTextColor={Colors[theme].icon}
            style={[
              styles.handleInput,
              {
                borderColor: Colors[theme].border,
                color: Colors[theme].text,
                backgroundColor: Colors[theme].background,
              },
            ]}
          />

          <TextInput
            value={longGoalDateInput}
            onChangeText={setLongGoalDateInput}
            placeholder="目标日期（YYYY-MM-DD）"
            placeholderTextColor={Colors[theme].icon}
            style={[
              styles.handleInput,
              {
                borderColor: Colors[theme].border,
                color: Colors[theme].text,
                backgroundColor: Colors[theme].background,
              },
            ]}
          />

          <View style={styles.expectationRow}>
            {(['low', 'medium', 'high'] as GoalExpectation[]).map((level) => (
              <TouchableOpacity
                key={`profile-long-goal-level-${level}`}
                style={[
                  styles.expectationChip,
                  {
                    borderColor: longGoalExpectation === level ? Colors[theme].tint : Colors[theme].border,
                    backgroundColor: longGoalExpectation === level ? `${Colors[theme].tint}22` : 'transparent',
                  },
                ]}
                onPress={() => setLongGoalExpectation(level)}
              >
                <ThemedText style={{ fontSize: 12 }}>{level === 'low' ? '低' : level === 'high' ? '高' : '中'}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => void handleCreateLongTermGoal()}
            style={[styles.handleSaveBtn, { backgroundColor: Colors[theme].tint }]}
            disabled={isSavingLongGoals}
          >
            <ThemedText style={styles.handleSaveText}>{isSavingLongGoals ? '保存中...' : '创建长期目标'}</ThemedText>
          </TouchableOpacity>

          <View style={styles.longGoalList}>
            {longTermGoals.length > 0 ? (
              longTermGoals.map((item) => (
                <View key={item.id} style={[styles.longGoalItem, { borderColor: Colors[theme].border, backgroundColor: Colors[theme].background }]}> 
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.title}</ThemedText>
                    <ThemedText style={{ color: Colors[theme].icon, fontSize: 12 }}>
                      {item.targetDate || '未定日期'} · 期望 {item.expectation === 'low' ? '低' : item.expectation === 'high' ? '高' : '中'}
                    </ThemedText>
                  </View>
                  <View style={styles.longGoalRightCol}>
                    {(() => {
                      const meta = getCountdownMeta(item.targetDate);
                      const badgeColors =
                        meta.tone === 'urgent'
                          ? { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' }
                          : meta.tone === 'passed'
                          ? { bg: '#E5E7EB', text: '#6B7280', border: '#D1D5DB' }
                          : meta.tone === 'unknown'
                          ? { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' }
                          : { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' };
                      return (
                        <View style={[styles.countdownBadge, { backgroundColor: badgeColors.bg, borderColor: badgeColors.border }]}>
                          <ThemedText style={[styles.countdownBadgeText, { color: badgeColors.text }]}>{meta.text}</ThemedText>
                        </View>
                      );
                    })()}
                    <TouchableOpacity style={[styles.longGoalDeleteBtn, { borderColor: Colors[theme].border }]} onPress={() => void handleDeleteLongTermGoal(item.id)}>
                      <ThemedText style={{ fontSize: 12 }}>删除</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <ThemedText style={{ color: Colors[theme].icon, fontSize: 12 }}>暂无长期目标，先创建一条</ThemedText>
            )}
          </View>
        </ThemedView>

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
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  handleCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  handleInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  handleSaveBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  handleSaveText: {
    color: '#fff',
    fontWeight: '600',
  },
  expectationRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  expectationChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  longGoalList: {
    gap: 8,
  },
  longGoalItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  longGoalRightCol: {
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 84,
  },
  countdownBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 72,
    alignItems: 'center',
  },
  countdownBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  longGoalDeleteBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
