import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';

export interface LeaderboardEntry {
  user_id: string;
  total_duration: number;
  rank?: number;
  username?: string | null;
  last_task_title?: string | null;
}

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'total'>('today');

  const fetchLeaderboard = useCallback(async (range: 'today' | 'total') => {
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      // 1) 基本查询
      let query = supabase
        .from('study_logs')
        .select('user_id, duration, created_at, task_id');

      if (range === 'today') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte('created_at', startOfDay.toISOString());
      }

      const { data: logs, error } = await query;
      if (error) throw error;
      if (!logs || logs.length === 0) {
        setData([]);
        return;
      }

      // 2) 前端聚合
      const userTotals: Record<string, number> = {};
      const userLastLog: Record<string, { created_at: string, task_id: number | null }> = {};

      logs.forEach(log => {
        userTotals[log.user_id] = (userTotals[log.user_id] || 0) + log.duration;
        if (!userLastLog[log.user_id] || new Date(log.created_at) > new Date(userLastLog[log.user_id].created_at)) {
            userLastLog[log.user_id] = { created_at: log.created_at, task_id: log.task_id };
        }
      });

      // 3) 批量查询关联信息
      const userIds = Object.keys(userTotals);
      const taskIds = Object.values(userLastLog)
        .map(l => l.task_id)
        .filter(id => id !== null) as number[];
      
      const [profilesResult, tasksResult] = await Promise.all([
        supabase.from('user_profiles').select('id, username').in('id', userIds),
        taskIds.length > 0 ? supabase.from('tasks').select('id, title').in('id', taskIds) : { data: [], error: null }
      ]);

      const usernameMap: Record<string, string | null> = {};
      profilesResult.data?.forEach(profile => { usernameMap[profile.id] = profile.username; });
      
      const taskTitleMap: Record<number, string> = {};
      tasksResult.data?.forEach(task => { taskTitleMap[task.id] = task.title; });

      // 4) 组合结果
      const leaderboard = Object.entries(userTotals)
        .map(([userId, duration]) => ({
          user_id: userId,
          total_duration: duration,
          username: usernameMap[userId] || null,
          last_task_title: userLastLog[userId]?.task_id ? taskTitleMap[userLastLog[userId]!.task_id!] : null
        }))
        .sort((a, b) => b.total_duration - a.total_duration);

      setData(leaderboard);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setErrorMsg(err.message || '获取榜单失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab, fetchLeaderboard]);

  const refresh = () => fetchLeaderboard(activeTab);

  return {
    data, isLoading, errorMsg, activeTab, setActiveTab, refresh
  };
}
