// Profile 页面：显示用户信息、统计数据、昵称编辑与退出登录。
// 使用说明：
// - 依赖 `supabase` 客户端（在 `utils/supabase.ts` 中初始化）
// - 从 Supabase 获取当前会话并监听会话变化，读取 `user_profiles` 与 `study_logs` 表
// - 提供本地编辑昵称并将其 upsert 到 `user_profiles`
// - 点击“退出登录”调用 `supabase.auth.signOut()`
// 维护提示：如果修改表结构，请同步更新查询字段。
import { Colors } from '@/components/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomAlert } from '@/components/ui/custom-alert';
import { Toast } from '@/components/ui/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { useFocusEffect } from 'expo-router';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Dimensions, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts'; // Ensure this is the correct library or file for BarChart

// 用户资料接口：对应 Supabase 中的 `user_profiles` 表结构（简化）
interface UserProfile {
  // 用户显示名（可为 null）
  username: string | null;
  // 上次修改昵称的时间戳（ISO 字符串）
  username_updated_at: string | null;
}



// 本地统计结构：以秒为单位的学习时长统计
interface UserStats {
  // 今日累计时长（秒）
  today: number;
  // 累计总时长（秒）
  total: number;
  // 已完成任务数
  completed: number;
}

// 主组件：ProfileScreen
// 主要职责：
// - 在挂载时获取并监听 Supabase 会话
// - 拉取并展示用户资料与统计数据
// - 提供昵称编辑与退出登录功能
export default function ProfileScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ today: 0, total: 0, completed: 0 });
  const [weeklyStats, setWeeklyStats] = useState<{ value: number, label: string, frontColor?: string }[]>([]);
  const [todayHourlyStats, setTodayHourlyStats] = useState<{ value: number, label: string, frontColor?: string }[]>([]);
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', type: 'info' });
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // 自定义弹窗状态
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [] as any[],
  });

  const showAlert = (title: string, message: string, buttons: any[] = []) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: '确定', style: 'default', onPress: closeAlert }],
    });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };



  
  // ========== 用户会话相关逻辑 ========== //
  useEffect(() => {
    // 获取当前用户会话并初始化用户数据
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id); // 拉取用户资料
        fetchUserStats(session.user.id); // 拉取用户统计数据
      }
    });

    // 监听用户会话变化，实时更新数据
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
        fetchUserStats(session.user.id);
      }
    });

    return () => subscription.unsubscribe(); // 清理订阅
  }, []);




  // ========== 页面焦点逻辑 ========== //
  useFocusEffect(
    useCallback(() => {
      console.log('用户进入了“我的”页面，开始刷新数据...');

      if (session?.user?.id) {
        fetchUserProfile(session.user.id); // 刷新用户资料
        fetchUserStats(session.user.id); // 刷新用户统计数据
      }

      return () => {
        // 页面离开时的清理逻辑（可选）
      };
    }, [session])
  );



  // ========== 数据获取函数 ========== //
  const fetchUserProfile = async (userId: string) => {
    /**
     * 拉取用户资料（从 user_profiles 表）并填充本地状态。
     * @param userId - 用户的唯一标识符。
     */
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username, username_updated_at')
        .eq('id', userId);

      if (error) {
        console.error('获取用户资料失败:', error);
        return;
      }

      if (data && data.length > 0) {
        setProfile(data[0] as UserProfile); // 更新用户资料状态
        setUsername(data[0]?.username || ''); // 更新用户名
      } else {
        setProfile({ username: null, username_updated_at: null }); // 设置默认用户资料
        setUsername('');
      }
    } catch (error) {
      console.error('获取用户资料异常:', error);
    }
  };

  const fetchUserStats = async (userId: string) => {
    /**
     * 读取 study_logs 表中该用户的日志，计算今日与累计学习时长。
     * 同时读取 tasks 表获取已完成任务数。
     * @param userId - 用户的唯一标识符。
     */
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();

      // 1. 获取学习时长统计 (最近7天)
      const { data: logsData, error: logsError } = await supabase
        .from('study_logs')
        .select('duration, created_at')
        .eq('user_id', userId)
        .gte('created_at', sevenDaysAgo);

      if (logsError) {
        console.error('获取学习日志失败:', logsError);
      }

      let today = 0;
      let total = 0;
      
      // 初始化图表数据
      const weeklyMap = new Map<string, number>();
      const hourlyMap = new Map<number, number>();
      
      // 初始化最近7天
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        weeklyMap.set(key, 0);
      }

      // 初始化今日24小时 (或者只显示有数据的时段，这里初始化常用时段)
      // 简单起见，我们按实际数据填充，或者初始化 6-23 点
      for (let i = 6; i <= 23; i++) {
        hourlyMap.set(i, 0);
      }

      if (logsData) {
        logsData.forEach(log => {
          const logDate = new Date(log.created_at);
          total += log.duration; // 注意：这里只累加了最近7天的total，如果需要总total应该单独查询或者后端聚合。
                                 // 修正：原逻辑是查所有，现在为了性能只查了7天。
                                 // 如果需要总时长，建议单独一个 count query 或者保持原样查所有（如果数据量不大）。
                                 // 考虑到性能，这里先只统计7天内的 total 作为演示，或者再发一个请求查总数。
                                 // 为了准确性，我们恢复查所有的逻辑，但在内存中过滤。
        });
      }
      
      // 重新查询所有日志以获取准确的总时长 (或者优化为数据库聚合)
      const { data: allLogs, error: allLogsError } = await supabase
        .from('study_logs')
        .select('duration, created_at')
        .eq('user_id', userId);
        
      if (allLogs) {
        total = 0; // 重置
        allLogs.forEach(log => {
          total += log.duration;
          const logDate = new Date(log.created_at);
          
          // 统计今日
          if (log.created_at >= startOfDay) {
            today += log.duration;
            const hour = logDate.getHours();
            hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + log.duration / 60); // 分钟
          }

          // 统计本周
          if (log.created_at >= sevenDaysAgo) {
             const key = `${logDate.getMonth() + 1}/${logDate.getDate()}`;
             if (weeklyMap.has(key)) {
               weeklyMap.set(key, weeklyMap.get(key)! + log.duration / 60); // 分钟
             }
          }
        });
      }

      // 格式化图表数据
      const weeklyChartData = Array.from(weeklyMap.entries()).map(([label, value]) => ({
        label,
        value: Math.round(value),
        frontColor: Colors[theme].tint,
      }));

      const hourlyChartData = Array.from(hourlyMap.entries()).map(([hour, value]) => ({
        label: `${hour}时`,
        value: Math.round(value),
        frontColor: Colors[theme].tint,
      }));

      // 2. 获取已完成任务数
      const { count: completedCount, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (tasksError) {
        console.error('获取任务统计失败:', tasksError);
      }

      // 3. 更新状态
      setStats({
        today,
        total,
        completed: completedCount || 0
      });
      setWeeklyStats(weeklyChartData);
      setTodayHourlyStats(hourlyChartData);

    } catch (error) {
      console.error('获取统计数据异常:', error);
    }
  };




  // ========== 用户操作函数 ========== //
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastConfig({ visible: true, message, type });
  };

  const checkForUpdates = async () => {
    if (__DEV__) {
      showAlert('开发模式', '开发模式下无法检查更新，请在正式包中测试。');
      return;
    }

    setIsCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        showAlert('发现新版本', '是否立即更新？', [
          { text: '取消', style: 'cancel' },
          {
            text: '更新',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (e) {
                showAlert('更新失败', '下载更新时出错');
              }
            }
          }
        ]);
      } else {
        showToast('当前已是最新版本', 'success');
      }
    } catch (error: any) {
      showAlert('检查失败', error.message || '无法连接到更新服务器');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleChangeUsername = async () => {
    /**
     * 提交并保存昵称到 user_profiles 表（upsert: 插入或更新）。
     */
    if (!username.trim()) {
      showAlert('提示', '用户名不能为空');
      return;
    }

    if (username.length > 20) {
      showAlert('提示', '用户名不能超过 20 个字符');
      return;
    }

    if (!session?.user?.id) {
      showAlert('错误', '用户未登录');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: session.user.id,
          username: username.trim(),
          username_updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        if (error.message.includes('unique')) {
          showAlert('修改失败', '该用户名已被使用，请选择其他名字');
        } else {
          showAlert('修改失败', error.message);
        }
      } else {
        showAlert('修改成功', '用户名已更新');
        setIsEditing(false);
        await fetchUserProfile(session.user.id);
      }
    } catch (error: any) {
      showAlert('修改失败', error.message || '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    /**
     * 登出当前会话。
     */
    try {
      // Check if we are currently logged in
      const { data: { session } } = await supabase.auth.getSession();
      const wasLoggedIn = !!session;

      // 1. 清除游客状态
      await AsyncStorage.removeItem('guest_mode');
      DeviceEventEmitter.emit('guest_mode_changed', false);

      // 2. Supabase 登出
      const { error } = await supabase.auth.signOut();
      if (error) {
        // 如果是游客，Supabase 登出可能会报错（因为没登录），这里可以忽略或者只在非游客时报错
        // 但为了简单，我们只记录日志
        console.log('Supabase sign out error (expected if guest):', error.message);
      }

      // 3. If we were logged in, clear the local cache of courses
      // (Because they are safely in the cloud, and we don't want the next guest to see them)
      if (wasLoggedIn) {
        await AsyncStorage.removeItem('courses_data');
      }
    } catch (e) {
      console.error('Sign out failed', e);
    }
  };

  // ========== 辅助函数 ========== //
  const formatDuration = (seconds: number) => {
    /**
     * 辅助函数：将秒数格式化为 "Xm"。
     * @param seconds - 需要格式化的秒数。
     * @returns 格式化后的时间字符串。
     */
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
        
        {/* 用户信息卡片 */}
        <View style={[styles.card, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: Colors[theme].tint }]}>
              <ThemedText style={[styles.avatarText, { color: theme === 'dark' ? '#000' : '#fff' }]}>
                {profile?.username ? profile.username[0].toUpperCase() : (session?.user?.email?.[0].toUpperCase() || '?')}
              </ThemedText>
            </View>
          </View>

          <View style={styles.userInfo}>
            {isEditing ? (
              <View style={styles.editForm}>
                <TextInput
                  style={[styles.usernameInput, { color: Colors[theme].text, borderColor: Colors[theme].tint }]}
                  placeholder="输入用户名"
                  placeholderTextColor={Colors[theme].icon}
                  value={username}
                  onChangeText={setUsername}
                  maxLength={20}
                  editable={!isLoading}
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: Colors[theme].tint }]}
                    onPress={handleChangeUsername}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator color={theme === 'dark' ? '#000' : '#fff'} size="small" /> : <ThemedText style={[styles.smallButtonText, { color: theme === 'dark' ? '#000' : '#fff' }]}>保存</ThemedText>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: Colors[theme].icon, opacity: 0.5 }]}
                    onPress={() => {
                      setIsEditing(false);
                      setUsername(profile?.username || '');
                    }}
                    disabled={isLoading}
                  >
                    <ThemedText style={styles.smallButtonText}>取消</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <ThemedText type="subtitle" style={styles.usernameText}>
                  {profile?.username || '未设置昵称'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIcon}>
                  <ThemedText style={{ color: Colors[theme].tint, fontSize: 14 }}>✎ 修改</ThemedText>
                </TouchableOpacity>
              </View>
            )}
            <ThemedText style={styles.emailText}>{session?.user?.email || '未登录'}</ThemedText>
          </View>
        </View>

        {/* 统计数据卡片 */}
        <View style={[styles.statsContainer, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
              {formatDuration(stats.today)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>今日专注</ThemedText>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: Colors[theme].icon }]} />
          
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
              {formatDuration(stats.total)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>累计专注</ThemedText>
          </View>
          
          <View style={[styles.statDivider, { backgroundColor: Colors[theme].icon }]} />
          
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
              {stats.completed}
            </ThemedText>
            <ThemedText style={styles.statLabel}>完成任务</ThemedText>
          </View>
        </View>

        {/* 图表区域 */}
        <View style={[styles.chartCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
          <ThemedText type="subtitle" style={styles.chartTitle}>今日学习时段 (分钟)</ThemedText>
          {todayHourlyStats.length > 0 && todayHourlyStats.some(i => i.value > 0) ? (
            <BarChart
              data={todayHourlyStats}
              barWidth={12}
              spacing={10}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: Colors[theme].text, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: Colors[theme].text, fontSize: 10, width: 30 }}
              noOfSections={3}
              maxValue={Math.max(...todayHourlyStats.map(i => i.value), 60)}
              frontColor={Colors[theme].tint}
              width={Dimensions.get('window').width - 80}
            />
          ) : (
            <ThemedText style={{ opacity: 0.5, textAlign: 'center', marginVertical: 20 }}>今日暂无数据</ThemedText>
          )}
        </View>

        <View style={[styles.chartCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
          <ThemedText type="subtitle" style={styles.chartTitle}>近七日学习时长 (分钟)</ThemedText>
          {weeklyStats.length > 0 && weeklyStats.some(i => i.value > 0) ? (
            <BarChart
              data={weeklyStats}
              barWidth={Dimensions.get('window').width > 380 ? 22 : 16}
              spacing={Dimensions.get('window').width > 380 ? 20 : 15}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: Colors[theme].text, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: Colors[theme].text, fontSize: 10 }}
              noOfSections={3}
              maxValue={Math.max(...weeklyStats.map(i => i.value), 60)}
              frontColor={Colors[theme].tint}
              width={Dimensions.get('window').width - 100}
            />
          ) : (
            <ThemedText style={{ opacity: 0.5, textAlign: 'center', marginVertical: 20 }}>暂无数据</ThemedText>
          )}
        </View>
      </ScrollView>

      {/* 设置模态框 */}
      <Modal
        visible={isSettingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsSettingsVisible(false)}
        >
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">设置</ThemedText>
              <TouchableOpacity onPress={() => setIsSettingsVisible(false)}>
                <Ionicons name="close" size={24} color={Colors[theme].icon} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomColor: Colors[theme].icon + '20' }]}
              onPress={checkForUpdates}
              disabled={isCheckingUpdate}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="cloud-download-outline" size={22} color={Colors[theme].text} />
                <ThemedText style={styles.settingItemText}>检查更新</ThemedText>
              </View>
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color={Colors[theme].tint} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={Colors[theme].icon} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingItem, { borderBottomWidth: 0 }]}
              onPress={handleSignOut}
            >
              <View style={styles.settingItemLeft}>
                <Ionicons name="log-out-outline" size={22} color="#ff4444" />
                <ThemedText style={[styles.settingItemText, { color: '#ff4444' }]}>退出登录</ThemedText>
              </View>
            </TouchableOpacity>
          </ThemedView>
        </TouchableOpacity>
      </Modal>

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
  title: {
    // marginBottom: 30, // Removed as it's handled by header
    alignSelf: 'flex-start',
  },
  settingsButton: {
    padding: 8,
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emailText: {
    fontSize: 14,
    opacity: 0.6,
  },
  editIcon: {
    padding: 4,
  },
  editForm: {
    gap: 8,
  },
  usernameInput: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 4,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
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
  chartCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  chartTitle: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
