import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Polyline, Line, Text as SvgText } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/components/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DeepSeekRequestError, sendToDeepSeek } from '@/utils/deepseek';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { ModernTimePicker } from '@/modules/schedule/components/ModernPicker';
import { Course, Task } from '@/types/app';

const SYMPTOM_OPTIONS = ['头晕', '发困', '注意力涣散', '心悸', '焦虑', '疲惫', '肌肉酸痛', '状态极佳', '难以平静'];
const SCORE_OPTIONS = [0, 2, 4, 6, 8, 10];
const HEALTH_RECORD_PREFIX = 'health_record_';
const HEALTH_STATUS_HISTORY_KEY = 'health_status_history';

interface ScheduleChecklistItem {
  id: string;
  sourceType: 'course' | 'task';
  title: string;
  timeLabel: string;
  startTime?: string;
  endTime?: string;
  estimatedMinutes?: number;
}

interface DailyScheduleEntry {
  sourceType: 'course' | 'task';
  title: string;
  timeLabel: string;
  estimatedMinutes?: number;
}

interface CourseSelfRating {
  courseTitle: string;
  timeLabel: string;
  stars: number;
  reason: string;
}

interface DailyHealthRecord {
  date: string;
  capturedAt: string;
  currentTime: string;
  sleep: { sleepTime: string; wakeUpTime: string };
  meals: { breakfast: string; lunch: string; dinner: string };
  symptoms: string[];
  checkedItems?: Record<string, boolean>;
  learningState?: LearningState;
  courseSelfRatings?: CourseSelfRating[];
  advancedMetrics: {
    sleepDurationHours: number;
    wakeRefreshScore: number;
    lastMealIntervalMinutes: number | null;
    subjectiveEnergy: number;
    subjectiveMood: number;
    subjectiveFocus: number;
  };
  schedule: {
    completed: DailyScheduleEntry[];
    pending: DailyScheduleEntry[];
    totalCount: number;
    completedCount: number;
  };
}

interface HealthAIAdvice {
  mental_state_analysis?: string;
  learning_state_analysis?: string;
  self_rating_objective_analysis?: string;
  change_reason_summary?: string;
  overall_score?: number;
  body_health_score?: number;
  stress_score?: number;
  fatigue_score?: number;
  energy_score?: number;
  key_factors?: string[];
  immediate_advice?: string[];
  learning_status?: Partial<LearningState>;
  learning_score_reasoning?: string[];
  error?: string;
}

interface DailyStatusSnapshot {
  date: string;
  capturedAt: string;
  overallScore: number;
  learningOverallScore: number;
  bodyHealthScore: number;
  stressScore: number;
  fatigueScore: number;
  energyScore: number;
  analysis: string;
}

interface LearningState {
  overall: number;
  courseStudy: number;
  acmStudy: number;
  projectStudy: number;
  englishStudy: number;
  researchStudy: number;
}

type TimeFieldKey = 'sleepTime' | 'wakeUpTime' | 'breakfast' | 'lunch' | 'dinner';

const DEFAULT_LEARNING_STATE: LearningState = {
  overall: 0,
  courseStudy: 0,
  acmStudy: 0,
  projectStudy: 0,
  englishStudy: 0,
  researchStudy: 0,
};

const ACM_KEYWORDS = ['acm', '算法', 'codeforces', 'cf', 'leetcode', 'luogu', '牛客', 'atcoder', '刷题'];
const PROJECT_KEYWORDS = ['项目', 'project', '工程', '开发', '前端', '后端', '部署', '重构', 'app'];
const ENGLISH_KEYWORDS = ['英语', '单词', '背词', '听力', '阅读', '口语', '写作', 'cet', 'ielts', 'toefl'];
const RESEARCH_KEYWORDS = ['科研', '研究', '论文', '实验', 'lab', '课题'];
const ACM_HIGH_INTENSITY_KEYWORDS = ['ec-final', 'ec final', 'ecf', 'final round', 'world finals', 'icpc', 'regional'];
const ACM_VP_KEYWORDS = ['vp', 'virtual participation', 'virtual contest'];
const ACM_MEDIUM_INTENSITY_KEYWORDS = ['div1', 'div.1', 'div2', 'div.2', 'edu', 'contest'];

const includesAnyKeyword = (text: string, keywords: string[]) => {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
};

const getAcmPointsFromItem = (title: string, estimatedMinutes?: number) => {
  let points = 16;
  const normalizedTitle = title.toLowerCase();

  if (includesAnyKeyword(normalizedTitle, ACM_HIGH_INTENSITY_KEYWORDS)) {
    points += 24;
  }
  if (includesAnyKeyword(normalizedTitle, ACM_VP_KEYWORDS)) {
    points += 18;
  }
  if (includesAnyKeyword(normalizedTitle, ACM_MEDIUM_INTENSITY_KEYWORDS)) {
    points += 10;
  }

  const durationBonus = estimatedMinutes && estimatedMinutes > 0
    ? Math.min(18, Math.floor(estimatedMinutes / 30) * 3)
    : 0;

  return points + durationBonus;
};

const computeLearningOverall = (
  categories: Omit<LearningState, 'overall'>,
  completionRatio = 0
) => {
  const values = [
    clampScore(categories.courseStudy),
    clampScore(categories.acmStudy),
    clampScore(categories.projectStudy),
    clampScore(categories.englishStudy),
    clampScore(categories.researchStudy),
  ];

  const sorted = [...values].sort((a, b) => b - a);
  const nonZero = sorted.filter((value) => value > 0);
  const topCount = Math.min(3, Math.max(1, nonZero.length));
  const topAvg = topCount > 0 ? sorted.slice(0, topCount).reduce((sum, value) => sum + value, 0) / topCount : 0;
  const fullAvg = values.reduce((sum, value) => sum + value, 0) / values.length;

  const activeCount = values.filter((value) => value >= 20).length;
  const diversityBonus = Math.min(8, activeCount * 2);
  const completionBonus = Math.max(0, Math.min(22, completionRatio * 22));

  return clampScore(Math.round(topAvg * 0.62 + fullAvg * 0.24 + completionBonus + diversityBonus));
};

const buildFallbackLearningState = (
  completed: DailyScheduleEntry[],
  totalCount: number
): LearningState => {
  let courseStudy = 0;
  let acmStudy = 0;
  let projectStudy = 0;
  let englishStudy = 0;
  let researchStudy = 0;

  for (const item of completed) {
    const title = item.title || '';
    if (item.sourceType === 'course') {
      courseStudy += 14;
      continue;
    }
    if (includesAnyKeyword(title, ACM_KEYWORDS)) {
      acmStudy += getAcmPointsFromItem(title, item.estimatedMinutes);
      continue;
    }
    if (includesAnyKeyword(title, PROJECT_KEYWORDS)) {
      projectStudy += 16;
      continue;
    }
    if (includesAnyKeyword(title, ENGLISH_KEYWORDS)) {
      englishStudy += 15;
      continue;
    }
    if (includesAnyKeyword(title, RESEARCH_KEYWORDS)) {
      researchStudy += 17;
      continue;
    }
    courseStudy += 8;
  }

  const normalizedCategories = {
    courseStudy: clampScore(courseStudy),
    acmStudy: clampScore(acmStudy),
    projectStudy: clampScore(projectStudy),
    englishStudy: clampScore(englishStudy),
    researchStudy: clampScore(researchStudy),
  };
  const completionRatio = totalCount > 0 ? completed.length / totalCount : 0;
  const overall = computeLearningOverall(normalizedCategories, completionRatio);

  return {
    overall,
    ...normalizedCategories,
  };
};

const normalizeLearningState = (
  advice: Partial<LearningState> | undefined,
  fallback: LearningState,
  completionRatio = 0
): LearningState => {
  if (!advice) {
    return fallback;
  }
  const categories = {
    courseStudy: clampScore(advice.courseStudy ?? fallback.courseStudy),
    acmStudy: clampScore(advice.acmStudy ?? fallback.acmStudy),
    projectStudy: clampScore(advice.projectStudy ?? fallback.projectStudy),
    englishStudy: clampScore(advice.englishStudy ?? fallback.englishStudy),
    researchStudy: clampScore(advice.researchStudy ?? fallback.researchStudy),
  };
  const computedOverall = computeLearningOverall(categories, completionRatio);
  const modelOverall = clampScore(advice.overall ?? computedOverall);

  return {
    overall: clampScore(Math.round(computedOverall * 0.75 + modelOverall * 0.25)),
    ...categories,
  };
};

const getLearningColor = (score: number) => {
  if (score <= 35) {
    return '#7b8794';
  }
  if (score <= 70) {
    return '#3d7ea6';
  }
  return '#2f8f68';
};

const parseTimeString = (value: string) => {
  const matched = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) {
    return { hour: 8, minute: 0 };
  }
  const hour = Math.min(23, Math.max(0, Number(matched[1])));
  const minute = Math.min(59, Math.max(0, Number(matched[2])));
  return { hour, minute: Math.floor(minute / 5) * 5 };
};

const formatTime = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const toTimeDate = (value: string, baseDate = new Date()) => {
  const matched = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) {
    return null;
  }
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const calcSleepDurationHours = (sleepValue: string, wakeValue: string) => {
  const now = new Date();
  const sleepDate = toTimeDate(sleepValue, now);
  const wakeDate = toTimeDate(wakeValue, now);
  if (!sleepDate || !wakeDate) {
    return 0;
  }
  if (wakeDate <= sleepDate) {
    wakeDate.setDate(wakeDate.getDate() + 1);
  }
  const diff = wakeDate.getTime() - sleepDate.getTime();
  return Math.max(0, Math.round((diff / 3600000) * 10) / 10);
};

const calcLastMealIntervalMinutes = (meals: string[], now = new Date()) => {
  const mealTimes = meals
    .map((meal) => toTimeDate(meal, now))
    .filter((value): value is Date => Boolean(value))
    .map((date) => date.getTime())
    .sort((a, b) => a - b);

  if (mealTimes.length === 0) {
    return null;
  }

  const nowMs = now.getTime();
  const candidates = mealTimes.filter((time) => time <= nowMs);
  const latest = candidates.length > 0 ? candidates[candidates.length - 1] : mealTimes[mealTimes.length - 1] - 24 * 3600000;
  return Math.max(0, Math.round((nowMs - latest) / 60000));
};

const clampScore = (value: unknown) => {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
};

const computeSurvivalOverall = (params: {
  bodyHealthScore: number;
  energyScore: number;
  stressScore: number;
  fatigueScore: number;
  modelOverallScore?: number;
}) => {
  const body = clampScore(params.bodyHealthScore);
  const energy = clampScore(params.energyScore);
  const stressRecovery = 100 - clampScore(params.stressScore);
  const fatigueRecovery = 100 - clampScore(params.fatigueScore);

  const derived = clampScore(
    Math.round(body * 0.42 + energy * 0.33 + stressRecovery * 0.125 + fatigueRecovery * 0.125)
  );
  const model = clampScore(params.modelOverallScore ?? derived);

  return clampScore(Math.round(derived * 0.8 + model * 0.2));
};

const buildCompactChangeReason = (advice: HealthAIAdvice) => {
  const survivalReason = (advice.key_factors || [])
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, 2)
    .join('，');

  const learningReason = (advice.learning_score_reasoning || [])
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, 1)
    .join('');

  const survivalPart = survivalReason ? `生存：${survivalReason}` : '生存：睡眠/饮食与主观状态综合变化。';
  const learningPart = learningReason ? `学习：${learningReason}` : '学习：按已完成任务与课程自评进行更新。';
  return `${survivalPart} ${learningPart}`;
};

const getStatusColor = (bodyScore: number) => {
  if (bodyScore <= 30) {
    return '#c93535';
  }
  if (bodyScore <= 60) {
    return '#c8a52a';
  }
  return '#2f8f68';
};

const buildEcgPoints = (phase: number, tensionFactor: number, dangerFactor: number) => {
  const width = 280;
  const height = 70;
  const baseline = height * 0.55;
  const points: Array<{ x: number; y: number }> = [];
  const waveAmplitude = 2 + tensionFactor * 2 + dangerFactor * 5;

  for (let x = 0; x <= width; x += 5) {
    const shifted = x + phase;
    const cycle = shifted % 110;
    const jitter = Math.sin(shifted / 4.2) * dangerFactor * 1.4;
    let y = baseline + Math.sin(shifted / 16) * waveAmplitude + jitter;

    if (cycle >= 18 && cycle <= 22) {
      y -= 18 + dangerFactor * 10;
    } else if (cycle > 22 && cycle <= 26) {
      y += 8 + dangerFactor * 4;
    } else if (cycle > 26 && cycle <= 30) {
      y -= 6 + dangerFactor * 4;
    } else if (dangerFactor > 0.4 && cycle > 74 && cycle <= 82) {
      y += 4 + dangerFactor * 6;
    }

    points.push({ x, y: Math.max(5, Math.min(height - 5, y)) });
  }

  return points;
};

const toPolylinePoints = (points: Array<{ x: number; y: number }>) => points.map((p) => `${p.x},${p.y.toFixed(1)}`).join(' ');

const buildTrailPoints = (points: Array<{ x: number; y: number }>, scanHeadX: number, trail = 85) => {
  return points.filter((point) => {
    const delta = scanHeadX - point.x;
    return delta >= 0 && delta <= trail;
  });
};

const parseAIContentToJson = (content: string): HealthAIAdvice => {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as HealthAIAdvice;
  } catch {
    const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/```\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim()) as HealthAIAdvice;
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as HealthAIAdvice;
    }
    throw new Error('模型返回格式不是有效 JSON');
  }
};

const buildHealthError = (error: unknown) => {
  if (error instanceof DeepSeekRequestError) {
    if (error.code === 'missing_api_key') {
      return '未检测到 DeepSeek Key。请先在 Supabase 表 app_secrets 中配置 DEEPSEEK_API_KEY。';
    }
    if (error.status === 401) {
      return 'DeepSeek 鉴权失败（401）。请检查 API Key 是否正确。';
    }
    if (error.status === 429) {
      return 'DeepSeek 请求过于频繁（429）。请稍等 10-30 秒后重试。';
    }
    if (error.code === 'timeout' || error.status === 408) {
      return '请求超时，请检查网络后重试。';
    }
    return `分析失败：${error.message}`;
  }
  if (error instanceof Error) {
    return `分析失败：${error.message}`;
  }
  return '分析失败，请检查网络并重试。';
};

const getDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toTodayCourses = (courses: Course[], now: Date) => {
  const dayOfWeek = now.getDay() || 7;
  const normalizedToday = dayOfWeek === 0 ? 7 : dayOfWeek;
  return courses.filter((course) => {
    const raw = Number((course as any).day_of_week);
    if (!Number.isFinite(raw)) {
      return false;
    }
    const normalizedCourse = raw === 0 ? 7 : raw;
    return normalizedCourse === normalizedToday;
  });
};

const toTodayTasks = (tasks: Task[], now: Date) => {
  return tasks.filter((task) => {
    if (!task.start_time) {
      return true;
    }

    const taskDate = new Date(task.start_time);
    return (
      taskDate.getFullYear() === now.getFullYear() &&
      taskDate.getMonth() === now.getMonth() &&
      taskDate.getDate() === now.getDate()
    );
  });
};

const formatCourseTimeLabel = (course: Course) => {
  const start = course.start_time?.slice(0, 5) || '--:--';
  const end = course.end_time?.slice(0, 5) || '--:--';
  return `${start}-${end}`;
};

const formatTaskTimeInfo = (task: Task) => {
  const estimatedMinutes = task.estimated_duration && task.estimated_duration > 0
    ? Math.round(task.estimated_duration / 60)
    : undefined;

  if (task.start_time) {
    const start = new Date(task.start_time);
    if (!Number.isNaN(start.getTime())) {
      const hh = String(start.getHours()).padStart(2, '0');
      const mm = String(start.getMinutes()).padStart(2, '0');
      return {
        timeLabel: `${hh}:${mm}`,
        startTime: start.toISOString(),
        estimatedMinutes,
      };
    }
  }

  if (estimatedMinutes) {
    return {
      timeLabel: `预计${estimatedMinutes}分钟`,
      estimatedMinutes,
    };
  }

  return {
    timeLabel: '时间待定',
  };
};

const isCourseCompletedByNow = (endTime?: string, now = new Date()) => {
  if (!endTime) {
    return false;
  }
  const matched = endTime.match(/^(\d{1,2}):(\d{2})/);
  if (!matched) {
    return false;
  }
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return false;
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = hour * 60 + minute;
  return nowMinutes >= endMinutes;
};

export default function HealthTab() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const [sleepTime, setSleepTime] = useState('01:30');
  const [wakeUpTime, setWakeUpTime] = useState('08:30');
  const [breakfast, setBreakfast] = useState('09:00');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');
  const [wakeRefreshScore, setWakeRefreshScore] = useState(6);
  const [subjectiveEnergy, setSubjectiveEnergy] = useState(6);
  const [subjectiveMood, setSubjectiveMood] = useState(6);
  const [subjectiveFocus, setSubjectiveFocus] = useState(6);

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [learningState, setLearningState] = useState<LearningState>(DEFAULT_LEARNING_STATE);
  const [courseSelfRatings, setCourseSelfRatings] = useState<Record<string, { stars: number; reason: string }>>({});
  const [formVisible, setFormVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<TimeFieldKey>('sleepTime');
  const [tempHour, setTempHour] = useState(8);
  const [tempMinute, setTempMinute] = useState(0);

  const [aiAdvice, setAiAdvice] = useState<HealthAIAdvice | null>(null);
  const [statusHistory, setStatusHistory] = useState<DailyStatusSnapshot[]>([]);
  const [selectedHistoryPointIndex, setSelectedHistoryPointIndex] = useState<number | null>(null);
  const [ecgPhase, setEcgPhase] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRecordLoading, setIsRecordLoading] = useState(false);

  const { session } = useUserStore();
  const tasks = useTaskStore((state) => state.tasks) || [];
  const courses = useTaskStore((state) => state.courses) || [];
  const fetchData = useTaskStore((state) => state.fetchData);

  const [today, setToday] = useState(() => new Date());
  const todayCourses = useMemo(() => toTodayCourses(courses, today), [courses, today]);
  const todayTasks = useMemo(() => toTodayTasks(tasks, today), [tasks, today]);

  useEffect(() => {
    const timer = setInterval(() => {
      setToday((prev) => {
        const now = new Date();
        const changed =
          prev.getFullYear() !== now.getFullYear() ||
          prev.getMonth() !== now.getMonth() ||
          prev.getDate() !== now.getDate();
        return changed ? now : prev;
      });
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const checklistItems: ScheduleChecklistItem[] = useMemo(() => {
    const courseItems = todayCourses.map((course) => ({
      id: `course_${course.id}`,
      sourceType: 'course' as const,
      title: course.name,
      timeLabel: formatCourseTimeLabel(course),
      startTime: course.start_time,
      endTime: course.end_time,
    }));

    const taskItems = todayTasks.map((task) => {
      const taskTime = formatTaskTimeInfo(task);
      return {
        id: `task_${task.id}`,
        sourceType: 'task' as const,
        title: task.title,
        timeLabel: taskTime.timeLabel,
        startTime: taskTime.startTime,
        estimatedMinutes: taskTime.estimatedMinutes,
      };
    });

    return [...courseItems, ...taskItems];
  }, [todayCourses, todayTasks]);

  const autoScheduleProgress = useMemo(() => {
    const now = new Date();
    const taskStatusMap = new Map(todayTasks.map((task) => [String(task.id), task.status]));

    const completed: DailyScheduleEntry[] = [];
    const pending: DailyScheduleEntry[] = [];

    for (const item of checklistItems) {
      let done = false;
      if (item.sourceType === 'task') {
        const taskId = item.id.replace('task_', '');
        done = taskStatusMap.get(taskId) === 'completed';
      } else {
        done = isCourseCompletedByNow(item.endTime, now);
      }

      const entry: DailyScheduleEntry = {
        sourceType: item.sourceType,
        title: item.title,
        timeLabel: item.timeLabel,
        estimatedMinutes: item.estimatedMinutes,
      };

      if (done) {
        completed.push(entry);
      } else {
        pending.push(entry);
      }
    }

    return {
      completed,
      pending,
      totalCount: checklistItems.length,
      completedCount: completed.length,
    };
  }, [checklistItems, todayTasks]);

  const completedCourseItems = useMemo(() => {
    const completedCourseKeys = new Set(
      autoScheduleProgress.completed
        .filter((item) => item.sourceType === 'course')
        .map((item) => `${item.sourceType}_${item.title}_${item.timeLabel}`)
    );

    return checklistItems.filter((item) => completedCourseKeys.has(`${item.sourceType}_${item.title}_${item.timeLabel}`));
  }, [autoScheduleProgress.completed, checklistItems]);

  useFocusEffect(
    useCallback(() => {
      const current = new Date();
      setToday(current);
      fetchData(session?.user?.id || null, current);
    }, [fetchData, session?.user?.id])
  );

  useEffect(() => {
    const loadStatusHistory = async () => {
      try {
        const content = await AsyncStorage.getItem(HEALTH_STATUS_HISTORY_KEY);
        if (!content) {
          return;
        }
        const parsed = JSON.parse(content) as DailyStatusSnapshot[];
        setStatusHistory(parsed);
      } catch (error) {
        console.error('Failed to load status history:', error);
      }
    };

    loadStatusHistory();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEcgPhase((prev) => (prev + 3) % 2800);
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadTodayRecord = async () => {
      setIsRecordLoading(true);
      try {
        const key = `${HEALTH_RECORD_PREFIX}${getDateKey()}`;
        const content = await AsyncStorage.getItem(key);
        if (!content) {
          return;
        }

        const record = JSON.parse(content) as DailyHealthRecord;
        setSleepTime(record.sleep.sleepTime || '');
        setWakeUpTime(record.sleep.wakeUpTime || '');
        setBreakfast(record.meals.breakfast || '');
        setLunch(record.meals.lunch || '');
        setDinner(record.meals.dinner || '');
        setSelectedSymptoms(record.symptoms || []);
        setLearningState(record.learningState || DEFAULT_LEARNING_STATE);
        setCourseSelfRatings(
          (record.courseSelfRatings || []).reduce<Record<string, { stars: number; reason: string }>>((acc, item) => {
            const key = `${item.courseTitle}_${item.timeLabel}`;
            acc[key] = {
              stars: Math.max(0, Math.min(5, Number(item.stars) || 0)),
              reason: item.reason || '',
            };
            return acc;
          }, {})
        );
        if (record.advancedMetrics) {
          setWakeRefreshScore(record.advancedMetrics.wakeRefreshScore || 0);
          setSubjectiveEnergy(record.advancedMetrics.subjectiveEnergy || 0);
          setSubjectiveMood(record.advancedMetrics.subjectiveMood || 0);
          setSubjectiveFocus(record.advancedMetrics.subjectiveFocus || 0);
        }
      } catch (error) {
        console.error('Failed to load today health record:', error);
      } finally {
        setIsRecordLoading(false);
      }
    };

    loadTodayRecord();
  }, []);

  const upsertStatusSnapshot = useCallback(async (snapshot: DailyStatusSnapshot) => {
    setStatusHistory((prev) => {
      const merged = [snapshot, ...prev.filter((item) => item.capturedAt !== snapshot.capturedAt)]
        .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
        .slice(0, 30);

      AsyncStorage.setItem(HEALTH_STATUS_HISTORY_KEY, JSON.stringify(merged)).catch((error) => {
        console.error('Failed to save status history:', error);
      });

      return merged;
    });
  }, []);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms((prev) => {
      if (prev.includes(s)) {
        return prev.filter((x) => x !== s);
      }
      return [...prev, s];
    });
  };

  const openTimePicker = (target: TimeFieldKey, currentValue: string) => {
    const parsed = parseTimeString(currentValue);
    setTempHour(parsed.hour);
    setTempMinute(parsed.minute);
    setPickerTarget(target);
    setPickerVisible(true);
  };

  const applyPickedTime = (hour: number, minute: number) => {
    const value = formatTime(hour, minute);
    if (pickerTarget === 'sleepTime') setSleepTime(value);
    if (pickerTarget === 'wakeUpTime') setWakeUpTime(value);
    if (pickerTarget === 'breakfast') setBreakfast(value);
    if (pickerTarget === 'lunch') setLunch(value);
    if (pickerTarget === 'dinner') setDinner(value);
    setPickerVisible(false);
  };

  const clearMealTime = (target: 'breakfast' | 'lunch' | 'dinner') => {
    if (target === 'breakfast') setBreakfast('');
    if (target === 'lunch') setLunch('');
    if (target === 'dinner') setDinner('');
  };

  const setCourseSelfStar = (courseKey: string, stars: number) => {
    setCourseSelfRatings((prev) => ({
      ...prev,
      [courseKey]: {
        stars,
        reason: prev[courseKey]?.reason || '',
      },
    }));
  };

  const setCourseSelfReason = (courseKey: string, reason: string) => {
    setCourseSelfRatings((prev) => ({
      ...prev,
      [courseKey]: {
        stars: prev[courseKey]?.stars || 0,
        reason,
      },
    }));
  };

  const handleAnalyze = async () => {
    if (!sleepTime.trim() || !wakeUpTime.trim()) {
      setAiAdvice({ error: '请先完整填写昨晚入睡时间和今日起床时间（必填）。' });
      setFormVisible(true);
      return;
    }

    setLoading(true);
    setAiAdvice(null);
    try {
      const currentTime = new Date().toLocaleString('zh-CN', { hour12: false });
      const advancedMetrics = {
        sleepDurationHours: calcSleepDurationHours(sleepTime, wakeUpTime),
        wakeRefreshScore,
        lastMealIntervalMinutes: calcLastMealIntervalMinutes([breakfast, lunch, dinner]),
        subjectiveEnergy,
        subjectiveMood,
        subjectiveFocus,
      };

      const completedList = autoScheduleProgress.completed;
      const pendingList = autoScheduleProgress.pending;
      const completedCourseSelfRatings: CourseSelfRating[] = completedCourseItems.map((course) => {
        const courseKey = `${course.title}_${course.timeLabel}`;
        return {
          courseTitle: course.title,
          timeLabel: course.timeLabel,
          stars: Math.max(0, Math.min(5, courseSelfRatings[courseKey]?.stars || 0)),
          reason: (courseSelfRatings[courseKey]?.reason || '').trim(),
        };
      });

      const missingSelfRating = completedCourseSelfRatings.find((item) => item.stars < 1 || !item.reason);
      if (missingSelfRating) {
        setAiAdvice({ error: `请先完成课程自评：${missingSelfRating.courseTitle}（五星评级+理由必填）。` });
        setFormVisible(true);
        return;
      }

      const todayRecord: DailyHealthRecord = {
        date: getDateKey(),
        capturedAt: new Date().toISOString(),
        currentTime,
        sleep: { sleepTime, wakeUpTime },
        meals: { breakfast, lunch, dinner },
        symptoms: selectedSymptoms,
        learningState,
        courseSelfRatings: completedCourseSelfRatings,
        advancedMetrics,
        schedule: {
          completed: completedList,
          pending: pendingList,
          totalCount: autoScheduleProgress.totalCount,
          completedCount: autoScheduleProgress.completedCount,
        },
      };

      const todayRecordKey = `${HEALTH_RECORD_PREFIX}${todayRecord.date}`;
      await AsyncStorage.setItem(todayRecordKey, JSON.stringify(todayRecord));

      const healthData = {
        todayRecord,
        checklistItems,
        advancedMetrics,
        learningState,
        courseSelfRatings: completedCourseSelfRatings,
      };

      const systemPrompt = `
你是一名“大学生高强度学习场景”的状态评估官（非医疗诊断）。
目标：只做“当前状态评估”，不做任务调度建议。

请基于用户输入的睡眠、三餐、体征症状、当下时间、当日课程任务进度，输出可量化评分和解释。

评估维度（0-100分）：
1) body_health_score：身体状态，受睡眠质量、进食规律、身体不适症状影响；
2) stress_score：精神压力，分数越高表示压力越高；
3) fatigue_score：疲劳度，分数越高表示疲劳越高；
4) energy_score：可用心智能量，分数越高表示更适合高强度专注；
5) overall_score：综合状态分，0-100。

学习成长维度（0-100分）：
- learning_status.overall：今日学习总进度；
- learning_status.courseStudy：课内课程学习；
- learning_status.acmStudy：ACM/算法学习；
- learning_status.projectStudy：工程项目学习；
- learning_status.englishStudy：英语学习；
- learning_status.researchStudy：科研学习。

学习状态只衡量“今日学习成果”，必须仅基于已完成事项与学习难度/质量进行打分，不得用学习分数去影响生存状态分数。

用户课程自评（输入）：
- courseSelfRatings 来自用户对“已完成课程”的五星自评与理由；
- AI 不得替用户生成课程评级分数，而要基于用户自评做客观分析，指出可能偏差和改进点。

强制学习分析要求（必须输出）：
- 必须输出 learning_state_analysis（不少于120字），解释学习加点是否合理；
- 必须输出 learning_score_reasoning（3~6条），每条都要引用已完成事项的证据；
- 必须输出 self_rating_objective_analysis（不少于120字），基于用户课程自评进行客观分析；
- 若完成项包含 ACM 高强度关键词（例如 VP、EC-Final、ICPC、Div1 等），acmStudy 不应给出明显偏低值；
- 若加点与完成项不匹配，需要在 learning_state_analysis 明确说明折损原因（如状态差、完成质量低、时长不足）。

变化摘要要求：
- 必须输出 change_reason_summary，2~3句短说明，同时包含“生存变化原因”和“学习变化原因”。
- 这部分用于图表折点点击展示，禁止长段落。

计算要求：
- 必须使用 advancedMetrics 与 symptoms 中的数据进行推断；
- 睡眠时长、三餐间隔、主观量表与症状都要纳入判断；
- 必须结合 schedule.completed 中的完成项给 learning_status 分配加点；
- 分数必须是整数；
- 解释中要说明分数的主要驱动因素（睡眠时点、餐食间隔、症状、负荷）；
- 给2~4条“状态恢复建议”，但不要包含日程重排、任务优先级等调度内容。

输出约束：
- 仅输出一个 JSON 对象，不要 Markdown，不要额外文本；
- 仅包含以下字段：
{
  "mental_state_analysis": "不少于120字，解释当前状态及风险",
  "learning_state_analysis": "不少于120字，解释学习加点是否匹配完成项",
  "self_rating_objective_analysis": "不少于120字，基于用户课程自评做客观分析",
  "change_reason_summary": "2~3句，简述生存与学习变化原因",
  "overall_score": 0,
  "body_health_score": 0,
  "stress_score": 0,
  "fatigue_score": 0,
  "energy_score": 0,
  "learning_status": {
    "overall": 0,
    "courseStudy": 0,
    "acmStudy": 0,
    "projectStudy": 0,
    "englishStudy": 0,
    "researchStudy": 0
  },
  "learning_score_reasoning": ["依据1", "依据2"],
  "key_factors": ["影响状态的关键因素1", "因素2"],
  "immediate_advice": ["2~4条状态恢复建议（非调度）"]
}

若出现明显健康风险，需在分析中提示尽快线下就医。
`;

      const result = await sendToDeepSeek([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(healthData, null, 2) }
      ]);

      const parsed = parseAIContentToJson(result.content);
      const fallbackLearningState = buildFallbackLearningState(completedList, autoScheduleProgress.totalCount);
      const completionRatio = autoScheduleProgress.totalCount > 0 ? completedList.length / autoScheduleProgress.totalCount : 0;
      const normalizedLearningState = normalizeLearningState(parsed.learning_status, fallbackLearningState, completionRatio);
      const normalizedBodyScore = clampScore(parsed.body_health_score);
      const normalizedStressScore = clampScore(parsed.stress_score);
      const normalizedFatigueScore = clampScore(parsed.fatigue_score);
      const normalizedEnergyScore = clampScore(parsed.energy_score);
      const normalizedOverallScore = computeSurvivalOverall({
        bodyHealthScore: normalizedBodyScore,
        energyScore: normalizedEnergyScore,
        stressScore: normalizedStressScore,
        fatigueScore: normalizedFatigueScore,
        modelOverallScore: parsed.overall_score,
      });

      const normalized: HealthAIAdvice = {
        ...parsed,
        learning_state_analysis: parsed.learning_state_analysis || '学习维度已根据已完成课程/任务自动加点，建议结合完成质量与时长进一步校准。',
        self_rating_objective_analysis: parsed.self_rating_objective_analysis || '你的课程自评已纳入分析，建议结合课堂投入度与掌握度持续校准自我评价。',
        change_reason_summary: typeof parsed.change_reason_summary === 'string' ? parsed.change_reason_summary.trim() : '',
        overall_score: normalizedOverallScore,
        body_health_score: normalizedBodyScore,
        stress_score: normalizedStressScore,
        fatigue_score: normalizedFatigueScore,
        energy_score: normalizedEnergyScore,
        learning_status: normalizedLearningState,
        learning_score_reasoning: Array.isArray(parsed.learning_score_reasoning) ? parsed.learning_score_reasoning.slice(0, 6) : [],
        key_factors: Array.isArray(parsed.key_factors) ? parsed.key_factors.slice(0, 5) : [],
        immediate_advice: Array.isArray(parsed.immediate_advice) ? parsed.immediate_advice.slice(0, 4) : [],
      };

      setAiAdvice(normalized);
      setLearningState(normalizedLearningState);

      const updatedTodayRecord: DailyHealthRecord = {
        ...todayRecord,
        learningState: normalizedLearningState,
      };
      await AsyncStorage.setItem(todayRecordKey, JSON.stringify(updatedTodayRecord));

      const snapshot: DailyStatusSnapshot = {
        date: getDateKey(),
        capturedAt: new Date().toISOString(),
        overallScore: normalized.overall_score || 0,
        learningOverallScore: normalizedLearningState.overall || 0,
        bodyHealthScore: normalized.body_health_score || 0,
        stressScore: normalized.stress_score || 0,
        fatigueScore: normalized.fatigue_score || 0,
        energyScore: normalized.energy_score || 0,
        analysis: normalized.change_reason_summary || buildCompactChangeReason(normalized),
      };
      await upsertStatusSnapshot(snapshot);
    } catch (e) {
      console.error(e);
      setAiAdvice({ error: buildHealthError(e) });
    } finally {
      setLoading(false);
    }
  };

  const currentBodyScore = aiAdvice?.body_health_score ?? statusHistory[0]?.bodyHealthScore ?? 0;
  const panelOverallScore = aiAdvice?.overall_score ?? statusHistory[0]?.overallScore ?? 0;
  const panelBodyScore = currentBodyScore;
  const panelEnergyScore = aiAdvice?.energy_score ?? statusHistory[0]?.energyScore ?? 0;
  const panelStressScore = aiAdvice?.stress_score ?? statusHistory[0]?.stressScore ?? 0;
  const panelFatigueScore = aiAdvice?.fatigue_score ?? statusHistory[0]?.fatigueScore ?? 0;
  const panelCompletionRatio = autoScheduleProgress.totalCount > 0 ? autoScheduleProgress.completedCount / autoScheduleProgress.totalCount : 0;
  const panelLearningState = aiAdvice?.learning_status
    ? normalizeLearningState(aiAdvice.learning_status, learningState, panelCompletionRatio)
    : learningState;
  const learningRingColor = getLearningColor(panelLearningState.overall);
  const ecgColor = getStatusColor(panelBodyScore);
  const ecgDangerFactor = Math.max(0, Math.min(1, (100 - panelBodyScore) / 100));
  const ecgPoints = useMemo(
    () => buildEcgPoints(ecgPhase, (panelFatigueScore + panelStressScore) / 200, ecgDangerFactor),
    [ecgPhase, panelFatigueScore, panelStressScore, ecgDangerFactor]
  );
  const ecgScanHeadX = ecgPhase % 280;
  const ecgTrailPoints = useMemo(() => buildTrailPoints(ecgPoints, ecgScanHeadX, 95), [ecgPoints, ecgScanHeadX]);

  const historyChart = useMemo(() => {
    const points = [...statusHistory].slice(0, 10).reverse();
    if (points.length === 0) {
      return null;
    }

    const width = 330;
    const height = 190;
    const padding = { left: 34, right: 14, top: 14, bottom: 30 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const count = points.length;

    const mapX = (index: number) => padding.left + (count <= 1 ? 0 : (index / (count - 1)) * plotWidth);
    const mapY = (value: number) => padding.top + (1 - Math.max(0, Math.min(100, value)) / 100) * plotHeight;

    const survival = points.map((item, index) => ({ x: mapX(index), y: mapY(item.overallScore), value: item.overallScore }));
    const learning = points.map((item, index) => ({ x: mapX(index), y: mapY(item.learningOverallScore ?? 0), value: item.learningOverallScore ?? 0 }));

    return {
      width,
      height,
      padding,
      plotWidth,
      plotHeight,
      points,
      survival,
      learning,
      survivalPolyline: survival.map((p) => `${p.x},${p.y}`).join(' '),
      learningPolyline: learning.map((p) => `${p.x},${p.y}`).join(' '),
    };
  }, [statusHistory]);

  useEffect(() => {
    if (!historyChart) {
      if (selectedHistoryPointIndex !== null) {
        setSelectedHistoryPointIndex(null);
      }
      return;
    }
    if (selectedHistoryPointIndex === null || selectedHistoryPointIndex >= historyChart.points.length) {
      setSelectedHistoryPointIndex(historyChart.points.length - 1);
    }
  }, [historyChart, selectedHistoryPointIndex]);

  const renderTimeRow = (label: string, value: string, field: TimeFieldKey, required = false) => (
    <View style={styles.inputRow}>
      <ThemedText style={styles.inputLabel}>{label}{required ? ' *' : ''}</ThemedText>
      <TouchableOpacity
        style={[styles.timePickerButton, { borderColor: isDark ? '#333' : '#ccc' }]}
        onPress={() => openTimePicker(field, value)}
      >
        <ThemedText style={styles.timePickerText}>{value || '选择时间'}</ThemedText>
      </TouchableOpacity>
      {(field === 'breakfast' || field === 'lunch' || field === 'dinner') && !!value && (
        <TouchableOpacity onPress={() => clearMealTime(field)} style={styles.clearButton}>
          <ThemedText style={styles.clearButtonText}>清空</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMetricBar = (label: string, value: number, fillColor: string) => (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <ThemedText style={styles.metricLabel}>{label}</ThemedText>
        <ThemedText style={styles.metricValue}>{value}</ThemedText>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );

  const renderScoreSelector = (
    label: string,
    value: number,
    onChange: (score: number) => void,
    helper?: string
  ) => (
    <View style={styles.formBlock}>
      <ThemedText style={styles.formLabel}>{label}</ThemedText>
      {helper ? <ThemedText style={styles.formHelper}>{helper}</ThemedText> : null}
      <View style={styles.optionRowWrap}>
        {SCORE_OPTIONS.map((score) => {
          const active = value === score;
          return (
            <TouchableOpacity
              key={`${label}_${score}`}
              style={[styles.optionChip, active && { borderColor: Colors[colorScheme].tint, backgroundColor: `${Colors[colorScheme].tint}22` }]}
              onPress={() => onChange(score)}
            >
              <ThemedText style={[styles.optionChipText, active && { color: Colors[colorScheme].tint }]}>{score}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const sectionSurfaceStyle = {
    borderColor: isDark ? '#2E3440' : '#E5E7EB',
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <ThemedText type="title" style={styles.pageTitle}>身心状态</ThemedText>
              <ThemedText style={styles.subtitle}>智能体基于昼夜节律与认知负荷理论</ThemedText>
            </View>
            <TouchableOpacity style={[styles.formToggleBtn, { borderColor: Colors[colorScheme].tint }]} onPress={() => setFormVisible(true)}>
              <IconSymbol name="plus" size={18} color={Colors[colorScheme].tint} />
              <ThemedText style={[styles.formToggleText, { color: Colors[colorScheme].tint }]}>填写</ThemedText>
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.dateHint}>今日数据日期：{getDateKey()}</ThemedText>
          {isRecordLoading ? <ThemedText style={styles.loadingHint}>正在读取今日已保存记录…</ThemedText> : null}
        </View>

        <ThemedView style={styles.statusPanelCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>生存状态面板</ThemedText>

          <View style={styles.statusTopRow}>
            <View style={styles.ringWrap}>
              <Svg width={120} height={120}>
                <Circle cx={60} cy={60} r={46} stroke={Colors[colorScheme].text} strokeOpacity={0.15} strokeWidth={10} fill="none" />
                <Circle
                  cx={60}
                  cy={60}
                  stroke={ecgColor}
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={(2 * Math.PI * 46) * (1 - panelOverallScore / 100)}
                  transform="rotate(-90 60 60)"
                />
              </Svg>
              <View style={styles.ringCenterText}>
                <ThemedText style={styles.ringScore}>{panelOverallScore}</ThemedText>
                <ThemedText style={styles.ringLabel}>总体分</ThemedText>
              </View>
            </View>

            <View style={styles.metricGroup}>
              {renderMetricBar('生命值 HP（身体）', panelBodyScore, ecgColor)}
              {renderMetricBar('蓝量 MP（心智）', panelEnergyScore, '#4c78b3')}
              {renderMetricBar('压力值', panelStressScore, '#b8942e')}
              {renderMetricBar('疲劳值', panelFatigueScore, '#b45757')}
            </View>
          </View>

          <View style={styles.ecgCard}>
            <Svg width={280} height={70}>
              <Line x1={ecgScanHeadX} y1={4} x2={ecgScanHeadX} y2={66} stroke={ecgColor} strokeOpacity={0.22} strokeWidth={1.6} />
              <Polyline
                points={toPolylinePoints(ecgPoints)}
                fill="none"
                stroke={ecgColor}
                strokeOpacity={0.26}
                strokeWidth={1.2}
              />
              <Polyline
                points={toPolylinePoints(ecgTrailPoints)}
                fill="none"
                stroke={ecgColor}
                strokeWidth={2.8}
              />
            </Svg>
            <ThemedText style={[styles.ecgWarnText, { color: ecgColor }]}>
              {panelBodyScore <= 30 ? '危险：建议立即恢复' : panelBodyScore <= 60 ? '疲劳：请降低负荷并补给' : '良好：可稳定推进'}
            </ThemedText>
          </View>
        </ThemedView>

        <ThemedView style={styles.statusPanelCard}>
          <ThemedText type="subtitle" style={styles.cardTitle}>学习状态面板</ThemedText>

          <View style={styles.statusTopRow}>
            <View style={styles.ringWrap}>
              <Svg width={120} height={120}>
                <Circle cx={60} cy={60} r={46} stroke={Colors[colorScheme].text} strokeOpacity={0.15} strokeWidth={10} fill="none" />
                <Circle
                  cx={60}
                  cy={60}
                  r={46}
                  stroke={learningRingColor}
                  strokeWidth={10}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={(2 * Math.PI * 46) * (1 - panelLearningState.overall / 100)}
                  transform="rotate(-90 60 60)"
                />
              </Svg>
              <View style={styles.ringCenterText}>
                <ThemedText style={styles.ringScore}>{panelLearningState.overall}</ThemedText>
                <ThemedText style={styles.ringLabel}>学习总评</ThemedText>
              </View>
            </View>

            <View style={styles.metricGroup}>
              {renderMetricBar('课内课程', panelLearningState.courseStudy, '#5a8fd8')}
              {renderMetricBar('ACM 算法', panelLearningState.acmStudy, '#4f8f7d')}
              {renderMetricBar('工程项目', panelLearningState.projectStudy, '#8b78c9')}
              {renderMetricBar('英语学习', panelLearningState.englishStudy, '#b27a4d')}
              {renderMetricBar('科研学习', panelLearningState.researchStudy, '#b45757')}
            </View>
          </View>

          <ThemedText style={[styles.learningHintText, { color: learningRingColor }]}>
            学习状态仅用于衡量今日学习成果，基于已完成课程/任务与学习强度评估，不影响生存状态分数。
          </ThemedText>
        </ThemedView>

        <TouchableOpacity 
          style={[styles.analyzeButton, { backgroundColor: Colors[colorScheme].tint }]} 
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.analyzeButtonText}>进行状态评估（更新生命体征）</ThemedText>
          )}
        </TouchableOpacity>

        {aiAdvice && !aiAdvice.error && (
          <ThemedView style={styles.card}>
            <View style={styles.adviceSection}>
               <ThemedText style={styles.adviceSubtitle}>状态分析</ThemedText>
               <ThemedText style={styles.adviceText}>{aiAdvice.mental_state_analysis}</ThemedText>
            </View>

            {!!aiAdvice.key_factors?.length && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>关键影响因素</ThemedText>
                {aiAdvice.key_factors.map((factor: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <ThemedText style={styles.bullet}>•</ThemedText>
                    <ThemedText style={[styles.adviceText, { flex: 1 }]}>{factor}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {!!aiAdvice.learning_state_analysis && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>学习状态分析</ThemedText>
                <ThemedText style={styles.adviceText}>{aiAdvice.learning_state_analysis}</ThemedText>
              </View>
            )}

            {!!aiAdvice.learning_score_reasoning?.length && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>学习加点依据</ThemedText>
                {aiAdvice.learning_score_reasoning.map((reason: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <ThemedText style={styles.bullet}>•</ThemedText>
                    <ThemedText style={[styles.adviceText, { flex: 1 }]}>{reason}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            {!!aiAdvice.self_rating_objective_analysis && (
              <View style={styles.adviceSection}>
                <ThemedText style={styles.adviceSubtitle}>自评客观分析</ThemedText>
                <ThemedText style={styles.adviceText}>{aiAdvice.self_rating_objective_analysis}</ThemedText>
              </View>
            )}

            <View style={styles.adviceSection}>
               <ThemedText style={styles.adviceSubtitle}>状态恢复建议</ThemedText>
               {aiAdvice.immediate_advice?.map((a: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <ThemedText style={styles.bullet}>•</ThemedText>
                    <ThemedText style={[styles.adviceText, { flex: 1 }]}>{a}</ThemedText>
                  </View>
               ))}
            </View>
          </ThemedView>
        )}

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>每日状态记录（本地）</ThemedText>
          {statusHistory.length === 0 || !historyChart ? (
            <ThemedText style={styles.emptyText}>尚无状态评估记录</ThemedText>
          ) : (
            <View style={styles.historyChartWrap}>
              <View style={styles.historyLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                  <ThemedText style={styles.legendText}>生存总评</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <ThemedText style={styles.legendText}>学习总评</ThemedText>
                </View>
              </View>

              <Svg width={historyChart.width} height={historyChart.height}>
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = historyChart.padding.top + (1 - tick / 100) * historyChart.plotHeight;
                  return (
                    <React.Fragment key={`y_${tick}`}>
                      <Line
                        x1={historyChart.padding.left}
                        y1={y}
                        x2={historyChart.width - historyChart.padding.right}
                        y2={y}
                        stroke={isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.2)'}
                        strokeWidth={1}
                      />
                      <SvgText x={10} y={y + 4} fontSize={10} fill={isDark ? '#94a3b8' : '#64748b'}>{tick}</SvgText>
                    </React.Fragment>
                  );
                })}

                {historyChart.points.map((_, index) => {
                  const x = historyChart.padding.left + (historyChart.points.length <= 1 ? 0 : (index / (historyChart.points.length - 1)) * historyChart.plotWidth);
                  return (
                    <Line
                      key={`x_${index}`}
                      x1={x}
                      y1={historyChart.padding.top}
                      x2={x}
                      y2={historyChart.height - historyChart.padding.bottom}
                      stroke={isDark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.12)'}
                      strokeWidth={1}
                    />
                  );
                })}

                <Line
                  x1={historyChart.padding.left}
                  y1={historyChart.height - historyChart.padding.bottom}
                  x2={historyChart.width - historyChart.padding.right}
                  y2={historyChart.height - historyChart.padding.bottom}
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  strokeWidth={1.2}
                />
                <Line
                  x1={historyChart.padding.left}
                  y1={historyChart.padding.top}
                  x2={historyChart.padding.left}
                  y2={historyChart.height - historyChart.padding.bottom}
                  stroke={isDark ? '#94a3b8' : '#64748b'}
                  strokeWidth={1.2}
                />

                <Polyline points={historyChart.survivalPolyline} fill="none" stroke="#3B82F6" strokeWidth={2.5} />
                <Polyline points={historyChart.learningPolyline} fill="none" stroke="#10B981" strokeWidth={2.5} />

                {historyChart.points.map((item, index) => {
                  const selected = selectedHistoryPointIndex === index;
                  return (
                    <React.Fragment key={`point_${item.capturedAt}`}>
                      <Circle
                        cx={historyChart.survival[index].x}
                        cy={historyChart.survival[index].y}
                        r={selected ? 5 : 4}
                        fill="#3B82F6"
                        onPress={() => setSelectedHistoryPointIndex(index)}
                      />
                      <Circle
                        cx={historyChart.learning[index].x}
                        cy={historyChart.learning[index].y}
                        r={selected ? 5 : 4}
                        fill="#10B981"
                        onPress={() => setSelectedHistoryPointIndex(index)}
                      />
                    </React.Fragment>
                  );
                })}

                {historyChart.points.length > 0 && (
                  <>
                    <SvgText
                      x={historyChart.padding.left}
                      y={historyChart.height - 8}
                      fontSize={10}
                      fill={isDark ? '#94a3b8' : '#64748b'}
                    >
                      {new Date(historyChart.points[0].capturedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </SvgText>
                    <SvgText
                      x={historyChart.width - historyChart.padding.right - 34}
                      y={historyChart.height - 8}
                      fontSize={10}
                      fill={isDark ? '#94a3b8' : '#64748b'}
                    >
                      {new Date(historyChart.points[historyChart.points.length - 1].capturedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </SvgText>
                  </>
                )}
              </Svg>

              {selectedHistoryPointIndex !== null && historyChart.points[selectedHistoryPointIndex] && (
                <View style={styles.historyReasonBox}>
                  {(() => {
                    const item = historyChart.points[selectedHistoryPointIndex];
                    const prev = selectedHistoryPointIndex > 0 ? historyChart.points[selectedHistoryPointIndex - 1] : null;
                    const deltaSurvival = prev ? item.overallScore - prev.overallScore : 0;
                    const currentLearning = item.learningOverallScore ?? 0;
                    const prevLearning = prev?.learningOverallScore ?? 0;
                    const deltaLearning = prev ? currentLearning - prevLearning : 0;
                    return (
                      <>
                        <ThemedText style={styles.historyDate}>
                          {item.date} {new Date(item.capturedAt).toLocaleTimeString('zh-CN', { hour12: false })}
                        </ThemedText>
                        <ThemedText style={styles.historyScore}>
                          生存总评 {item.overallScore}（{deltaSurvival >= 0 ? '+' : ''}{deltaSurvival}） / 学习总评 {currentLearning}（{deltaLearning >= 0 ? '+' : ''}{deltaLearning}）
                        </ThemedText>
                        <ThemedText style={styles.historyReasonText}>
                          变化原因：{item.analysis || '暂无分析文本'}
                        </ThemedText>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
          )}
        </ThemedView>

        {aiAdvice?.error && (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{aiAdvice.error}</ThemedText>
            <TouchableOpacity style={[styles.retryButton, { borderColor: Colors[colorScheme].tint }]} onPress={handleAnalyze}>
              <ThemedText style={[styles.retryText, { color: Colors[colorScheme].tint }]}>重试分析</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={formVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <ThemedText type="subtitle">填写状态表单</ThemedText>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <IconSymbol name="xmark.circle.fill" size={22} color={Colors[colorScheme].text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalHandle} />

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>睡眠与恢复（必填）</ThemedText>
                {renderTimeRow('昨晚入睡时间', sleepTime, 'sleepTime', true)}
                {renderTimeRow('今日起床时间', wakeUpTime, 'wakeUpTime', true)}
                {renderScoreSelector('醒后清醒度', wakeRefreshScore, setWakeRefreshScore, '0=极差，10=非常清醒')}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>营养输入</ThemedText>
                {renderTimeRow('早饭时间', breakfast, 'breakfast')}
                {renderTimeRow('午饭时间', lunch, 'lunch')}
                {renderTimeRow('晚饭时间', dinner, 'dinner')}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>主观状态量表（0~10）</ThemedText>
                {renderScoreSelector('主观精力', subjectiveEnergy, setSubjectiveEnergy)}
                {renderScoreSelector('主观情绪稳定', subjectiveMood, setSubjectiveMood)}
                {renderScoreSelector('主观专注度', subjectiveFocus, setSubjectiveFocus)}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>今日日程进度（自动识别）</ThemedText>
                {checklistItems.length === 0 ? (
                  <ThemedText style={styles.emptyText}>今日暂无安排的课程与任务</ThemedText>
                ) : (
                  <View style={styles.checkboxGroup}>
                    <ThemedText style={styles.formHelper}>已完成任务来自日程里的任务完成状态；课程在到达下课时间后自动记为已完成。</ThemedText>
                    {checklistItems.map((item) => {
                      const checked = autoScheduleProgress.completed.some((entry) => entry.title === item.title && entry.timeLabel === item.timeLabel && entry.sourceType === item.sourceType);
                      return (
                        <View key={item.id} style={styles.checkItem}>
                          <IconSymbol name={checked ? "checkmark.circle.fill" : "circle"} size={22} color={checked ? Colors[colorScheme].tint : Colors[colorScheme].text} />
                          <ThemedText style={[styles.checkText, checked && styles.checkedText]}>
                            [{item.sourceType === 'course' ? '课程' : '任务'}] {item.title} · {item.timeLabel}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>已完成课程自评（五星+理由）</ThemedText>
                {completedCourseItems.length === 0 ? (
                  <ThemedText style={styles.emptyText}>当前暂无已完成课程，课程自评将在下课后可填写。</ThemedText>
                ) : (
                  <View style={styles.courseRatingGroup}>
                    {completedCourseItems.map((course) => {
                      const courseKey = `${course.title}_${course.timeLabel}`;
                      const rating = courseSelfRatings[courseKey] || { stars: 0, reason: '' };
                      return (
                        <View key={course.id} style={styles.courseRatingItem}>
                          <ThemedText style={styles.courseRatingTitle}>{course.title} · {course.timeLabel}</ThemedText>
                          <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((star) => {
                              const active = rating.stars >= star;
                              return (
                                <TouchableOpacity key={`${course.id}_star_${star}`} onPress={() => setCourseSelfStar(courseKey, star)} style={styles.starBtn}>
                                  <ThemedText style={[styles.starText, { color: active ? Colors[colorScheme].tint : (isDark ? '#6B7280' : '#9CA3AF') }]}>★</ThemedText>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <TextInput
                            value={rating.reason}
                            onChangeText={(text) => setCourseSelfReason(courseKey, text)}
                            placeholder="请写下这节课你的表现理由（必填）"
                            placeholderTextColor={isDark ? '#7A7A7A' : '#9A9A9A'}
                            multiline
                            style={[styles.courseReasonInput, { borderColor: isDark ? '#334155' : '#D1D5DB', color: Colors[colorScheme].text }]}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={[styles.formSection, sectionSurfaceStyle]}>
                <ThemedText style={styles.modalSectionTitle}>当前体征</ThemedText>
                <View style={styles.symptomsContainer}>
                  {SYMPTOM_OPTIONS.map(sym => {
                    const selected = selectedSymptoms.includes(sym);
                    return (
                      <TouchableOpacity
                        key={sym}
                        style={[styles.symptomPill, selected && { backgroundColor: Colors[colorScheme].tint, borderColor: Colors[colorScheme].tint }]}
                        onPress={() => toggleSymptom(sym)}
                      >
                        <ThemedText style={[styles.symptomText, selected && { color: '#fff' }]}>{sym}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      <ModernTimePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={applyPickedTime}
        tempHour={tempHour}
        setTempHour={setTempHour}
        tempMinute={tempMinute}
        setTempMinute={setTempMinute}
        theme={colorScheme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { marginBottom: 24, marginTop: 10 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  subtitle: { fontSize: 14, opacity: 0.7, marginTop: 4 },
  dateHint: { fontSize: 12, opacity: 0.7, marginTop: 6 },
  loadingHint: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  formToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formToggleText: { fontSize: 13, fontWeight: '600' },
  card: { padding: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { marginBottom: 16, fontSize: 17, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#ccc', opacity: 0.2, marginVertical: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  inputLabel: { width: 112, fontSize: 14, fontWeight: '500' },
  formBlock: { marginBottom: 14 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  formHelper: { fontSize: 12, opacity: 0.7, marginBottom: 6 },
  optionRowWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  optionChip: {
    width: '31%',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.35)',
    alignItems: 'center',
  },
  optionChipText: { fontSize: 13, fontWeight: '600' },
  timePickerButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timePickerText: { fontSize: 14 },
  clearButton: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6 },
  clearButtonText: { fontSize: 12, opacity: 0.8 },
  emptyText: { fontSize: 14, opacity: 0.5, fontStyle: 'italic' },
  checkboxGroup: { rowGap: 10 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.2)',
  },
  checkText: { fontSize: 14, flex: 1 },
  checkedText: { opacity: 0.5, textDecorationLine: 'line-through' },
  courseRatingGroup: { rowGap: 12 },
  courseRatingItem: {
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  courseRatingTitle: { fontSize: 14, fontWeight: '600' },
  starRow: { flexDirection: 'row', gap: 8 },
  starBtn: { paddingVertical: 2, paddingHorizontal: 2 },
  starText: { fontSize: 24, lineHeight: 28 },
  courseReasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  symptomsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  symptomPill: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  symptomText: { fontSize: 14, fontWeight: '500' },
  analyzeButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 24 },
  analyzeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusPanelCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  statusTopRow: { flexDirection: 'row', gap: 14 },
  ringWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ringCenterText: { position: 'absolute', alignItems: 'center' },
  ringScore: { fontSize: 22, fontWeight: '700' },
  ringLabel: { fontSize: 12, opacity: 0.7 },
  metricGroup: { flex: 1, justifyContent: 'space-between' },
  metricRow: { marginBottom: 8 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metricLabel: { fontSize: 12, opacity: 0.85 },
  metricValue: { fontSize: 12, fontWeight: '700' },
  metricTrack: { height: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  metricFill: { height: '100%', borderRadius: 999 },
  ecgCard: { marginVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', padding: 10, alignItems: 'center' },
  ecgTitle: { fontSize: 13, marginBottom: 8, opacity: 0.8 },
  ecgWarnText: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  learningHintText: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  adviceSection: { marginBottom: 16 },
  adviceSubtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  adviceText: { fontSize: 15, lineHeight: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bullet: { fontSize: 18, lineHeight: 22, marginRight: 8 },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  historyDate: { fontSize: 12, opacity: 0.75, marginBottom: 3 },
  historyScore: { fontSize: 13 },
  historyChartWrap: { gap: 8 },
  historyLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, opacity: 0.78 },
  historyReasonBox: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  historyReasonText: { fontSize: 13, lineHeight: 20 },
  errorBox: { marginTop: 10, alignItems: 'center', gap: 10 },
  errorText: { color: '#d93025', textAlign: 'center' },
  retryButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '84%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: 'rgba(120,120,120,0.35)',
    marginBottom: 12,
  },
  modalContent: { paddingBottom: 30, rowGap: 12 },
  formSection: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, letterSpacing: 0.2 },
});
