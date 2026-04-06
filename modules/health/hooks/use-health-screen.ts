import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DeepSeekRequestError, sendToDeepSeek } from '@/utils/deepseek';
import { getLocaleForDate } from '@/utils/i18n';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { Course, Task } from '@/types/app';

type Translate = (key: string, options?: Record<string, unknown>) => string;

const SYMPTOM_OPTIONS = ['dizzy', 'sleepy', 'distracted', 'palpitations', 'anxious', 'tired', 'sore', 'great', 'restless'];
const SYMPTOM_LABELS_ZH: Record<string, string> = {
  dizzy: '头晕',
  sleepy: '发困',
  distracted: '注意力涣散',
  palpitations: '心悸',
  anxious: '焦虑',
  tired: '疲惫',
  sore: '肌肉酸痛',
  great: '状态极佳',
  restless: '难以平静',
};
const SYMPTOM_LEGACY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SYMPTOM_LABELS_ZH).map(([key, label]) => [label, key])
);
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

export type TimeFieldKey = 'sleepTime' | 'wakeUpTime' | 'breakfast' | 'lunch' | 'dinner';

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

const clampScore = (value: unknown) => {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(num)));
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

const parseClock = (value: string) => {
  const matched = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!matched) {
    return null;
  }
  const hour = Number(matched[1]);
  const minute = Number(matched[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
};

const parseTimeString = (value: string) => {
  const parsed = parseClock(value);
  if (!parsed) {
    return { hour: 8, minute: 0 };
  }
  const { hour, minute } = parsed;
  return { hour, minute: Math.floor(minute / 5) * 5 };
};

const formatTime = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const toTimeDate = (value: string, baseDate = new Date()) => {
  const parsed = parseClock(value);
  if (!parsed) {
    return null;
  }
  const { hour, minute } = parsed;
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

const buildCompactChangeReason = (advice: HealthAIAdvice, t: Translate) => {
  const separator = t('health.changeReasonSeparator');
  const survivalReason = (advice.key_factors || [])
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, 2)
    .join(separator);

  const learningReason = (advice.learning_score_reasoning || [])
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, 1)
    .join(separator);

  const survivalPart = survivalReason
    ? t('health.changeReasonSurvival', { reason: survivalReason })
    : t('health.changeReasonSurvivalDefault');
  const learningPart = learningReason
    ? t('health.changeReasonLearning', { reason: learningReason })
    : t('health.changeReasonLearningDefault');
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

const parseAIContentToJson = (content: string, t: Translate): HealthAIAdvice => {
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
    throw new Error(t('health.errors.invalidJson'));
  }
};

const buildHealthError = (error: unknown, t: Translate) => {
  if (error instanceof DeepSeekRequestError) {
    if (error.code === 'missing_api_key') {
      return t('health.errors.missingApiKey');
    }
    if (error.status === 401) {
      return t('health.errors.unauthorized');
    }
    if (error.status === 429) {
      return t('health.errors.rateLimited');
    }
    if (error.code === 'timeout' || error.status === 408) {
      return t('health.errors.timeout');
    }
    return t('health.errors.analysisFailedWithMessage', { message: error.message });
  }
  if (error instanceof Error) {
    return t('health.errors.analysisFailedWithMessage', { message: error.message });
  }
  return t('health.errors.analysisFailed');
};

const getDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toTodayCourses = (courses: Course[], now: Date) => {
  const normalizedToday = now.getDay() === 0 ? 7 : now.getDay();
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

const formatTaskTimeInfo = (task: Task, t: Translate) => {
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
      timeLabel: t('health.timeLabelEstimate', { minutes: estimatedMinutes }),
      estimatedMinutes,
    };
  }

  return {
    timeLabel: t('health.timeLabelTbd'),
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

const getScheduleEntryKey = (entry: Pick<DailyScheduleEntry, 'sourceType' | 'title' | 'timeLabel'>) =>
  `${entry.sourceType}_${entry.title}_${entry.timeLabel}`;

export function useHealthScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const { t, i18n } = useTranslation();
  const locale = getLocaleForDate(i18n.language);

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
  const dateKey = useMemo(() => getDateKey(today), [today]);
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
      const taskTime = formatTaskTimeInfo(task, t);
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
  }, [todayCourses, todayTasks, t]);

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
        .map((item) => getScheduleEntryKey(item))
    );

    return checklistItems.filter((item) => completedCourseKeys.has(getScheduleEntryKey(item)));
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
        const key = `${HEALTH_RECORD_PREFIX}${dateKey}`;
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
        const normalizedSymptoms = (record.symptoms || []).map((symptom) => SYMPTOM_LEGACY_MAP[symptom] ?? symptom);
        setSelectedSymptoms(normalizedSymptoms);
        setLearningState(record.learningState || DEFAULT_LEARNING_STATE);
        setCourseSelfRatings(
          (record.courseSelfRatings || []).reduce<Record<string, { stars: number; reason: string }>>((acc, item) => {
            const keyName = `${item.courseTitle}_${item.timeLabel}`;
            acc[keyName] = {
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
  }, [dateKey]);

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

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      if (prev.includes(symptom)) {
        return prev.filter((item) => item !== symptom);
      }
      return [...prev, symptom];
    });
  };

  const openTimePicker = (target: TimeFieldKey, currentValue: string) => {
    const parsed = parseTimeString(currentValue);
    setTempHour(parsed.hour);
    setTempMinute(parsed.minute);
    setPickerTarget(target);
    setPickerVisible(true);
  };

  const updateTimeField = (target: TimeFieldKey, value: string) => {
    if (target === 'sleepTime') setSleepTime(value);
    if (target === 'wakeUpTime') setWakeUpTime(value);
    if (target === 'breakfast') setBreakfast(value);
    if (target === 'lunch') setLunch(value);
    if (target === 'dinner') setDinner(value);
  };

  const applyPickedTime = (hour: number, minute: number) => {
    updateTimeField(pickerTarget, formatTime(hour, minute));
    setPickerVisible(false);
  };

  const clearMealTime = (target: 'breakfast' | 'lunch' | 'dinner') => {
    updateTimeField(target, '');
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
      setAiAdvice({ error: t('health.errors.missingTimes') });
      setFormVisible(true);
      return;
    }

    setLoading(true);
    setAiAdvice(null);
    try {
      const currentTime = new Date().toLocaleString(locale, { hour12: false });
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
        setAiAdvice({ error: t('health.errors.missingCourseRating', { course: missingSelfRating.courseTitle }) });
        setFormVisible(true);
        return;
      }

      const todayRecord: DailyHealthRecord = {
        date: dateKey,
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

      const symptomLabels = selectedSymptoms.map((symptom) => SYMPTOM_LABELS_ZH[symptom] ?? symptom);
      const todayRecordForAI = { ...todayRecord, symptoms: symptomLabels };
      const healthData = {
        todayRecord: todayRecordForAI,
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
仅输出一个 JSON 对象，不要 Markdown，不要额外文本；
仅包含以下字段：
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

      const parsed = parseAIContentToJson(result.content, t);
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
        date: dateKey,
        capturedAt: new Date().toISOString(),
        overallScore: normalized.overall_score || 0,
        learningOverallScore: normalizedLearningState.overall || 0,
        bodyHealthScore: normalized.body_health_score || 0,
        stressScore: normalized.stress_score || 0,
        fatigueScore: normalized.fatigue_score || 0,
        energyScore: normalized.energy_score || 0,
        analysis: normalized.change_reason_summary || buildCompactChangeReason(normalized, t),
      };
      await upsertStatusSnapshot(snapshot);
    } catch (error) {
      console.error(error);
      setAiAdvice({ error: buildHealthError(error, t) });
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
  const panelLearningState = aiAdvice?.learning_status
    ? normalizeLearningState(aiAdvice.learning_status, learningState, autoScheduleProgress.totalCount > 0 ? autoScheduleProgress.completedCount / autoScheduleProgress.totalCount : 0)
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

  const sectionSurfaceStyle = {
    borderColor: isDark ? '#2E3440' : '#E5E7EB',
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
  };

  return {
    colorScheme,
    isDark,
    symptomOptions: SYMPTOM_OPTIONS,
    sleepTime,
    setSleepTime,
    wakeUpTime,
    setWakeUpTime,
    breakfast,
    setBreakfast,
    lunch,
    setLunch,
    dinner,
    setDinner,
    wakeRefreshScore,
    setWakeRefreshScore,
    subjectiveEnergy,
    setSubjectiveEnergy,
    subjectiveMood,
    setSubjectiveMood,
    subjectiveFocus,
    setSubjectiveFocus,
    selectedSymptoms,
    toggleSymptom,
    learningState,
    setLearningState,
    courseSelfRatings,
    setCourseSelfRatings,
    formVisible,
    setFormVisible,
    pickerVisible,
    setPickerVisible,
    pickerTarget,
    setPickerTarget,
    tempHour,
    setTempHour,
    tempMinute,
    setTempMinute,
    aiAdvice,
    statusHistory,
    selectedHistoryPointIndex,
    setSelectedHistoryPointIndex,
    ecgPhase,
    loading,
    isRecordLoading,
    dateKey,
    todayCourses,
    todayTasks,
    checklistItems,
    autoScheduleProgress,
    completedCourseItems,
    currentBodyScore,
    panelOverallScore,
    panelBodyScore,
    panelEnergyScore,
    panelStressScore,
    panelFatigueScore,
    panelLearningState,
    learningRingColor,
    ecgColor,
    ecgDangerFactor,
    ecgPoints,
    ecgScanHeadX,
    ecgTrailPoints,
    historyChart,
    sectionSurfaceStyle,
    handleAnalyze,
    openTimePicker,
    applyPickedTime,
    clearMealTime,
    setCourseSelfStar,
    setCourseSelfReason,
  };
}
