// 专注榜页面（Leaderboard）
// 幽灵注释：文件负责拉取并展示“今日 / 总计”专注榜，前端做简单聚合并渲染。
// 关键点：从 `study_logs` 拉取日志，按 user_id 聚合时长，额外查询用户昵称与任务标题。
import { StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, View } from 'react-native';
import { useState, useEffect } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/utils/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 榜单项：每个用户的聚合结果（最小字段集）
interface LeaderboardEntry {
  // 用户 id（来自 auth 或 user_profiles）
  user_id: string;
  // 聚合后的总时长（秒）
  total_duration: number;
  // 可选：排名（在渲染时由 index 确定）
  rank?: number;
  // 用户名（若有）
  username?: string | null;
  // 最近一次专注对应的任务标题（若有）
  last_task_title?: string | null;
}

export default function TabTwoScreen() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'total'>('today');
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  const fetchLeaderboard = async (range: 'today' | 'total') => {
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      // 1) 基本查询：从 study_logs 拉取需要的字段
      let query = supabase
        .from('study_logs')
        .select('user_id, duration, created_at, task_id');

      if (range === 'today') {
        // 1. 获取今日开始时间 (本地时间 0 点转 UTC)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStr = startOfDay.toISOString();
        query = query.gte('created_at', todayStr);
      }

      // 2. 执行查询
      const { data: logs, error } = await query;

      if (error) {
        throw error;
      }

      if (!logs || logs.length === 0) {
        // 无数据，直接清空展示
        setData([]);
        return;
      }

      // 3) 前端聚合：按 user_id 累计时长并记录最近一条日志（用于取最近任务）
      const userTotals: Record<string, number> = {};
      const userLastLog: Record<string, { created_at: string, task_id: number | null }> = {};

      logs.forEach(log => {
        userTotals[log.user_id] = (userTotals[log.user_id] || 0) + log.duration;

        // 更新该用户的最新日志（用于显示最近任务标题）
        if (!userLastLog[log.user_id] || new Date(log.created_at) > new Date(userLastLog[log.user_id].created_at)) {
            userLastLog[log.user_id] = { created_at: log.created_at, task_id: log.task_id };
        }
      });

      // 4) 批量查询用户名与任务标题以减少请求次数（并行请求）
      const userIds = Object.keys(userTotals);
      const taskIds = Object.values(userLastLog)
        .map(l => l.task_id)
        .filter(id => id !== null) as number[];
      
      const [profilesResult, tasksResult] = await Promise.all([
        supabase.from('user_profiles').select('id, username').in('id', userIds),
        taskIds.length > 0 ? supabase.from('tasks').select('id, title').in('id', taskIds) : { data: [], error: null }
      ]);

      const profiles = profilesResult.data;
      const tasks = tasksResult.data;

      const usernameMap: Record<string, string | null> = {};
      if (profiles) {
        profiles.forEach(profile => {
          usernameMap[profile.id] = profile.username;
        });
      }
      
      const taskTitleMap: Record<number, string> = {};
      if (tasks) {
        tasks.forEach(task => {
          taskTitleMap[task.id] = task.title;
        });
      }

      // 5) 构建最终榜单数组并按时长降序排序
      const leaderboard = Object.entries(userTotals)
        .map(([userId, duration]) => {
            const lastTaskId = userLastLog[userId]?.task_id;
            return {
              user_id: userId,
              total_duration: duration,
              username: usernameMap[userId] || null,
              last_task_title: lastTaskId ? taskTitleMap[lastTaskId] : null
            };
        })
        .sort((a, b) => b.total_duration - a.total_duration);

      setData(leaderboard);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setErrorMsg(err.message || '获取榜单失败，请检查网络或数据库配置');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 当切换标签（今日 / 总计）时，重新拉取榜单
    fetchLeaderboard(activeTab);
  }, [activeTab]);

  const formatDuration = (seconds: number) => {
    // 将秒数转换为易读字符串，例如 "1h 30m"
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">🏆 专注榜</ThemedText>
        <TouchableOpacity onPress={() => fetchLeaderboard(activeTab)} style={[styles.refreshButton, { backgroundColor: Colors[theme].tint }]}>
          <ThemedText style={styles.refreshText}>刷新</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'today' && { backgroundColor: Colors[theme].tint }
          ]}
          onPress={() => setActiveTab('today')}
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
          onPress={() => setActiveTab('total')}
        >
          <ThemedText style={[
            styles.tabText, 
            activeTab === 'total' && { color: 'white' }
          ]}>总榜单</ThemedText>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors[theme].tint} />
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <ThemedText style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>{errorMsg}</ThemedText>
          <TouchableOpacity onPress={() => fetchLeaderboard(activeTab)} style={[styles.refreshButton, { backgroundColor: Colors[theme].tint }]}>
            <ThemedText style={styles.refreshText}>重试</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={
            <ThemedText style={{ textAlign: 'center', marginTop: 50, opacity: 0.5 }}>
              {activeTab === 'today' ? '今天还没有人开始专注哦，快去抢占第一名！' : '还没有专注记录，快去开始专注吧！'}
            </ThemedText>
          }
          renderItem={({ item, index }) => (
            <ThemedView style={[styles.card, { borderColor: Colors[theme].icon }]}>
              <View style={styles.rankBadge}>
                <ThemedText style={styles.rankText}>#{index + 1}</ThemedText>
              </View>
              
              <View style={styles.userInfo}>
                <ThemedText type="subtitle">{item.username || `用户 ${item.user_id.slice(0, 4)}...`}</ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>专注时长: {formatDuration(item.total_duration)}</ThemedText>
                {item.last_task_title && (
                  <ThemedText style={{ fontSize: 12, opacity: 0.5, marginTop: 2 }}>
                    最近专注: {item.last_task_title}
                  </ThemedText>
                )}
              </View>
            </ThemedView>
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
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
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
    gap: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    gap: 15,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
});
