// Profile 页面：显示用户信息、统计数据、昵称编辑与退出登录。
// 使用说明：
// - 依赖 `supabase` 客户端（在 `utils/supabase.ts` 中初始化）
// - 从 Supabase 获取当前会话并监听会话变化，读取 `user_profiles` 与 `study_logs` 表
// - 提供本地编辑昵称并将其 upsert 到 `user_profiles`
// - 点击“退出登录”调用 `supabase.auth.signOut()`
// 维护提示：如果修改表结构，请同步更新查询字段。
import { StyleSheet, TouchableOpacity, View, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/utils/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { CustomAlert } from '@/components/ui/custom-alert';

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
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
        fetchUserStats(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchUserProfile(session.user.id);
        fetchUserStats(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    // 拉取用户资料（从 user_profiles 表）并填充本地状态
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
        setProfile(data[0] as UserProfile);
        setUsername(data[0]?.username || '');
      } else {
        setProfile({ username: null, username_updated_at: null });
        setUsername('');
      }
    } catch (error) {
      console.error('获取用户资料异常:', error);
    }
  };

  const fetchUserStats = async (userId: string) => {
    // 读取 study_logs 表中该用户的日志，计算今日与累计学习时长
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data, error } = await supabase
        .from('study_logs')
        .select('duration, created_at')
        .eq('user_id', userId);

      if (error) {
        console.error('获取统计数据失败:', error);
        return;
      }

      let today = 0;
      let total = 0;
      if (data) {
        data.forEach(log => {
          total += log.duration;
          if (log.created_at >= startOfDay) {
            today += log.duration;
          }
        });
      }
    } catch (error) {
      console.error('获取统计数据异常:', error);
    }
  };

  const handleChangeUsername = async () => {
    // 提交并保存昵称到 user_profiles（upsert: 插入或更新）
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
    // 登出当前会话
    const { error } = await supabase.auth.signOut();
    if (error) {
      showAlert('退出失败', error.message);
    }
  };

  const formatDuration = (seconds: number) => {
    // 辅助函数：将秒数格式化为 "Xh Ym"
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>个人中心</ThemedText>
        
        {/* 用户信息卡片 */}
        <View style={[styles.card, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: Colors[theme].tint }]}>
              <ThemedText style={styles.avatarText}>
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
                    {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText style={styles.smallButtonText}>保存</ThemedText>}
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
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
            <ThemedText style={styles.statLabel}>今日专注</ThemedText>
            <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
              {formatDuration(stats.today)}
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
            <ThemedText style={styles.statLabel}>累计专注</ThemedText>
            <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
              {formatDuration(stats.total)}
            </ThemedText>
          </View>
            <View style={[styles.statCard, { backgroundColor: Colors[theme].background, borderColor: Colors[theme].icon }]}>
            <ThemedText style={styles.statLabel}>完成任务</ThemedText>
            <ThemedText style={[styles.statValue, { color: Colors[theme].tint }]}>
              {stats.completed}
            </ThemedText>
          </View>
          
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: '#ff4444' }]}
          onPress={handleSignOut}
        >
          <ThemedText style={styles.logoutText}>退出登录</ThemedText>
        </TouchableOpacity>
      </ScrollView>

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
  title: {
    marginBottom: 30,
    alignSelf: 'flex-start',
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
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    marginBottom: 40,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
