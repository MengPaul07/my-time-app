import { useEffect, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/components/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { sendToDeepSeek } from '@/utils/deepseek';

type ThemeType = 'light' | 'dark';

type DifficultyLevel = 'beginner' | 'basic' | 'intermediate' | 'advanced';
type SkillModuleId = 'vocabulary' | 'listening' | 'speaking' | 'reading' | 'writing' | 'grammar';

type EnglishModule = {
  id: SkillModuleId;
  name: string;
  level: number;
  exp: number;
  totalExp: number;
};

type PracticeRecord = {
  id: string;
  selectedItemIds: string[];
  selectedItemTitles: string[];
  skills: SkillModuleId[];
  difficulty: DifficultyLevel;
  notes: string;
  createdAt: string;
  points: Record<SkillModuleId, number>;
  analysisReason?: string;
  pointReason?: string;
};

type SelectableItem = {
  id: string;
  title: string;
  type: 'task' | 'course';
  detail: string;
  textBlob: string;
};

const STORAGE_EN_RECORDS = 'english:records';
const STORAGE_EN_MODULES = 'english:modules';
const STORAGE_EN_DAILY_SNAPSHOT = 'english:daily:snapshot';

type EnglishDailySnapshot = {
  dateKey: string;
  recordCount: number;
  moduleTotalExp: number;
  cumulativeRecordCount: number;
  updatedAt: string;
};

const MODULES: EnglishModule[] = [
  { id: 'vocabulary', name: '单词', level: 1, exp: 0, totalExp: 0 },
  { id: 'listening', name: '听力', level: 1, exp: 0, totalExp: 0 },
  { id: 'speaking', name: '口语', level: 1, exp: 0, totalExp: 0 },
  { id: 'reading', name: '阅读', level: 1, exp: 0, totalExp: 0 },
  { id: 'writing', name: '写作', level: 1, exp: 0, totalExp: 0 },
  { id: 'grammar', name: '语法', level: 1, exp: 0, totalExp: 0 },
];

const SKILL_LABELS: Record<SkillModuleId, string> = {
  vocabulary: '单词',
  listening: '听力',
  speaking: '口语',
  reading: '阅读',
  writing: '写作',
  grammar: '语法',
};

const DIFFICULTY_ORDER: DifficultyLevel[] = ['beginner', 'basic', 'intermediate', 'advanced'];
const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: '初阶',
  basic: '基础',
  intermediate: '进阶',
  advanced: '强化',
};
const DIFFICULTY_BASE_POINTS: Record<DifficultyLevel, number> = {
  beginner: 5,
  basic: 8,
  intermediate: 12,
  advanced: 16,
};

const MODULE_KEYWORDS: Record<SkillModuleId, string[]> = {
  vocabulary: ['word', 'vocabulary', '词汇', '单词', '背词', '默写'],
  listening: ['listen', 'listening', '听力', '精听', '泛听', '听写'],
  speaking: ['speak', 'speaking', '口语', '跟读', '复述', '发音'],
  reading: ['read', 'reading', '阅读', '文章', '主旨', '细节'],
  writing: ['write', 'writing', '写作', '作文', '表达'],
  grammar: ['grammar', '语法', '时态', '从句', '句法'],
};

const CUMULATIVE_SKILLS: SkillModuleId[] = ['vocabulary', 'listening', 'speaking'];
const HEATMAP_DAYS = 84;
const HEATMAP_Y_AXIS_WIDTH = 32;
const HEATMAP_GRID_GAP = 1;
const RING_SIZE = 68;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '');

const tokenize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_\-/]+/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const overlapScore = (left: string[], right: string[]) => {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const matched = left.filter((token) => rightSet.has(token)).length;
  return matched / Math.max(left.length, right.length);
};

const safeArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) return hexColor;
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const moduleLevelThreshold = (level: number) => 160 + (level - 1) * 70;

const getLocalDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getSkillModuleByText = (text: string): SkillModuleId => {
  const tokens = tokenize(text);
  let best: SkillModuleId = 'vocabulary';
  let bestScore = 0;

  for (const moduleId of Object.keys(MODULE_KEYWORDS) as SkillModuleId[]) {
    const score = overlapScore(tokens, MODULE_KEYWORDS[moduleId]);
    if (score > bestScore) {
      bestScore = score;
      best = moduleId;
    }
  }

  return bestScore >= 0.2 ? best : 'vocabulary';
};

export function useEnglishScreen() {
  const colorScheme = useColorScheme();
  const theme = (colorScheme ?? 'light') as ThemeType;
  const palette = Colors[theme];
  const chartWidth = Dimensions.get('window').width - 90;

  const { session } = useUserStore();
  const tasks = useTaskStore((state) => state.tasks) || [];
  const courses = useTaskStore((state) => state.courses) || [];
  const fetchData = useTaskStore((state) => state.fetchData);

  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [modules, setModules] = useState<EnglishModule[]>(MODULES);

  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const [noteInput, setNoteInput] = useState('');

  const [letLLMInferSkills, setLetLLMInferSkills] = useState(true);
  const [letLLMInferDifficulty, setLetLLMInferDifficulty] = useState(true);
  const [manualDifficulty, setManualDifficulty] = useState<DifficultyLevel | ''>('');
  const [manualSkills, setManualSkills] = useState<Record<SkillModuleId, boolean>>({
    vocabulary: false,
    listening: false,
    speaking: false,
    reading: false,
    writing: false,
    grammar: false,
  });

  const [statusText, setStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchData(session?.user?.id || null, new Date());
  }, [fetchData, session?.user?.id]);

  useEffect(() => {
    const bootstrap = async () => {
      const [savedRecordsRaw, savedModulesRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_EN_RECORDS),
        AsyncStorage.getItem(STORAGE_EN_MODULES),
      ]);

      if (savedRecordsRaw) {
        setRecords(safeArray<PracticeRecord>(JSON.parse(savedRecordsRaw)));
      }

      if (savedModulesRaw) {
        const parsed = safeArray<EnglishModule>(JSON.parse(savedModulesRaw));
        if (parsed.length > 0) {
          const merged = MODULES.map((base) => {
            const hit = parsed.find((item) => item.id === base.id);
            return hit
              ? {
                  ...base,
                  level: Math.max(1, hit.level || 1),
                  exp: Math.max(0, hit.exp || 0),
                  totalExp: Math.max(0, hit.totalExp || 0),
                }
              : base;
          });
          setModules(merged);
        }
      }
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    const persistDailySnapshot = async () => {
      try {
        const dateKey = getLocalDateKey();
        const snapshot: EnglishDailySnapshot = {
          dateKey,
          recordCount: records.filter((item) => getLocalDateKey(new Date(item.createdAt)) === dateKey).length,
          moduleTotalExp: modules.reduce((sum, item) => sum + (item.totalExp || 0), 0),
          cumulativeRecordCount: records.length,
          updatedAt: new Date().toISOString(),
        };

        const existingRaw = await AsyncStorage.getItem(STORAGE_EN_DAILY_SNAPSHOT);
        const existing = existingRaw ? safeArray<EnglishDailySnapshot>(JSON.parse(existingRaw)) : [];
        const index = existing.findIndex((item) => item.dateKey === dateKey);
        const next = [...existing];
        if (index >= 0) next[index] = snapshot;
        else next.unshift(snapshot);

        await AsyncStorage.setItem(STORAGE_EN_DAILY_SNAPSHOT, JSON.stringify(next.slice(0, 180)));
      } catch (error) {
        console.warn('Failed to persist English daily snapshot:', error);
      }
    };

    void persistDailySnapshot();
  }, [records, modules]);

  const selectableItems = useMemo(() => {
    const taskItems: SelectableItem[] = tasks
      .filter((task) => !task.is_course)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title || '未命名任务',
        type: 'task' as const,
        detail: task.start_time ? new Date(task.start_time).toLocaleString('zh-CN') : '任务',
        textBlob: `${task.title || ''} ${task.description || ''} ${task.location || ''}`,
      }));

    const courseItems: SelectableItem[] = courses.map((course) => ({
      id: `course-${course.id}`,
      title: course.name || '未命名课程',
      type: 'course' as const,
      detail: `周${course.day_of_week} ${course.start_time}-${course.end_time}`,
      textBlob: `${course.name || ''} ${course.location || ''}`,
    }));

    const merged = [...taskItems, ...courseItems];
    if (merged.length <= 18) return merged;

    const englishKeywords = ['英语', 'english', '单词', '听力', '口语', '阅读', '写作', '语法'];
    const prioritized = merged.filter((item) =>
      englishKeywords.some((keyword) => item.textBlob.toLowerCase().includes(keyword.toLowerCase()))
    );
    const fallback = merged.filter((item) => !prioritized.some((picked) => picked.id === item.id));

    return [...prioritized, ...fallback].slice(0, 24);
  }, [courses, tasks]);

  const selectedItems = useMemo(
    () => selectableItems.filter((item) => selectedItemIds[item.id]),
    [selectedItemIds, selectableItems]
  );

  const selectedCount = selectedItems.length;

  const saveRecords = async (next: PracticeRecord[]) => {
    setRecords(next);
    await AsyncStorage.setItem(STORAGE_EN_RECORDS, JSON.stringify(next));
  };

  const saveModules = async (next: EnglishModule[]) => {
    setModules(next);
    await AsyncStorage.setItem(STORAGE_EN_MODULES, JSON.stringify(next));
  };

  const inferFromLLM = async (payload: {
    selectedItems: SelectableItem[];
    notes: string;
    inferSkills: boolean;
    inferDifficulty: boolean;
    manualSkills: SkillModuleId[];
    manualDifficulty?: DifficultyLevel;
  }): Promise<{
    skills: SkillModuleId[];
    difficulty: DifficultyLevel;
    analysisReason: string;
    pointReason: string;
  }> => {
    try {
      const systemPrompt = `你是英语学习分析助手。只输出 JSON。\n输入是用户勾选的日程任务/课程和学习备注。\n请输出：skills(从 vocabulary/listening/speaking/reading/writing/grammar 里选)、difficulty(beginner/basic/intermediate/advanced)、analysisReason、pointReason。\n难度解释：beginner=初阶, basic=基础, intermediate=进阶, advanced=强化。\n若 inferSkills=false，必须沿用传入 manualSkills。\n若 inferDifficulty=false，必须沿用传入 manualDifficulty。\n输出格式：{ skills, difficulty, analysisReason, pointReason }`;

      const reply = await sendToDeepSeek([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            selectedItems: payload.selectedItems,
            notes: payload.notes,
            inferSkills: payload.inferSkills,
            inferDifficulty: payload.inferDifficulty,
            manualSkills: payload.manualSkills,
            manualDifficulty: payload.manualDifficulty,
          }),
        },
      ]);

      const parsed = JSON.parse(reply.content || '{}') as {
        skills?: string[];
        difficulty?: DifficultyLevel;
        analysisReason?: string;
        pointReason?: string;
      };

      const llmSkills = safeArray<string>(parsed.skills)
        .map((item) => normalizeKey(item))
        .map((item) => {
          if (item.includes('vocab') || item.includes('word') || item.includes('词')) return 'vocabulary';
          if (item.includes('listen') || item.includes('听')) return 'listening';
          if (item.includes('speak') || item.includes('口语') || item.includes('发音')) return 'speaking';
          if (item.includes('read') || item.includes('阅读')) return 'reading';
          if (item.includes('write') || item.includes('写作')) return 'writing';
          if (item.includes('grammar') || item.includes('语法')) return 'grammar';
          return '';
        })
        .filter(Boolean) as SkillModuleId[];

      const uniqueSkills = [...new Set(llmSkills)];
      const resolvedSkills = payload.inferSkills
        ? (uniqueSkills.length > 0 ? uniqueSkills : [getSkillModuleByText(payload.selectedItems.map((item) => item.textBlob).join(' '))])
        : payload.manualSkills;

      const resolvedDifficulty = payload.inferDifficulty
        ? (DIFFICULTY_ORDER.includes(parsed.difficulty as DifficultyLevel)
            ? (parsed.difficulty as DifficultyLevel)
            : 'basic')
        : (payload.manualDifficulty || 'basic');

      return {
        skills: resolvedSkills,
        difficulty: resolvedDifficulty,
        analysisReason:
          parsed.analysisReason?.trim() ||
          `基于勾选任务与备注，判定本次学习聚焦于 ${resolvedSkills.map((id) => SKILL_LABELS[id]).join(' / ')}。`,
        pointReason:
          parsed.pointReason?.trim() ||
          `按 ${DIFFICULTY_LABELS[resolvedDifficulty]} 难度与模块等级衰减计算加点。`,
      };
    } catch {
      const text = payload.selectedItems.map((item) => item.textBlob).join(' ');
      const inferredSkill = getSkillModuleByText(`${text} ${payload.notes}`);
      const fallbackSkills = payload.inferSkills ? [inferredSkill] : payload.manualSkills;
      const fallbackDifficulty = payload.inferDifficulty ? 'basic' : (payload.manualDifficulty || 'basic');

      return {
        skills: fallbackSkills,
        difficulty: fallbackDifficulty,
        analysisReason: 'LLM 异常，已按勾选任务文本进行本地技能推断。',
        pointReason: `按本地规则，以 ${DIFFICULTY_LABELS[fallbackDifficulty]} 难度计算模块加点。`,
      };
    }
  };

  const applyModuleProgress = (targetModules: EnglishModule[], points: Record<SkillModuleId, number>) => {
    return targetModules.map((module) => {
      const rawGain = points[module.id] ?? 0;
      if (rawGain <= 0) return module;

      const levelDecay = Math.max(0.35, 1 - (module.level - 1) * 0.1);
      const appliedGain = Math.max(0, Math.round(rawGain * levelDecay));

      let nextExp = module.exp + appliedGain;
      let nextLevel = module.level;
      while (nextExp >= moduleLevelThreshold(nextLevel)) {
        nextExp -= moduleLevelThreshold(nextLevel);
        nextLevel += 1;
      }

      return {
        ...module,
        level: nextLevel,
        exp: nextExp,
        totalExp: module.totalExp + appliedGain,
      };
    });
  };

  const submitSelectedPractice = async () => {
    if (selectedItems.length === 0) {
      setStatusText('请先勾选至少一项相关日程任务/课程。');
      return;
    }

    if (!letLLMInferDifficulty && !manualDifficulty) {
      setStatusText('已关闭难度自动判断时，请先选择难度。');
      return;
    }

    const chosenManualSkills = (Object.keys(manualSkills) as SkillModuleId[]).filter((id) => manualSkills[id]);
    if (!letLLMInferSkills && chosenManualSkills.length === 0) {
      setStatusText('已关闭技能自动判断时，请至少勾选一个技能。');
      return;
    }

    setIsSubmitting(true);
    setStatusText('');

    try {
      const llm = await inferFromLLM({
        selectedItems,
        notes: noteInput.trim(),
        inferSkills: letLLMInferSkills,
        inferDifficulty: letLLMInferDifficulty,
        manualSkills: chosenManualSkills,
        manualDifficulty: manualDifficulty || undefined,
      });

      const points: Record<SkillModuleId, number> = {
        vocabulary: 0,
        listening: 0,
        speaking: 0,
        reading: 0,
        writing: 0,
        grammar: 0,
      };

      const base = DIFFICULTY_BASE_POINTS[llm.difficulty];
      for (const skill of llm.skills) {
        points[skill] = Math.max(1, Math.round(base));
      }

      const nextModules = applyModuleProgress(modules, points);
      const record: PracticeRecord = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        selectedItemIds: selectedItems.map((item) => item.id),
        selectedItemTitles: selectedItems.map((item) => item.title),
        skills: llm.skills,
        difficulty: llm.difficulty,
        notes: noteInput.trim(),
        createdAt: new Date().toISOString(),
        points,
        analysisReason: llm.analysisReason,
        pointReason: llm.pointReason,
      };

      const nextRecords = [record, ...records].slice(0, 400);
      await Promise.all([saveRecords(nextRecords), saveModules(nextModules)]);

      const totalGain = Object.values(points).reduce((sum, value) => sum + value, 0);
      setStatusText(`已根据勾选任务加点，本次总加点 +${totalGain}。`);
      setSelectedItemIds({});
      setNoteInput('');
    } catch {
      setStatusText('处理失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalKnowledgeExp = useMemo(
    () => modules.reduce((sum, item) => sum + item.totalExp, 0),
    [modules]
  );

  const globalRank = useMemo(() => {
    if (totalKnowledgeExp >= 3200) return { name: 'Master', color: '#EA580C' };
    if (totalKnowledgeExp >= 2200) return { name: 'Advanced', color: '#DC2626' };
    if (totalKnowledgeExp >= 1400) return { name: 'Upper-Intermediate', color: '#7C3AED' };
    if (totalKnowledgeExp >= 800) return { name: 'Intermediate', color: '#2563EB' };
    if (totalKnowledgeExp >= 300) return { name: 'Elementary', color: '#059669' };
    return { name: 'Starter', color: '#6B7280' };
  }, [totalKnowledgeExp]);

  const cumulativeEntries = useMemo(() => {
    return records.filter((record) => record.skills.some((skill) => CUMULATIVE_SKILLS.includes(skill)));
  }, [records]);

  const contributionHeatmap = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(now);
    start.setDate(now.getDate() - (HEATMAP_DAYS - 1));

    const alignedStart = new Date(start);
    alignedStart.setDate(start.getDate() - start.getDay());

    const counts = new Map<string, number>();
    for (const record of cumulativeEntries) {
      const date = new Date(record.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const allDays: Array<{ dateKey: string; count: number }> = [];
    const cursor = new Date(alignedStart);
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      allDays.push({ dateKey: key, count: counts.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: Array<{ startDate: Date; counts: number[] }> = [];
    for (let index = 0; index < allDays.length; index += 7) {
      const day = allDays[index]?.dateKey;
      const [year, month, date] = (day ?? '').split('-').map(Number);
      weeks.push({
        startDate: new Date(year || 1970, (month || 1) - 1, date || 1),
        counts: allDays.slice(index, index + 7).map((item) => item.count),
      });
    }

    const monthSpans: Array<{ label: string; weeks: number }> = [];
    for (const week of weeks) {
      const label = week.startDate.toLocaleDateString('en-US', { month: 'short' });
      const last = monthSpans[monthSpans.length - 1];
      if (last && last.label === label) last.weeks += 1;
      else monthSpans.push({ label, weeks: 1 });
    }

    const maxCount = Math.max(1, ...allDays.map((item) => item.count));
    const total = allDays.reduce((sum, item) => sum + item.count, 0);

    return {
      weeks,
      monthSpans,
      maxCount,
      total,
      startLabel: allDays[0]?.dateKey,
      endLabel: allDays[allDays.length - 1]?.dateKey,
    };
  }, [cumulativeEntries]);

  const heatmapCellSize = useMemo(() => {
    const weeksCount = Math.max(1, contributionHeatmap.weeks.length);
    const available = chartWidth - HEATMAP_Y_AXIS_WIDTH - (weeksCount - 1) * HEATMAP_GRID_GAP;
    const size = Math.floor(available / weeksCount);
    return Math.max(12, Math.min(24, size));
  }, [chartWidth, contributionHeatmap.weeks.length]);

  const heatmapGridWidth = useMemo(() => {
    const weeksCount = contributionHeatmap.weeks.length;
    if (weeksCount === 0) return 0;
    return weeksCount * heatmapCellSize + (weeksCount - 1) * HEATMAP_GRID_GAP;
  }, [contributionHeatmap.weeks.length, heatmapCellSize]);

  const getHeatColor = (count: number) => {
    if (count <= 0) return withAlpha(palette.border, 0.5);
    const ratio = count / contributionHeatmap.maxCount;
    if (ratio <= 0.25) return withAlpha(palette.tint, 0.25);
    if (ratio <= 0.5) return withAlpha(palette.tint, 0.45);
    if (ratio <= 0.75) return withAlpha(palette.tint, 0.65);
    return withAlpha(palette.tint, 0.9);
  };

  return {
    theme,
    palette,
    chartWidth,
    records,
    modules,
    selectedItemIds,
    setSelectedItemIds,
    noteInput,
    setNoteInput,
    letLLMInferSkills,
    setLetLLMInferSkills,
    letLLMInferDifficulty,
    setLetLLMInferDifficulty,
    manualDifficulty,
    setManualDifficulty,
    manualSkills,
    setManualSkills,
    statusText,
    isSubmitting,
    selectableItems,
    selectedCount,
    totalKnowledgeExp,
    globalRank,
    contributionHeatmap,
    heatmapCellSize,
    heatmapGridWidth,
    getHeatColor,
    submitSelectedPractice,
  };
}

export {
  DIFFICULTY_LABELS,
  DIFFICULTY_ORDER,
  HEATMAP_GRID_GAP,
  HEATMAP_Y_AXIS_WIDTH,
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  RING_SIZE,
  RING_STROKE,
  SKILL_LABELS,
};

export type { DifficultyLevel, SkillModuleId };
