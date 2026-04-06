import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/components/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { sendToDeepSeek } from '@/utils/deepseek';

type ThemeType = 'light' | 'dark';

type CFUserInfo = {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
};

type CFRatingRecord = {
  contestId: number;
  contestName: string;
  newRating: number;
  ratingUpdateTimeSeconds: number;
};

type CFSubmission = {
  contestId?: number;
  problem?: {
    index?: string;
    name?: string;
    rating?: number;
    tags?: string[];
  };
  verdict?: string;
  creationTimeSeconds: number;
};

type CFContest = {
  id: number;
  name: string;
  phase: string;
  startTimeSeconds?: number;
  durationSeconds?: number;
};

type UpcomingContest = {
  id: string;
  source: 'Codeforces' | 'AtCoder' | 'NowCoder' | 'Luogu';
  name: string;
  startTimeSeconds: number;
  durationSeconds?: number;
  url?: string;
};

type CFStandingsResult = {
  problems: Array<{ index?: string }>;
  rows: Array<{
    problemResults: Array<{
      points?: number;
      rejectedAttemptCount?: number;
    }>;
  }>;
};

type ContestSolveSummary = {
  solved: number;
  attempted: number;
  total: number | null;
};

type CFApiResponse<T> = {
  status: 'OK' | 'FAILED';
  comment?: string;
  result?: T;
};

const STORAGE_CF_HANDLE = 'cp:cf:handle';
const STORAGE_CP_FEEDBACK = 'cp:global:feedback';
const STORAGE_CP_KNOWLEDGE = 'cp:global:knowledge';
const STORAGE_CP_DAILY_SNAPSHOT = 'cp:daily:snapshot';

type CPDailySnapshot = {
  dateKey: string;
  feedbackCount: number;
  moduleTotalExp: number;
  subPointTotalExp: number;
  updatedAt: string;
};

type ProblemDifficulty = 'water' | 'template' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

const DIFFICULTY_ORDER: ProblemDifficulty[] = ['water', 'template', 'orange', 'yellow', 'green', 'blue', 'purple'];

const DIFFICULTY_LABEL_MAP: Record<ProblemDifficulty, string> = {
  water: '水题',
  template: '模板',
  orange: '橙',
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  purple: '紫',
};

const CF_TAG_MODULE_HINTS: Record<string, string[]> = {
  dp: ['dp'],
  bitmasks: ['dp', 'data_structure'],
  graphs: ['graph'],
  trees: ['graph'],
  shortest_paths: ['graph'],
  graph_matchings: ['graph'],
  dfs_and_similar: ['graph'],
  brute_force: ['search', 'implementation'],
  greedy: ['greedy_constructive'],
  implementation: ['implementation'],
  constructive_algorithms: ['greedy_constructive', 'implementation'],
  data_structures: ['data_structure'],
  dsu: ['data_structure', 'graph'],
  segment_tree: ['data_structure'],
  binary_search: ['search', 'data_structure'],
  two_pointers: ['implementation', 'search'],
  sortings: ['implementation'],
  strings: ['string'],
  string_suffix_structures: ['string', 'data_structure'],
  hashing: ['string', 'data_structure'],
  number_theory: ['math'],
  math: ['math'],
  combinatorics: ['math'],
  geometry: ['math'],
  interactive: ['game_interactive', 'implementation'],
  games: ['game_interactive'],
};

type ProblemFeedback = {
  id: string;
  source: string;
  title: string;
  problemType?: 'old' | 'new';
  algorithms: string[];
  difficulty: ProblemDifficulty;
  isWater: boolean;
  solution: string;
  createdAt: string;
  points: Record<string, number>;
  inferredByLLM?: boolean;
  analysisReason?: string;
  pointReason?: string;
};

type KnowledgeModule = {
  id: string;
  name: string;
  level: number;
  exp: number;
  totalExp: number;
};

type KnowledgeSubPoint = {
  id: string;
  moduleId: string;
  name: string;
  level: number;
  exp: number;
  totalExp: number;
};

const DEFAULT_MODULES: KnowledgeModule[] = [
  { id: 'implementation', name: '实现与模拟', level: 1, exp: 0, totalExp: 0 },
  { id: 'data_structure', name: '数据结构', level: 1, exp: 0, totalExp: 0 },
  { id: 'dp', name: '动态规划', level: 1, exp: 0, totalExp: 0 },
  { id: 'graph', name: '图论', level: 1, exp: 0, totalExp: 0 },
  { id: 'math', name: '数学', level: 1, exp: 0, totalExp: 0 },
  { id: 'string', name: '字符串', level: 1, exp: 0, totalExp: 0 },
  { id: 'greedy_constructive', name: '贪心与构造', level: 1, exp: 0, totalExp: 0 },
  { id: 'search', name: '搜索与枚举', level: 1, exp: 0, totalExp: 0 },
  { id: 'game_interactive', name: '博弈与交互', level: 1, exp: 0, totalExp: 0 },
];

const DEFAULT_SUBPOINTS: KnowledgeSubPoint[] = [
  { id: 'linear_dp', moduleId: 'dp', name: '线性 DP', level: 1, exp: 0, totalExp: 0 },
  { id: 'interval_dp', moduleId: 'dp', name: '区间 DP', level: 1, exp: 0, totalExp: 0 },
  { id: 'tree_dp', moduleId: 'dp', name: '树形 DP', level: 1, exp: 0, totalExp: 0 },
  { id: 'dsu', moduleId: 'data_structure', name: '并查集', level: 1, exp: 0, totalExp: 0 },
  { id: 'segment_tree', moduleId: 'data_structure', name: '线段树', level: 1, exp: 0, totalExp: 0 },
  { id: 'fenwick', moduleId: 'data_structure', name: '树状数组', level: 1, exp: 0, totalExp: 0 },
  { id: 'shortest_path', moduleId: 'graph', name: '最短路', level: 1, exp: 0, totalExp: 0 },
  { id: 'mst', moduleId: 'graph', name: '最小生成树', level: 1, exp: 0, totalExp: 0 },
  { id: 'number_theory', moduleId: 'math', name: '数论', level: 1, exp: 0, totalExp: 0 },
  { id: 'combinatorics', moduleId: 'math', name: '组合计数', level: 1, exp: 0, totalExp: 0 },
  { id: 'geometry', moduleId: 'math', name: '计算几何', level: 1, exp: 0, totalExp: 0 },
  { id: 'kmp', moduleId: 'string', name: 'KMP', level: 1, exp: 0, totalExp: 0 },
  { id: 'string_hash', moduleId: 'string', name: '字符串哈希', level: 1, exp: 0, totalExp: 0 },
  { id: 'trie', moduleId: 'string', name: 'Trie', level: 1, exp: 0, totalExp: 0 },
  { id: 'greedy_basic', moduleId: 'greedy_constructive', name: '贪心', level: 1, exp: 0, totalExp: 0 },
  { id: 'constructive', moduleId: 'greedy_constructive', name: '构造', level: 1, exp: 0, totalExp: 0 },
  { id: 'binary_search', moduleId: 'search', name: '二分', level: 1, exp: 0, totalExp: 0 },
  { id: 'dfs', moduleId: 'search', name: 'DFS', level: 1, exp: 0, totalExp: 0 },
  { id: 'bfs', moduleId: 'search', name: 'BFS', level: 1, exp: 0, totalExp: 0 },
  { id: 'simulation', moduleId: 'implementation', name: '模拟', level: 1, exp: 0, totalExp: 0 },
  { id: 'implementation', moduleId: 'implementation', name: '实现', level: 1, exp: 0, totalExp: 0 },
  { id: 'game_theory', moduleId: 'game_interactive', name: '博弈论', level: 1, exp: 0, totalExp: 0 },
  { id: 'interactive', moduleId: 'game_interactive', name: '交互题', level: 1, exp: 0, totalExp: 0 },
];

const MODULE_ALIAS_TO_ID: Record<string, string> = {
  implementation: 'implementation',
  coding: 'implementation',
  实现: 'implementation',
  模拟: 'implementation',
  实现与模拟: 'implementation',
  data_structure: 'data_structure',
  data_structures: 'data_structure',
  数据结构: 'data_structure',
  dp: 'dp',
  动态规划: 'dp',
  graph: 'graph',
  graphs: 'graph',
  图论: 'graph',
  math: 'math',
  数学: 'math',
  string: 'string',
  strings: 'string',
  字符串: 'string',
  greedy_constructive: 'greedy_constructive',
  ad_hoc: 'greedy_constructive',
  greedy: 'greedy_constructive',
  constructive: 'greedy_constructive',
  贪心与构造: 'greedy_constructive',
  search: 'search',
  搜索与枚举: 'search',
  game_interactive: 'game_interactive',
  博弈与交互: 'game_interactive',
};

const MODULE_DEFAULT_SUBPOINT_NAME: Record<string, string> = {
  implementation: '实现',
  data_structure: '并查集',
  dp: '线性 DP',
  graph: '最短路',
  math: '数论',
  string: 'KMP',
  greedy_constructive: '贪心',
  search: '二分',
  game_interactive: '博弈论',
};

const MODULE_KEYWORDS: Record<string, string[]> = {
  implementation: ['implement', 'implementation', 'simulate', 'simulation', '工程', '实现', '模拟', '细节'],
  data_structure: ['data', 'structure', 'ds', 'union', 'find', 'dsu', 'set', 'tree', 'fenwick', 'segment', 'heap', '并查集', '树状数组', '线段树', '数据结构'],
  dp: ['dp', 'dynamic', 'programming', '状态', '转移', '记忆化', '动规', '动态规划'],
  graph: ['graph', 'tree', 'shortest', 'path', 'mst', 'flow', 'bfs', 'dfs', '图', '最短路', '最小生成树', '网络流'],
  math: ['math', 'number', 'theory', 'comb', 'combin', 'geometry', '概率', '数学', '数论', '组合', '几何'],
  string: ['string', 'kmp', 'trie', 'hash', 'ac', 'automaton', '后缀', '字符串', '字典树'],
  greedy_constructive: ['greedy', 'construct', 'ad-hoc', '策略', '贪心', '构造'],
  search: ['search', 'binary', 'enumerate', 'brute', 'dfs', 'bfs', '二分', '搜索', '枚举', '暴力'],
  game_interactive: ['game', 'interactive', '博弈', '交互'],
};

const DIFFICULTY_BASE_POINTS: Record<ProblemDifficulty, number> = {
  water: 0,
  template: 4,
  orange: 8,
  yellow: 10,
  green: 12,
  blue: 15,
  purple: 18,
};

const subLevelThreshold = (level: number) => 100 + (level - 1) * 45;
const moduleLevelThreshold = (level: number) => 160 + (level - 1) * 70;
const CP_SUB_RING_SIZE = 46;
const CP_SUB_RING_STROKE = 5;
const CP_SUB_RING_RADIUS = (CP_SUB_RING_SIZE - CP_SUB_RING_STROKE) / 2;
const CP_SUB_RING_CIRCUMFERENCE = 2 * Math.PI * CP_SUB_RING_RADIUS;

const normalizeKnowledgeKey = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '');

const normalizeTagKey = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[+*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '');

const resolveFixedModuleId = (raw: string) => {
  const normalized = normalizeKnowledgeKey(raw);
  return MODULE_ALIAS_TO_ID[normalized] ?? '';
};

const tokenizeKnowledgeText = (text: string) => {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[+*]/g, ' ')
    .replace(/[_\-/]+/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [] as string[];
  return normalized.split(' ').filter(Boolean);
};

const computeTokenOverlapScore = (left: string[], right: string[]) => {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const matched = left.filter((token) => rightSet.has(token)).length;
  if (matched === 0) return 0;
  return matched / Math.max(left.length, right.length);
};

const getLocalDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const inferModuleIdByKeywords = (
  raw: string,
  contextText: string,
  modules: KnowledgeModule[],
  fallbackModuleId: string
) => {
  const rawTokens = tokenizeKnowledgeText(raw);
  const contextTokens = tokenizeKnowledgeText(contextText);
  const allTokens = [...rawTokens, ...contextTokens];
  if (allTokens.length === 0) return fallbackModuleId;

  let bestModuleId = fallbackModuleId;
  let bestScore = 0;

  for (const module of modules) {
    const keywordTokens = MODULE_KEYWORDS[module.id] ?? tokenizeKnowledgeText(module.name);
    const score = computeTokenOverlapScore(allTokens, keywordTokens);
    if (score > bestScore) {
      bestScore = score;
      bestModuleId = module.id;
    }
  }

  return bestScore >= 0.2 ? bestModuleId : fallbackModuleId;
};

const findClosestSubPointName = (raw: string, subPoints: KnowledgeSubPoint[]) => {
  const rawKey = normalizeKnowledgeKey(raw);
  if (!rawKey) return '';

  const exact = subPoints.find((item) => normalizeKnowledgeKey(item.name) === rawKey);
  if (exact) return exact.name;

  const rawTokens = tokenizeKnowledgeText(raw);
  let bestName = '';
  let bestScore = 0;

  for (const subPoint of subPoints) {
    const nameKey = normalizeKnowledgeKey(subPoint.name);
    if (nameKey.includes(rawKey) || rawKey.includes(nameKey)) {
      return subPoint.name;
    }

    const candidateTokens = tokenizeKnowledgeText(subPoint.name);
    const score = computeTokenOverlapScore(rawTokens, candidateTokens);
    if (score > bestScore) {
      bestScore = score;
      bestName = subPoint.name;
    }
  }

  return bestScore >= 0.34 ? bestName : '';
};

const normalizeAlgorithmName = (
  raw: string,
  contextText = '',
  subPoints: KnowledgeSubPoint[] = DEFAULT_SUBPOINTS,
  modules: KnowledgeModule[] = DEFAULT_MODULES
) => {
  const normalizedTag = normalizeTagKey(raw);

  if (!normalizedTag) return raw.trim().replace(/[_\-/]+/g, ' ');

  const closestSubPoint = findClosestSubPointName(raw, subPoints);
  if (closestSubPoint) {
    return closestSubPoint;
  }

  const moduleId = resolveFixedModuleId(raw);
  if (moduleId) {
    return MODULE_DEFAULT_SUBPOINT_NAME[moduleId] ?? raw.trim();
  }

  const inferredModuleId = inferModuleIdByKeywords(raw, contextText, modules, 'implementation');
  if (inferredModuleId) {
    return MODULE_DEFAULT_SUBPOINT_NAME[inferredModuleId] ?? raw.trim();
  }

  return raw.trim().replace(/[_\-/]+/g, ' ');
};

const normalizeAlgorithmList = (
  names: string[],
  contextText = '',
  subPoints: KnowledgeSubPoint[] = DEFAULT_SUBPOINTS,
  modules: KnowledgeModule[] = DEFAULT_MODULES
) => {
  const dedup = new Set<string>();
  const result: string[] = [];

  for (const raw of names) {
    const normalizedName = normalizeAlgorithmName(raw, contextText, subPoints, modules);
    const key = normalizeKnowledgeKey(normalizedName);
    if (!key || dedup.has(key)) continue;
    dedup.add(key);
    result.push(normalizedName);
  }

  return result;
};

const resolveModuleIdForSubPointName = (
  name: string,
  modules: KnowledgeModule[],
  existingSubPoints: KnowledgeSubPoint[],
  fallbackModuleId: string
) => {
  const normalized = normalizeKnowledgeKey(name);
  if (!normalized) return fallbackModuleId;

  const existing = existingSubPoints.find((item) => normalizeKnowledgeKey(item.name) === normalized);
  if (existing) return existing.moduleId;

  const defaultMatch = DEFAULT_SUBPOINTS.find((item) => normalizeKnowledgeKey(item.name) === normalized);
  if (defaultMatch) return defaultMatch.moduleId;
  const validModuleIds = new Set(modules.map((item) => item.id));

  const fixedModuleId = resolveFixedModuleId(name);
  if (fixedModuleId && validModuleIds.has(fixedModuleId)) return fixedModuleId;

  const inferredModuleId = inferModuleIdByKeywords(name, name, modules, fallbackModuleId);
  if (inferredModuleId && validModuleIds.has(inferredModuleId)) return inferredModuleId;

  return fallbackModuleId;
};

const normalizeKnowledgeSystem = (
  modules: KnowledgeModule[],
  subPoints: KnowledgeSubPoint[]
): { modules: KnowledgeModule[]; subPoints: KnowledgeSubPoint[] } => {
  const fixedModuleIds = new Set(DEFAULT_MODULES.map((item) => item.id));

  const normalizedModules = DEFAULT_MODULES.map((base) => {
    const matched = modules.find(
      (item) => item.id === base.id || resolveFixedModuleId(item.id) === base.id || resolveFixedModuleId(item.name) === base.id
    );

    if (!matched) return base;
    return {
      ...base,
      level: matched.level > 0 ? matched.level : 1,
      exp: matched.exp >= 0 ? matched.exp : 0,
      totalExp: matched.totalExp >= 0 ? matched.totalExp : 0,
    };
  });

  const normalizedSubPoints = safeArray<KnowledgeSubPoint>(subPoints)
    .map((item) => {
      const fromModule = modules.find((module) => module.id === item.moduleId);
      const mappedId =
        (fixedModuleIds.has(item.moduleId) ? item.moduleId : '') ||
        resolveFixedModuleId(item.moduleId) ||
        resolveFixedModuleId(fromModule?.name ?? '') ||
        'implementation';

      return {
        ...item,
        moduleId: fixedModuleIds.has(mappedId) ? mappedId : 'implementation',
      };
    })
    .filter((item) => !!item.name?.trim());

  const seen = new Set(normalizedSubPoints.map((item) => normalizeKnowledgeKey(item.name)));
  const mergedSubPoints = [...normalizedSubPoints];
  for (const item of DEFAULT_SUBPOINTS) {
    const key = normalizeKnowledgeKey(item.name);
    if (seen.has(key)) continue;
    mergedSubPoints.push(item);
    seen.add(key);
  }

  return {
    modules: normalizedModules,
    subPoints: mergedSubPoints,
  };
};

const getDifficultyLabel = (difficulty: ProblemDifficulty) => DIFFICULTY_LABEL_MAP[difficulty];

const normalizeDifficultyForColorScale = (difficulty?: ProblemDifficulty): ProblemDifficulty => {
  if (!difficulty) return 'green';
  if (difficulty === 'water' || difficulty === 'template') return 'orange';
  return difficulty;
};

const isLuoguSource = (source: string) => {
  const normalized = source.trim().toLowerCase();
  return normalized.includes('luogu') || source.includes('洛谷');
};

const inferLuoguDifficulty = (text: string): ProblemDifficulty | undefined => {
  const normalized = text.replace(/\s+/g, '').toLowerCase();

  if (/(入门|beginner)/i.test(text)) return 'water';
  if (/(普及\-|普及-提高|提高\-|普及组|noip普及|提高组初阶|提高组)/i.test(text)) return 'orange';
  if (/(普及\+|普及\/?提高\-|提高-)/i.test(text)) return 'yellow';
  if (/(提高\+|省选\-|普及\+\/?提高)/i.test(text)) return 'green';
  if (/(省选\/?noi\-|noi\-|noi-)/i.test(text)) return 'blue';
  if (/(noi\+|ctsc|apio|ioi|省选\+|noi\+\/ctsc)/i.test(text)) return 'purple';

  if (normalized.includes('p1000') || normalized.includes('p1001')) return 'water';
  return undefined;
};

const resolveDifficultyBySource = (payload: {
  source: string;
  title: string;
  solution: string;
}): ProblemDifficulty | undefined => {
  if (!isLuoguSource(payload.source)) return undefined;
  const candidateText = `${payload.title} ${payload.solution} ${payload.source}`;
  return inferLuoguDifficulty(candidateText);
};

const mapCfRatingToDifficulty = (rating?: number): ProblemDifficulty => {
  if (!rating || rating <= 0) return 'green';
  if (rating < 1000) return 'water';
  if (rating < 1400) return 'orange';
  if (rating < 1700) return 'yellow';
  if (rating < 2000) return 'green';
  if (rating < 2400) return 'blue';
  return 'purple';
};

const resolveModuleNameByTag = (
  rawTag: string,
  modules: KnowledgeModule[],
  subPoints: KnowledgeSubPoint[]
) => {
  const normalized = normalizeTagKey(rawTag);
  if (!normalized) return rawTag;

  const moduleById = new Map(modules.map((item) => [item.id, item]));

  const exactModule = modules.find((item) => normalizeKnowledgeKey(item.name) === normalized);
  if (exactModule) return exactModule.name;

  const exactSubPoint = subPoints.find((item) => normalizeKnowledgeKey(item.name) === normalized);
  if (exactSubPoint) {
    const module = moduleById.get(exactSubPoint.moduleId);
    return module?.name ?? rawTag;
  }

  const hintedIds = CF_TAG_MODULE_HINTS[normalized] ?? [];
  for (const moduleId of hintedIds) {
    const module = moduleById.get(moduleId);
    if (module) return module.name;
  }

  const fuzzyModule = modules.find((item) => {
    const moduleKey = normalizeKnowledgeKey(item.name);
    return moduleKey.includes(normalized) || normalized.includes(moduleKey);
  });
  if (fuzzyModule) return fuzzyModule.name;

  const implementation = moduleById.get('implementation');
  if (implementation) return implementation.name;
  const greedy = moduleById.get('greedy_constructive');
  if (greedy) return greedy.name;

  return modules[0]?.name ?? rawTag;
};

const safeArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const trimOrEmpty = (value: string) => value.trim();

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) return hexColor;

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const stripHtml = (text: string) => text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const parseDurationSeconds = (text: string) => {
  const lower = text.toLowerCase();
  const hourMatch = lower.match(/(\d+)\s*h/);
  const minuteMatch = lower.match(/(\d+)\s*(m|min)/);
  const hmOnlyMatch = lower.trim().match(/^(\d{1,2}):(\d{2})$/);
  const cnHourMatch = text.match(/(\d+)\s*小时/);
  const cnMinuteMatch = text.match(/(\d+)\s*分钟/);

  if (hmOnlyMatch) {
    return Number(hmOnlyMatch[1]) * 3600 + Number(hmOnlyMatch[2]) * 60;
  }

  const hours = hourMatch ? Number(hourMatch[1]) : cnHourMatch ? Number(cnHourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : cnMinuteMatch ? Number(cnMinuteMatch[1]) : 0;
  const seconds = hours * 3600 + minutes * 60;
  return seconds > 0 ? seconds : undefined;
};

const normalizeEpochSeconds = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
};

const parseTimeToSeconds = (raw: string) => {
  const normalized = raw
    .replace(/年|\./g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/\//g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return undefined;
  return Math.floor(date.getTime() / 1000);
};

const parseAtCoderUpcomingFromHtml = (html: string): UpcomingContest[] => {
  const sectionMatch = html.match(/id="contest-table-upcoming"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i);
  if (!sectionMatch) return [];

  const rows = sectionMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const result: UpcomingContest[] = [];

  for (const row of rows) {
    const timeText = stripHtml((row.match(/<time[^>]*>([\s\S]*?)<\/time>/i)?.[1] ?? ''));
    const start = parseTimeToSeconds(timeText);
    const nameMatch = row.match(/<a[^>]*href="([^"]*\/contests\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    const tds = row.match(/<td[\s\S]*?<\/td>/gi) ?? [];
    const durationText = tds[2] ? stripHtml(tds[2]) : '';

    if (!start || !nameMatch) continue;
    result.push({
      id: `atcoder-${start}-${stripHtml(nameMatch[2])}`,
      source: 'AtCoder',
      name: stripHtml(nameMatch[2]),
      startTimeSeconds: start,
      durationSeconds: parseDurationSeconds(durationText),
      url: `https://atcoder.jp${nameMatch[1]}`,
    });
  }

  return result;
};

const parseNowCoderUpcomingFromHtml = (html: string): UpcomingContest[] => {
  const anchors = [...html.matchAll(/<a[^>]*href="([^"]*\/acm\/contest\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const result: UpcomingContest[] = [];

  for (const anchor of anchors) {
    const href = anchor[1];
    const name = stripHtml(anchor[2]);
    if (!name || name.length < 2) continue;

    const startIndex = Math.max(0, (anchor.index ?? 0) - 240);
    const endIndex = Math.min(html.length, (anchor.index ?? 0) + 360);
    const context = stripHtml(html.slice(startIndex, endIndex));
    const timeMatch = context.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}[日\s]+\d{1,2}:\d{2})/);
    const start = timeMatch ? parseTimeToSeconds(timeMatch[1]) : undefined;
    const duration = parseDurationSeconds(context);

    if (!start) continue;
    result.push({
      id: `nowcoder-${start}-${name}`,
      source: 'NowCoder',
      name,
      startTimeSeconds: start,
      durationSeconds: duration,
      url: href.startsWith('http') ? href : `https://ac.nowcoder.com${href}`,
    });
  }

  return result;
};

const parseLuoguUpcomingFromHtml = (html: string): UpcomingContest[] => {
  const result: UpcomingContest[] = [];
  const jsonLikeMatches = [...html.matchAll(/"id":(\d+)[\s\S]*?"name":"([^"]+?)"[\s\S]*?"startTime":(\d+)[\s\S]*?"endTime":(\d+)/g)];

  for (const match of jsonLikeMatches) {
    const contestId = match[1];
    const name = match[2].replace(/\\u[0-9a-fA-F]{4}/g, (token) =>
      String.fromCharCode(parseInt(token.slice(2), 16))
    );
    const start = normalizeEpochSeconds(Number(match[3]));
    const end = normalizeEpochSeconds(Number(match[4]));
    const duration = end > start ? end - start : undefined;
    if (!start || start < Math.floor(Date.now() / 1000)) continue;

    result.push({
      id: `luogu-${contestId}`,
      source: 'Luogu',
      name,
      startTimeSeconds: start,
      durationSeconds: duration,
      url: `https://www.luogu.com.cn/contest/${contestId}`,
    });
  }

  return result;
};

const mapToBarData = (entries: Array<{ label: string; value: number }>, color: string) => {
  return entries.map((item) => ({
    value: item.value,
    label: item.label,
    frontColor: color,
  }));
};

const buildLineData = (values: number[]) => {
  return values.map((value, index) => ({
    value,
    label: index % 4 === 0 ? `${index + 1}` : '',
  }));
};

const HEATMAP_DAYS = 84;
const HEATMAP_Y_AXIS_WIDTH = 32;
const HEATMAP_GRID_GAP = 1;
const TAG_CALLOUT_HEIGHT = 280;

export function useCompetitiveProgrammingScreen() {
  const colorScheme = useColorScheme();
  const theme = (colorScheme ?? 'light') as ThemeType;
  const palette = Colors[theme];
  const chartWidth = Dimensions.get('window').width - 90;

  const [cfHandle, setCfHandle] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [cfUser, setCfUser] = useState<CFUserInfo | null>(null);
  const [cfRating, setCfRating] = useState<CFRatingRecord[]>([]);
  const [cfSubmissions, setCfSubmissions] = useState<CFSubmission[]>([]);
  const [upcomingContests, setUpcomingContests] = useState<UpcomingContest[]>([]);
  const [contestSolveMap, setContestSolveMap] = useState<Record<number, ContestSolveSummary>>({});
  const [selectedUpcomingIds, setSelectedUpcomingIds] = useState<Record<string, boolean>>({});
  const [isAddingUpcoming, setIsAddingUpcoming] = useState(false);
  const [upcomingActionText, setUpcomingActionText] = useState('');

  const [feedbackRecords, setFeedbackRecords] = useState<ProblemFeedback[]>([]);
  const [knowledgeModules, setKnowledgeModules] = useState<KnowledgeModule[]>(DEFAULT_MODULES);
  const [knowledgeSubPoints, setKnowledgeSubPoints] = useState<KnowledgeSubPoint[]>(DEFAULT_SUBPOINTS);
  const [feedbackSource, setFeedbackSource] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackAlgorithms, setFeedbackAlgorithms] = useState('');
  const [feedbackDifficulty, setFeedbackDifficulty] = useState<ProblemDifficulty | ''>('');
  const [letLLMInferAlgorithms, setLetLLMInferAlgorithms] = useState(true);
  const [letLLMInferDifficulty, setLetLLMInferDifficulty] = useState(true);
  const [feedbackSolution, setFeedbackSolution] = useState('');
  const [feedbackStatusText, setFeedbackStatusText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [newSubPointName, setNewSubPointName] = useState('');
  const [newSubPointModuleId, setNewSubPointModuleId] = useState('');

  const addTask = useTaskStore((state) => state.addTask);
  const tasks = useTaskStore((state) => state.tasks) || [];
  const { session } = useUserStore();

  useEffect(() => {
    const bootstrap = async () => {
      const [savedHandle, savedFeedbackRaw, savedKnowledgeRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_CF_HANDLE),
        AsyncStorage.getItem(STORAGE_CP_FEEDBACK),
        AsyncStorage.getItem(STORAGE_CP_KNOWLEDGE),
      ]);

      if (savedHandle) {
        setCfHandle(savedHandle);
      }

      if (savedFeedbackRaw) {
        const parsed = safeArray<ProblemFeedback>(JSON.parse(savedFeedbackRaw));
        setFeedbackRecords(parsed);
      }

      if (savedKnowledgeRaw) {
        const parsed = JSON.parse(savedKnowledgeRaw) as {
          modules?: KnowledgeModule[];
          subPoints?: KnowledgeSubPoint[];
        } | KnowledgeSubPoint[];

        if (Array.isArray(parsed)) {
          const normalized = normalizeKnowledgeSystem(DEFAULT_MODULES, parsed);
          setKnowledgeModules(normalized.modules);
          setKnowledgeSubPoints(normalized.subPoints);
        } else {
          const modules = safeArray<KnowledgeModule>(parsed?.modules);
          const subPoints = safeArray<KnowledgeSubPoint>(parsed?.subPoints);
          const normalized = normalizeKnowledgeSystem(modules, subPoints);
          setKnowledgeModules(normalized.modules);
          setKnowledgeSubPoints(normalized.subPoints);
        }
      }
    };

    void bootstrap();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const syncHandle = async () => {
        const [savedHandle, savedFeedbackRaw, savedKnowledgeRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_CF_HANDLE),
          AsyncStorage.getItem(STORAGE_CP_FEEDBACK),
          AsyncStorage.getItem(STORAGE_CP_KNOWLEDGE),
        ]);
        const normalized = trimOrEmpty(savedHandle ?? '');
        setCfHandle((prev) => (prev === normalized ? prev : normalized));

        if (savedFeedbackRaw) {
          const parsed = safeArray<ProblemFeedback>(JSON.parse(savedFeedbackRaw));
          setFeedbackRecords(parsed);
        }

        if (savedKnowledgeRaw) {
          const parsed = JSON.parse(savedKnowledgeRaw) as {
            modules?: KnowledgeModule[];
            subPoints?: KnowledgeSubPoint[];
          } | KnowledgeSubPoint[];

          if (Array.isArray(parsed)) {
            const normalized = normalizeKnowledgeSystem(DEFAULT_MODULES, parsed);
            setKnowledgeModules(normalized.modules);
            setKnowledgeSubPoints(normalized.subPoints);
          } else {
            const modules = safeArray<KnowledgeModule>(parsed?.modules);
            const subPoints = safeArray<KnowledgeSubPoint>(parsed?.subPoints);
            const normalized = normalizeKnowledgeSystem(modules, subPoints);
            setKnowledgeModules(normalized.modules);
            setKnowledgeSubPoints(normalized.subPoints);
          }
        }
      };

      void syncHandle();
    }, [])
  );

  useEffect(() => {
    if (knowledgeModules.length === 0) {
      setNewSubPointModuleId('');
      return;
    }
    if (!newSubPointModuleId || !knowledgeModules.some((item) => item.id === newSubPointModuleId)) {
      setNewSubPointModuleId(knowledgeModules[0].id);
    }
  }, [knowledgeModules, newSubPointModuleId]);

  useEffect(() => {
    if (!cfHandle) return;
    void refreshCFDashboard(cfHandle);
  }, [cfHandle]);

  useEffect(() => {
    const persistDailySnapshot = async () => {
      try {
        const dateKey = getLocalDateKey();
        const snapshot: CPDailySnapshot = {
          dateKey,
          feedbackCount: feedbackRecords.length,
          moduleTotalExp: knowledgeModules.reduce((sum, item) => sum + (item.totalExp || 0), 0),
          subPointTotalExp: knowledgeSubPoints.reduce((sum, item) => sum + (item.totalExp || 0), 0),
          updatedAt: new Date().toISOString(),
        };

        const existingRaw = await AsyncStorage.getItem(STORAGE_CP_DAILY_SNAPSHOT);
        const existing = existingRaw ? safeArray<CPDailySnapshot>(JSON.parse(existingRaw)) : [];
        const index = existing.findIndex((item) => item.dateKey === dateKey);
        const next = [...existing];
        if (index >= 0) next[index] = snapshot;
        else next.unshift(snapshot);

        await AsyncStorage.setItem(STORAGE_CP_DAILY_SNAPSHOT, JSON.stringify(next.slice(0, 180)));
      } catch (error) {
        console.warn('Failed to persist CP daily snapshot:', error);
      }
    };

    void persistDailySnapshot();
  }, [feedbackRecords, knowledgeModules, knowledgeSubPoints]);

  useEffect(() => {
    setSelectedUpcomingIds((prev) => {
      const valid = new Set(upcomingContests.map((item) => item.id));
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (valid.has(key) && value) {
          next[key] = true;
        }
      }
      return next;
    });
  }, [upcomingContests]);

  const buildCFUrl = (method: string, params: Record<string, string>) => {
    const query = new URLSearchParams(params);
    return `https://codeforces.com/api/${method}?${query.toString()}`;
  };

  const saveFeedbackRecords = async (next: ProblemFeedback[]) => {
    setFeedbackRecords(next);
    await AsyncStorage.setItem(STORAGE_CP_FEEDBACK, JSON.stringify(next));
  };

  const saveKnowledgeSystem = async (modules: KnowledgeModule[], subPoints: KnowledgeSubPoint[]) => {
    const normalized = normalizeKnowledgeSystem(modules, subPoints);
    setKnowledgeModules(normalized.modules);
    setKnowledgeSubPoints(normalized.subPoints);
    await AsyncStorage.setItem(
      STORAGE_CP_KNOWLEDGE,
      JSON.stringify({ modules: normalized.modules, subPoints: normalized.subPoints })
    );
  };

  const ensureModule = (modules: KnowledgeModule[], name: string) => {
    const fixedId = resolveFixedModuleId(name) || 'implementation';
    const existed = modules.find((item) => item.id === fixedId);
    if (existed) return { modules, moduleId: existed.id };
    const fallback = DEFAULT_MODULES.find((item) => item.id === fixedId) ?? DEFAULT_MODULES[0];
    if (!fallback) return { modules, moduleId: '' };
    return { modules: [...modules, fallback], moduleId: fallback.id };
  };

  const ensureSubPoints = (
    modules: KnowledgeModule[],
    subPoints: KnowledgeSubPoint[],
    names: string[],
    fallbackModuleName = '自定义模块',
    contextText = ''
  ) => {
    let workingModules = [...modules];
    let workingSubPoints = [...subPoints];
    const createdNames: string[] = [];

    const fallback = ensureModule(workingModules, fallbackModuleName);
    workingModules = fallback.modules;
    const fallbackModuleId = fallback.moduleId;

    for (const rawName of names) {
      const normalizedName = normalizeAlgorithmName(rawName, contextText, workingSubPoints, workingModules);
      const normalized = normalizeKnowledgeKey(normalizedName);
      if (!normalized) continue;
      const existed = workingSubPoints.find((item) => normalizeKnowledgeKey(item.name) === normalized);
      if (existed) continue;

      const targetModuleId = resolveModuleIdForSubPointName(
        normalizedName,
        workingModules,
        workingSubPoints,
        fallbackModuleId
      );

      workingSubPoints.push({
        id: `s_${normalized}`,
        moduleId: targetModuleId,
        name: normalizedName,
        level: 1,
        exp: 0,
        totalExp: 0,
      });
      createdNames.push(normalizedName);
    }

    return { modules: workingModules, subPoints: workingSubPoints, createdNames };
  };

  const scoreWithFallback = (payload: {
    algorithms: string[];
    difficulty: ProblemDifficulty;
    isWater: boolean;
    subPoints: KnowledgeSubPoint[];
  }) => {
    const result: Record<string, number> = {};
    const base = DIFFICULTY_BASE_POINTS[payload.difficulty];
    if (base <= 0) {
      for (const algo of payload.algorithms) {
        result[algo] = 0;
      }
      return result;
    }

    for (const algo of payload.algorithms) {
      const normalized = normalizeKnowledgeKey(algo);
      const kp = payload.subPoints.find((item) => normalizeKnowledgeKey(item.name) === normalized);
      const level = kp?.level ?? 1;
      const levelDecay = Math.max(0.35, 1 - (level - 1) * 0.12);
      const gain = Math.max(1, Math.round(base * levelDecay));
      result[algo] = gain;
    }
    return result;
  };

  const scoreWithLLM = async (payload: {
    source: string;
    title: string;
    algorithms: string[];
    difficulty?: ProblemDifficulty;
    solution: string;
    modules: KnowledgeModule[];
    subPoints: KnowledgeSubPoint[];
    inferDifficulty: boolean;
    inferAlgorithms: boolean;
  }): Promise<{
    problemType: 'old' | 'new';
    difficulty: ProblemDifficulty;
    algorithms: string[];
    importantAlgorithms: string[];
    points: Record<string, number>;
    analysisReason: string;
    pointReason: string;
  }> => {
    try {
      const systemPrompt = `你是算法竞赛成长评估器。只输出 JSON。\n输入包含题目基础信息、题解信息、知识点等级。\n你需要自动判断题目类型 inferredProblemType(old/new)。\n判定原则：\n1) old 题：优先基于历史训练模式快速判断（来源、标题、难度档、知识点）；若有题解可参考但不强依赖。\n2) new 题：优先阅读题解内容判断难度与加点。\n3) 难度按颜色映射判断：orange=最简单，yellow=中等，green=偏难，blue=困难，purple=最难。\n4) 可输出 inferredDifficulty(必须在 water/template/orange/yellow/green/blue/purple 之一) 与 inferredAlgorithms(数组)。\n5) 额外输出 importantAlgorithms（数组）：从 inferredAlgorithms 中选出“本题十分重要”的知识点。\n6) 若 inferDifficulty=false，必须沿用传入 difficulty。\n7) 若 inferAlgorithms=false，必须沿用传入 algorithms。\n8) 若 difficulty=water，则 points 全部为0。\n9) 同知识点等级越高，同难度加点越少。\n10) 额外输出 analysisReason（题目分析理由，1-2句）与 pointReason（加点判断理由，1-2句）。\n输出格式：{ inferredProblemType, inferredDifficulty, inferredAlgorithms, importantAlgorithms, points, analysisReason, pointReason }`;
      const userPrompt = JSON.stringify(payload);
      const reply = await sendToDeepSeek([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
      const parsed = JSON.parse(reply.content || '{}') as {
        inferredProblemType?: 'old' | 'new';
        inferredDifficulty?: ProblemDifficulty;
        inferredAlgorithms?: string[];
        importantAlgorithms?: string[];
        points?: Record<string, number>;
        analysisReason?: string;
        pointReason?: string;
      };
      const normalizedAlgorithms = payload.inferAlgorithms
        ? (safeArray<string>(parsed.inferredAlgorithms).map((item) => item.trim()).filter(Boolean))
        : payload.algorithms;
      const parsedDifficulty = normalizeDifficultyForColorScale(parsed.inferredDifficulty);
      const resolvedDifficulty = payload.inferDifficulty
        ? (parsedDifficulty || normalizeDifficultyForColorScale(payload.difficulty) || 'green')
        : (normalizeDifficultyForColorScale(payload.difficulty) || 'green');
      const resolvedProblemType = parsed.inferredProblemType === 'old' || parsed.inferredProblemType === 'new'
        ? parsed.inferredProblemType
        : (payload.solution.trim() ? 'new' : 'old');
      const points = parsed.points ?? {};
      const importantAlgorithms = safeArray<string>(parsed.importantAlgorithms)
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => normalizedAlgorithms.some((algo) => normalizeKnowledgeKey(algo) === normalizeKnowledgeKey(item)));
      const normalized: Record<string, number> = {};
      for (const key of normalizedAlgorithms) {
        normalized[key] = Math.max(0, Math.round(Number(points[key] ?? 0)));
      }
      const analysisReason = typeof parsed.analysisReason === 'string' && parsed.analysisReason.trim()
        ? parsed.analysisReason.trim()
        : `按${resolvedProblemType === 'new' ? '题解信息' : '题目元信息'}判定题型为${resolvedProblemType}，难度归为${getDifficultyLabel(resolvedDifficulty)}。`;
      const totalGain = Object.values(normalized).reduce((sum, value) => sum + value, 0);
      const pointReason = typeof parsed.pointReason === 'string' && parsed.pointReason.trim()
        ? parsed.pointReason.trim()
        : totalGain > 0
          ? `基于难度档和知识点熟练度衰减进行加点，本次总加点 +${totalGain}。`
          : '该题判定为水题或低收益场景，本次不加点。';
      return {
        problemType: resolvedProblemType,
        difficulty: resolvedDifficulty,
        algorithms: normalizedAlgorithms,
        importantAlgorithms,
        points: normalized,
        analysisReason,
        pointReason,
      };
    } catch {
      const resolvedDifficulty = normalizeDifficultyForColorScale(payload.difficulty) || 'green';
      const resolvedAlgorithms = payload.algorithms;
      const fallbackPoints = scoreWithFallback({
        algorithms: resolvedAlgorithms,
        difficulty: resolvedDifficulty,
        isWater: resolvedDifficulty === 'water',
        subPoints: payload.subPoints,
      });
      const fallbackTotal = Object.values(fallbackPoints).reduce((sum, value) => sum + value, 0);
      return {
        problemType: payload.solution.trim() ? 'new' : 'old',
        difficulty: resolvedDifficulty,
        algorithms: resolvedAlgorithms,
        importantAlgorithms: [],
        points: fallbackPoints,
        analysisReason: `网络或解析异常，使用本地规则兜底：题型按${payload.solution.trim() ? 'new' : 'old'}判断，难度归为${getDifficultyLabel(resolvedDifficulty)}。`,
        pointReason: fallbackTotal > 0
          ? `按难度基础分与知识点等级衰减进行本地加点，本次总加点 +${fallbackTotal}。`
          : '按本地规则判定本次不加点（例如水题）。',
      };
    }
  };

  const applyKnowledgeProgress = (
    modules: KnowledgeModule[],
    subPoints: KnowledgeSubPoint[],
    points: Record<string, number>
  ) => {
    const moduleGainMap = new Map<string, number>();

    const nextSubPoints = subPoints.map((kp) => {
      const names = Object.keys(points);
      const matchedName = names.find((name) => normalizeKnowledgeKey(name) === normalizeKnowledgeKey(kp.name));
      if (!matchedName) return kp;

      const rawGain = Math.max(0, points[matchedName]);
      const levelDecay = Math.max(0.35, 1 - (kp.level - 1) * 0.1);
      let appliedGain = Math.max(0, Math.round(rawGain * levelDecay));

      let nextExp = kp.exp + appliedGain;
      let nextLevel = kp.level;
      while (nextExp >= subLevelThreshold(nextLevel)) {
        nextExp -= subLevelThreshold(nextLevel);
        nextLevel += 1;
      }

      const moduleGain = Math.max(0, Math.round(appliedGain * 0.4));
      moduleGainMap.set(kp.moduleId, (moduleGainMap.get(kp.moduleId) ?? 0) + moduleGain);

      return {
        ...kp,
        level: nextLevel,
        exp: nextExp,
        totalExp: kp.totalExp + appliedGain,
      };
    });

    const nextModules = modules.map((module) => {
      const gain = moduleGainMap.get(module.id) ?? 0;
      if (gain <= 0) return module;

      let nextExp = module.exp + gain;
      let nextLevel = module.level;
      while (nextExp >= moduleLevelThreshold(nextLevel)) {
        nextExp -= moduleLevelThreshold(nextLevel);
        nextLevel += 1;
      }

      return {
        ...module,
        level: nextLevel,
        exp: nextExp,
        totalExp: module.totalExp + gain,
      };
    });

    return { modules: nextModules, subPoints: nextSubPoints };
  };

  const submitProblemFeedback = async () => {
    const source = feedbackSource.trim();
    const title = feedbackTitle.trim();
    const inputKnowledge = feedbackAlgorithms
      .split(/[,，\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const solvedSummary = feedbackSolution.trim();
    const isManualWater = !letLLMInferDifficulty && feedbackDifficulty === 'water';

    if (!letLLMInferDifficulty && !feedbackDifficulty) {
      setFeedbackStatusText('已关闭难度自动判断时，请先选择一个 Problem Rating 难度档。');
      return;
    }

    if (!letLLMInferAlgorithms && inputKnowledge.length === 0) {
      setFeedbackStatusText('已关闭自动判断时，请手动填写至少一个知识点/算法点。');
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackStatusText('');

    try {
      const contextText = `${title} ${solvedSummary}`.trim();
      const normalizedInputKnowledge = normalizeAlgorithmList(inputKnowledge, contextText, knowledgeSubPoints, knowledgeModules);

      const ensured = ensureSubPoints(knowledgeModules, knowledgeSubPoints, normalizedInputKnowledge, '自定义模块', contextText);
      const llmResult = await scoreWithLLM({
        source,
        title,
        algorithms: normalizedInputKnowledge,
        difficulty: feedbackDifficulty || undefined,
        solution: solvedSummary,
        modules: ensured.modules,
        subPoints: ensured.subPoints,
        inferDifficulty: letLLMInferDifficulty,
        inferAlgorithms: letLLMInferAlgorithms,
      });

      const resolvedDifficulty = llmResult.difficulty || 'green';
      const rawResolvedAlgorithms = llmResult.algorithms.length > 0 ? llmResult.algorithms : normalizedInputKnowledge;
      const resolvedAlgorithms = normalizeAlgorithmList(rawResolvedAlgorithms, contextText, ensured.subPoints, ensured.modules);
      const isWater = resolvedDifficulty === 'water';
      const ensuredWithResolved = ensureSubPoints(ensured.modules, ensured.subPoints, resolvedAlgorithms, '自定义模块', contextText);
      const fallbackForResolved = scoreWithFallback({
        algorithms: resolvedAlgorithms,
        difficulty: resolvedDifficulty,
        isWater,
        subPoints: ensuredWithResolved.subPoints,
      });

      const mappedLLMPoints: Record<string, number> = {};
      const llmPointEntries = Object.entries(llmResult.points || {});
      for (const algorithm of resolvedAlgorithms) {
        const algorithmKey = normalizeKnowledgeKey(algorithm);
        const candidates = llmPointEntries
          .filter(([key]) => normalizeKnowledgeKey(normalizeAlgorithmName(key, contextText, ensuredWithResolved.subPoints, ensuredWithResolved.modules)) === algorithmKey)
          .map(([, value]) => Math.max(0, Math.round(Number(value ?? 0))));
        mappedLLMPoints[algorithm] = candidates.length > 0 ? Math.max(...candidates) : 0;
      }

      const alignedPoints = Object.keys(llmResult.points).length > 0
        ? mappedLLMPoints
        : fallbackForResolved;

      const createdNormalized = new Set(ensuredWithResolved.createdNames.map((item) => normalizeKnowledgeKey(item)));
      for (const important of llmResult.importantAlgorithms || []) {
        const importantKey = normalizeKnowledgeKey(important);
        const matchedAlgo = resolvedAlgorithms.find((algo) => normalizeKnowledgeKey(algo) === importantKey);
        if (!matchedAlgo) continue;

        const wasCreated = createdNormalized.has(importantKey);
        const currentPoint = alignedPoints[matchedAlgo] ?? 0;
        const fallbackPoint = fallbackForResolved[matchedAlgo] ?? 0;

        if (wasCreated && currentPoint <= 0 && fallbackPoint > 0) {
          alignedPoints[matchedAlgo] = fallbackPoint;
        }
      }

      const record: ProblemFeedback = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        source,
        title,
        problemType: llmResult.problemType,
        algorithms: resolvedAlgorithms,
        difficulty: resolvedDifficulty,
        isWater,
        solution: solvedSummary,
        createdAt: new Date().toISOString(),
        points: alignedPoints,
        inferredByLLM: letLLMInferAlgorithms || letLLMInferDifficulty,
        analysisReason: llmResult.analysisReason,
        pointReason: llmResult.pointReason,
      };

      const updatedKnowledge = applyKnowledgeProgress(ensuredWithResolved.modules, ensuredWithResolved.subPoints, alignedPoints);
      const nextRecords = [record, ...feedbackRecords].slice(0, 300);
      await Promise.all([
        saveFeedbackRecords(nextRecords),
        saveKnowledgeSystem(updatedKnowledge.modules, updatedKnowledge.subPoints),
      ]);

      const totalGain = Object.values(alignedPoints).reduce((sum, value) => sum + value, 0);
      setFeedbackStatusText(totalGain > 0 ? `提交成功，本次总加点 +${totalGain}` : '提交成功，水题不加点。');
      setFeedbackTitle('');
      setFeedbackAlgorithms('');
      setFeedbackSolution('');
      setFeedbackDifficulty('');
    } catch (error) {
      setFeedbackStatusText('提交失败，请稍后重试。');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const addSubPoint = async () => {
    const name = newSubPointName.trim();
    if (!name || !newSubPointModuleId) return;
    const existing = knowledgeSubPoints.find((item) => normalizeKnowledgeKey(item.name) === normalizeKnowledgeKey(name));
    if (existing) {
      setFeedbackStatusText('该小知识点已存在。');
      return;
    }
    const next = [
      ...knowledgeSubPoints,
      {
        id: `s_${normalizeKnowledgeKey(`${name}_${newSubPointModuleId}`)}`,
        moduleId: newSubPointModuleId,
        name,
        level: 1,
        exp: 0,
        totalExp: 0,
      },
    ];
    await saveKnowledgeSystem(knowledgeModules, next);
    setNewSubPointName('');
  };

  const renameSubPoint = async (id: string, name: string) => {
    const next = knowledgeSubPoints.map((item) => (item.id === id ? { ...item, name } : item));
    await saveKnowledgeSystem(knowledgeModules, next);
  };

  const deleteSubPoint = async (id: string) => {
    const next = knowledgeSubPoints.filter((item) => item.id !== id);
    await saveKnowledgeSystem(knowledgeModules, next);
  };

  const fetchCF = async <T,>(method: string, params: Record<string, string>): Promise<T> => {
    const url = buildCFUrl(method, params);
    const response = await fetch(url);
    const data = (await response.json()) as CFApiResponse<T>;

    if (data.status !== 'OK') {
      throw new Error(data.comment ?? `${method} 请求失败`);
    }

    if (typeof data.result === 'undefined') {
      throw new Error(`${method} 返回结果为空`);
    }

    return data.result;
  };

  const buildContestSolveMapFromSubmissions = (submissions: CFSubmission[]) => {
    const map = new Map<number, { solvedSet: Set<string>; attemptedSet: Set<string> }>();

    for (const item of submissions) {
      if (!item.contestId || !item.problem?.index) continue;
      const exist = map.get(item.contestId) ?? { solvedSet: new Set<string>(), attemptedSet: new Set<string>() };
      exist.attemptedSet.add(item.problem.index);
      if (item.verdict === 'OK') {
        exist.solvedSet.add(item.problem.index);
      }
      map.set(item.contestId, exist);
    }

    const result: Record<number, ContestSolveSummary> = {};
    for (const [contestId, value] of map.entries()) {
      result[contestId] = {
        solved: value.solvedSet.size,
        attempted: value.attemptedSet.size,
        total: null,
      };
    }
    return result;
  };

  const fetchContestSolveStats = async (
    handle: string,
    recentRatings: CFRatingRecord[],
    submissions: CFSubmission[]
  ) => {
    const submissionFallback = buildContestSolveMapFromSubmissions(submissions);
    const recentContestIds = [...new Set(recentRatings.slice(-8).map((item) => item.contestId).filter(Boolean))];
    const enriched: Record<number, ContestSolveSummary> = { ...submissionFallback };

    await Promise.all(
      recentContestIds.map(async (contestId) => {
        try {
          const standings = await fetchCF<CFStandingsResult>('contest.standings', {
            contestId: String(contestId),
            from: '1',
            count: '1',
            handles: handle,
            showUnofficial: 'true',
          });

          const row = standings.rows?.[0];
          const results = row?.problemResults ?? [];
          const solved = results.filter((item) => (item.points ?? 0) > 0).length;
          const attempted = results.filter(
            (item) => (item.points ?? 0) > 0 || (item.rejectedAttemptCount ?? 0) > 0
          ).length;

          enriched[contestId] = {
            solved,
            attempted,
            total: standings.problems?.length ?? null,
          };
        } catch {
          if (!enriched[contestId]) {
            enriched[contestId] = { solved: 0, attempted: 0, total: null };
          }
        }
      })
    );

    setContestSolveMap(enriched);
  };

  const fetchExternalUpcomingContests = async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const tasks = [
      fetch('https://atcoder.jp/contests/').then((response) => response.text()),
      fetch('https://ac.nowcoder.com/acm/contest/vip-index').then((response) => response.text()),
      fetch('https://www.luogu.com.cn/contest/list').then((response) => response.text()),
    ];

    const settled = await Promise.allSettled(tasks);
    const result: UpcomingContest[] = [];

    const atcoderHtml = settled[0].status === 'fulfilled' ? settled[0].value : '';
    const nowcoderHtml = settled[1].status === 'fulfilled' ? settled[1].value : '';
    const luoguHtml = settled[2].status === 'fulfilled' ? settled[2].value : '';

    result.push(...parseAtCoderUpcomingFromHtml(atcoderHtml));
    result.push(...parseNowCoderUpcomingFromHtml(nowcoderHtml));
    result.push(...parseLuoguUpcomingFromHtml(luoguHtml));

    const dedup = new Map<string, UpcomingContest>();
    for (const item of result) {
      if (item.startTimeSeconds <= nowSeconds) continue;
      const key = `${item.source}-${item.name}-${item.startTimeSeconds}`;
      dedup.set(key, item);
    }

    return [...dedup.values()];
  };

  const refreshCFDashboard = async (handle: string) => {
    setLoading(true);
    setErrorText('');

    try {
      const [infoResult, ratingResult, statusResult, contestList, externalUpcoming] = await Promise.all([
        fetchCF<CFUserInfo[]>('user.info', { handles: handle }),
        fetchCF<CFRatingRecord[]>('user.rating', { handle }),
        fetchCF<CFSubmission[]>('user.status', { handle, from: '1', count: '300' }),
        fetchCF<CFContest[]>('contest.list', { gym: 'false' }),
        fetchExternalUpcomingContests(),
      ]);

      const safeRatings = safeArray<CFRatingRecord>(ratingResult);
      const safeSubmissions = safeArray<CFSubmission>(statusResult);
      const nowSeconds = Math.floor(Date.now() / 1000);
      const cfUpcoming: UpcomingContest[] = safeArray<CFContest>(contestList)
        .filter((item) => item.phase === 'BEFORE' && (item.startTimeSeconds ?? 0) > nowSeconds)
        .sort((a, b) => (a.startTimeSeconds ?? 0) - (b.startTimeSeconds ?? 0))
        .map((item) => ({
          id: `cf-${item.id}`,
          source: 'Codeforces' as const,
          name: item.name,
          startTimeSeconds: item.startTimeSeconds ?? 0,
          durationSeconds: item.durationSeconds,
          url: `https://codeforces.com/contests/${item.id}`,
        }));

      const mergedUpcoming = [...cfUpcoming, ...externalUpcoming]
        .filter((item) => item.startTimeSeconds > nowSeconds)
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
        .slice(0, 14);

      setCfUser(infoResult[0] ?? null);
      setCfRating(safeRatings);
      setCfSubmissions(safeSubmissions);
      setUpcomingContests(mergedUpcoming);
      await fetchContestSolveStats(handle, safeRatings, safeSubmissions);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '拉取 Codeforces 数据失败');
      setCfUser(null);
      setCfRating([]);
      setCfSubmissions([]);
      setUpcomingContests([]);
      setContestSolveMap({});
    } finally {
      setLoading(false);
    }
  };

  const cfAccepted = cfSubmissions.filter((item) => item.verdict === 'OK').length;
  const cfAttempted = cfSubmissions.length;

  const globalActivityEntries = useMemo(() => {
    const cfEntries = cfSubmissions.map((item) => ({
      timestamp: item.creationTimeSeconds * 1000,
      tags: item.problem?.tags ?? [],
    }));
    const feedbackEntries = feedbackRecords.map((item) => ({
      timestamp: new Date(item.createdAt).getTime(),
      tags: item.algorithms,
    }));
    return [...cfEntries, ...feedbackEntries];
  }, [cfSubmissions, feedbackRecords]);

  const totalKnowledgeExp = useMemo(() => {
    const moduleExp = knowledgeModules.reduce((sum, item) => sum + item.totalExp, 0);
    const subPointExp = knowledgeSubPoints.reduce((sum, item) => sum + item.totalExp, 0);
    return moduleExp + subPointExp;
  }, [knowledgeModules, knowledgeSubPoints]);

  const subPointsByModule = useMemo(() => {
    const grouped = new Map<string, KnowledgeSubPoint[]>();
    for (const module of knowledgeModules) {
      grouped.set(module.id, []);
    }
    for (const subPoint of knowledgeSubPoints) {
      const list = grouped.get(subPoint.moduleId) ?? [];
      list.push(subPoint);
      grouped.set(subPoint.moduleId, list);
    }
    for (const [moduleId, list] of grouped.entries()) {
      grouped.set(
        moduleId,
        list.slice().sort((a, b) => {
          if (b.totalExp !== a.totalExp) return b.totalExp - a.totalExp;
          return a.name.localeCompare(b.name);
        })
      );
    }
    return grouped;
  }, [knowledgeModules, knowledgeSubPoints]);

  const globalRank = useMemo(() => {
    if (totalKnowledgeExp >= 3200) return { name: 'Grandmaster', color: '#EA580C' };
    if (totalKnowledgeExp >= 2200) return { name: 'Master', color: '#DC2626' };
    if (totalKnowledgeExp >= 1400) return { name: 'Expert', color: '#7C3AED' };
    if (totalKnowledgeExp >= 800) return { name: 'Specialist', color: '#2563EB' };
    if (totalKnowledgeExp >= 300) return { name: 'Pupil', color: '#059669' };
    return { name: 'Newbie', color: '#6B7280' };
  }, [totalKnowledgeExp]);

  const contributionHeatmap = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(now);
    start.setDate(now.getDate() - (HEATMAP_DAYS - 1));

    const alignedStart = new Date(start);
    alignedStart.setDate(start.getDate() - start.getDay());

    const counts = new Map<string, number>();
    for (const item of globalActivityEntries) {
      const date = new Date(item.timestamp);
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
      if (last && last.label === label) {
        last.weeks += 1;
      } else {
        monthSpans.push({ label, weeks: 1 });
      }
    }

    const maxCount = Math.max(1, ...allDays.map((item) => item.count));
    const total = allDays.reduce((accumulator, item) => accumulator + item.count, 0);

    return {
      weeks,
      monthSpans,
      maxCount,
      total,
      startLabel: allDays[0]?.dateKey,
      endLabel: allDays[allDays.length - 1]?.dateKey,
    };
  }, [globalActivityEntries]);

  const ratingLineData = useMemo(() => {
    const recent = cfRating.slice(-30);
    return recent.map((item, index) => ({
      value: item.newRating,
      label:
        index % 5 === 0 || index === recent.length - 1
          ? new Date(item.ratingUpdateTimeSeconds * 1000).toLocaleDateString('zh-CN', {
              month: '2-digit',
              day: '2-digit',
            })
          : '',
    }));
  }, [cfRating]);

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

  const tagBoardWidth = useMemo(() => {
    return Math.max(320, chartWidth);
  }, [chartWidth]);

  const recentContests = useMemo(() => {
    return cfRating.slice(-5).reverse();
  }, [cfRating]);

  const solvedProblems = useMemo(() => {
    const solvedMap = new Map<string, CFSubmission['problem']>();

    for (const item of cfSubmissions) {
      if (item.verdict !== 'OK' || !item.problem) continue;
      const problemKey = `${item.contestId ?? 'global'}-${item.problem.index ?? 'X'}-${item.problem.name ?? 'Unknown'}`;
      if (!solvedMap.has(problemKey)) {
        solvedMap.set(problemKey, item.problem);
      }
    }

    return [...solvedMap.values()];
  }, [cfSubmissions]);

  const globalDifficultyStats = useMemo(() => {
    const difficultyMap = new Map<ProblemDifficulty, number>();

    for (const problem of solvedProblems) {
      const difficulty = mapCfRatingToDifficulty(problem?.rating);
      difficultyMap.set(difficulty, (difficultyMap.get(difficulty) ?? 0) + 1);
    }

    for (const record of feedbackRecords) {
      if (!record?.difficulty) continue;
      difficultyMap.set(record.difficulty, (difficultyMap.get(record.difficulty) ?? 0) + 1);
    }

    return DIFFICULTY_ORDER.map((difficulty) => ({
      label: getDifficultyLabel(difficulty),
      value: difficultyMap.get(difficulty) ?? 0,
    })).filter((item) => item.value > 0);
  }, [feedbackRecords, solvedProblems]);

  const unifiedTagEntries = useMemo(() => {
    const mergedTags: string[] = [];

    for (const problem of solvedProblems) {
      if (!problem) continue;
      const moduleTags = new Set<string>();
      for (const tag of problem.tags ?? []) {
        moduleTags.add(resolveModuleNameByTag(tag, knowledgeModules, knowledgeSubPoints));
      }
      mergedTags.push(...moduleTags);
    }

    for (const record of feedbackRecords) {
      const moduleTags = new Set<string>();
      for (const tag of record.algorithms ?? []) {
        moduleTags.add(resolveModuleNameByTag(tag, knowledgeModules, knowledgeSubPoints));
      }
      mergedTags.push(...moduleTags);
    }

    return mergedTags;
  }, [feedbackRecords, knowledgeModules, knowledgeSubPoints, solvedProblems]);

  const solvedTagStats = useMemo(() => {
    const tagMap = new Map<string, number>();

    for (const tag of unifiedTagEntries) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }

    return [...tagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [unifiedTagEntries]);

  const topTagStats = useMemo(() => solvedTagStats.slice(0, 12), [solvedTagStats]);

  const tagPieData = useMemo(() => {
    const normalized = palette.tint.replace('#', '');
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    let hue = 0;
    if (delta !== 0) {
      if (max === red) hue = ((green - blue) / delta) % 6;
      else if (max === green) hue = (blue - red) / delta + 2;
      else hue = (red - green) / delta + 4;
      hue = Math.round(hue * 60);
      if (hue < 0) hue += 360;
    }

    const total = Math.max(1, topTagStats.length);
    return topTagStats.map((item, index) => ({
      value: item.count,
      color: `hsl(${(hue + (index * 360) / total) % 360}, 70%, ${theme === 'dark' ? '55%' : '45%'})`,
      text: `${item.tag} ${item.count}`,
    }));
  }, [palette.tint, theme, topTagStats]);

  const tagCallouts = useMemo(() => {
    const slices = topTagStats.slice(0, 8);
    const total = Math.max(1, slices.reduce((sum, item) => sum + item.count, 0));
    const centerX = tagBoardWidth / 2;
    const centerY = TAG_CALLOUT_HEIGHT / 2;
    const lineStartRadius = (78 + 45) / 2;
    const lineEndRadius = 92;
    const labelRadius = 95;
    const labelWidth = 118;
    let acc = 0;

    return slices.map((item, index) => {
      const ratio = item.count / total;
      const angle = (acc + ratio / 2) * Math.PI * 2 - Math.PI / 2;
      acc += ratio;

      const startX = centerX + Math.cos(angle) * lineStartRadius;
      const startY = centerY + Math.sin(angle) * lineStartRadius;
      const endX = centerX + Math.cos(angle) * lineEndRadius;
      const endY = centerY + Math.sin(angle) * lineEndRadius;

      const isRight = Math.cos(angle) >= 0;
      const anchorX = centerX + Math.cos(angle) * labelRadius;
      const anchorY = centerY + Math.sin(angle) * labelRadius;
      const labelLeft = isRight ? anchorX + 1 : anchorX - labelWidth - 1;
      const labelTop = anchorY - 9;

      const lineLength = Math.max(8, Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2));
      const lineAngle = (Math.atan2(endY - startY, endX - startX) * 180) / Math.PI;
      const lineLeft = (startX + endX) / 2 - lineLength / 2;
      const lineTop = (startY + endY) / 2 - 0.75;

      return {
        key: `${item.tag}-${index}`,
        text: `${item.tag} ${item.count}`,
        color: tagPieData[index]?.color ?? palette.tint,
        startX,
        startY,
        endX,
        endY,
        labelLeft,
        labelTop,
        labelWidth,
        isRight,
        nudgeY: 0,
        lineLength,
        lineAngle,
        lineLeft,
        lineTop,
      };
    });
  }, [palette.tint, tagBoardWidth, tagPieData, topTagStats]);

  const getHeatColor = (count: number) => {
    if (count <= 0) return withAlpha(palette.border, 0.5);
    const ratio = count / contributionHeatmap.maxCount;
    if (ratio <= 0.25) return withAlpha(palette.tint, 0.25);
    if (ratio <= 0.5) return withAlpha(palette.tint, 0.45);
    if (ratio <= 0.75) return withAlpha(palette.tint, 0.65);
    return withAlpha(palette.tint, 0.9);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatRemaining = (startTimeSeconds?: number) => {
    if (!startTimeSeconds) return '-';
    const diff = startTimeSeconds - Math.floor(Date.now() / 1000);
    if (diff <= 0) return '即将开始';
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m 后`;
  };

  const toggleUpcomingSelection = (contestId: string) => {
    setSelectedUpcomingIds((prev) => ({
      ...prev,
      [contestId]: !prev[contestId],
    }));
  };

  const selectedUpcomingCount = useMemo(
    () => upcomingContests.filter((contest) => selectedUpcomingIds[contest.id]).length,
    [upcomingContests, selectedUpcomingIds]
  );

  const addSelectedUpcomingToSchedule = async () => {
    const selected = upcomingContests.filter((contest) => selectedUpcomingIds[contest.id]);
    if (selected.length === 0) {
      setUpcomingActionText('请先勾选至少一个比赛。');
      return;
    }

    setIsAddingUpcoming(true);
    setUpcomingActionText('');

    const userId = session?.user?.id || null;
    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const contest of selected) {
      try {
        const startDate = new Date(contest.startTimeSeconds * 1000);
        const title = `[比赛] ${contest.name}`;
        const duplicate = tasks.some((task) => {
          if (!task.start_time) return false;
          const diff = Math.abs(new Date(task.start_time).getTime() - startDate.getTime());
          return task.title === title && diff <= 60 * 1000;
        });

        if (duplicate) {
          skipped += 1;
          continue;
        }

        await addTask(
          {
            title,
            description: `${contest.source} 比赛${contest.url ? `｜${contest.url}` : ''}`,
            start_time: startDate.toISOString(),
            estimated_duration: contest.durationSeconds && contest.durationSeconds > 0 ? contest.durationSeconds : 2 * 3600,
            is_deadline: false,
            color: '#3B82F6',
            location: contest.source,
          },
          userId
        );
        added += 1;
      } catch {
        failed += 1;
      }
    }

    setSelectedUpcomingIds({});
    setIsAddingUpcoming(false);
    setUpcomingActionText(`已添加 ${added} 项，跳过重复 ${skipped} 项${failed > 0 ? `，失败 ${failed} 项` : ''}。`);
  };

  const currentRating = cfUser?.rating ?? (cfRating.length > 0 ? cfRating[cfRating.length - 1].newRating : undefined);
  const maxRating = cfUser?.maxRating ?? (cfRating.length > 0 ? Math.max(...cfRating.map((item) => item.newRating)) : undefined);

  return {
    theme,
    palette,
    chartWidth,
    cfHandle,
    cfUser,
    cfRating,
    cfSubmissions,
    upcomingContests,
    contestSolveMap,
    selectedUpcomingIds,
    isAddingUpcoming,
    upcomingActionText,
    feedbackRecords,
    knowledgeModules,
    knowledgeSubPoints,
    feedbackSource,
    setFeedbackSource,
    feedbackTitle,
    setFeedbackTitle,
    feedbackAlgorithms,
    setFeedbackAlgorithms,
    feedbackDifficulty,
    setFeedbackDifficulty,
    letLLMInferAlgorithms,
    setLetLLMInferAlgorithms,
    letLLMInferDifficulty,
    setLetLLMInferDifficulty,
    feedbackSolution,
    setFeedbackSolution,
    feedbackStatusText,
    isSubmittingFeedback,
    newSubPointName,
    setNewSubPointName,
    newSubPointModuleId,
    setNewSubPointModuleId,
    loading,
    errorText,
    addSubPoint,
    deleteSubPoint,
    submitProblemFeedback,
    toggleUpcomingSelection,
    addSelectedUpcomingToSchedule,
    currentRating,
    maxRating,
    cfAccepted,
    cfAttempted,
    totalKnowledgeExp,
    globalRank,
    ratingLineData,
    contributionHeatmap,
    heatmapCellSize,
    heatmapGridWidth,
    tagBoardWidth,
    recentContests,
    solvedProblems,
    globalDifficultyStats,
    topTagStats,
    tagPieData,
    tagCallouts,
    selectedUpcomingCount,
    getHeatColor,
    formatDuration,
    formatRemaining,
    subPointsByModule,
  };
}

export {
  CP_SUB_RING_CIRCUMFERENCE,
  CP_SUB_RING_RADIUS,
  CP_SUB_RING_SIZE,
  CP_SUB_RING_STROKE,
  DIFFICULTY_ORDER,
  HEATMAP_GRID_GAP,
  HEATMAP_Y_AXIS_WIDTH,
  TAG_CALLOUT_HEIGHT,
  getDifficultyLabel,
  mapToBarData,
  moduleLevelThreshold,
  subLevelThreshold,
  withAlpha,
};
