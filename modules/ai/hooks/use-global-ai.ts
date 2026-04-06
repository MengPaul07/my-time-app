import { useState, useCallback, useEffect } from 'react';
import { useTaskStore } from '@/modules/schedule/store/useTaskStore';
import { useUserStore } from '@/modules/auth/store/useUserStore';
import { assistantService } from '../services/assistantService';
import {
    DEFAULT_SCHEDULING_BACKGROUND_SETTINGS,
    SchedulingBackgroundSettings,
    SchedulingMode,
    buildSchedulingBackgroundContextFromStorage,
    loadSchedulingBackgroundSettingsFromStorage,
    saveSchedulingBackgroundSettingsToStorage,
} from '../services/schedulingBackground';
import { Task } from '@/types/app';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEALTH_RECORD_PREFIX = 'health_record_';
const HEALTH_STATUS_HISTORY_KEY = 'health_status_history';
const STORAGE_GOALS_BUNDLE = 'ai:goals:bundle';
const STORAGE_LEGACY_SCHEDULING_GOALS = 'ai:scheduling:goals';
const STORAGE_PROFILE_LONG_TERM_GOALS = 'profile:long-term-goals';
const STORAGE_CP_DAILY_SNAPSHOT = 'cp:daily:snapshot';
const STORAGE_CP_KNOWLEDGE = 'cp:global:knowledge';
const STORAGE_EN_DAILY_SNAPSHOT = 'english:daily:snapshot';
const STORAGE_EN_MODULES = 'english:modules';
const EXCLUDE_CP_ENGLISH_CONTEXT = true;

type GoalExpectation = 'low' | 'medium' | 'high';

type SchedulingGoalItem = {
    id: string;
    title: string;
    targetTime: string;
    expectation: GoalExpectation;
    createdAt: string;
};

type LongTermGoalItem = {
    id: string;
    title: string;
    targetDate: string;
    expectation: GoalExpectation;
    createdAt: string;
};

type SchedulingGoalsBundle = {
    goals: SchedulingGoalItem[];
};

const readGoalsBundle = async (): Promise<SchedulingGoalItem[]> => {
    const [newRaw, legacyRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_GOALS_BUNDLE),
        AsyncStorage.getItem(STORAGE_LEGACY_SCHEDULING_GOALS),
    ]);

    const raw = newRaw ?? legacyRaw;
    if (!raw) return [];

    const parsed = JSON.parse(raw) as SchedulingGoalsBundle | SchedulingGoalItem[] | { goals?: SchedulingGoalItem[] } | null;
    if (!parsed) return [];

    if (Array.isArray(parsed)) {
        return parsed;
    }

    return Array.isArray(parsed.goals) ? parsed.goals : [];
};

const readProfileLongTermGoals = async (): Promise<LongTermGoalItem[]> => {
    const [profileRaw, newRaw, legacyRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_PROFILE_LONG_TERM_GOALS),
        AsyncStorage.getItem(STORAGE_GOALS_BUNDLE),
        AsyncStorage.getItem(STORAGE_LEGACY_SCHEDULING_GOALS),
    ]);

    if (profileRaw) {
        const parsed = JSON.parse(profileRaw) as unknown;
        if (Array.isArray(parsed)) {
            const normalized = parsed
                .map((item) => {
                    const value = item as Partial<LongTermGoalItem>;
                    const title = (value.title || '').trim();
                    const targetDate = (value.targetDate || '').trim();
                    if (!title) return null;
                    return {
                        id: value.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        title,
                        targetDate,
                        expectation: (value.expectation as GoalExpectation) ?? 'high',
                        createdAt: value.createdAt || new Date().toISOString(),
                    };
                })
                .filter((item): item is LongTermGoalItem => !!item);

            if (normalized.length > 0) {
                return normalized;
            }
        }
    }

    const bundleRaw = newRaw ?? legacyRaw;
    if (!bundleRaw) return [];

    const parsedBundle = JSON.parse(bundleRaw) as any;
    const legacy = !Array.isArray(parsedBundle) ? parsedBundle?.longTermGoal : null;
    const legacyTitle = (legacy?.title || '').trim();
    if (!legacyTitle) return [];

    return [
        {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: legacyTitle,
            targetDate: (legacy?.targetDate || '').trim(),
            expectation: (legacy?.expectation as GoalExpectation) ?? 'high',
            createdAt: new Date().toISOString(),
        },
    ]
        .map((item) => {
            const title = (item.title || '').trim();
            if (!title) return null;
            return item;
        })
        .filter((item): item is LongTermGoalItem => !!item);
};

const getGoalExpectationLabel = (level: GoalExpectation) => {
    if (level === 'high') return '高';
    if (level === 'low') return '低';
    return '中';
};

const getDateKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const buildHealthPanelsContext = async () => {
    try {
        const todayKey = `${HEALTH_RECORD_PREFIX}${getDateKey()}`;
        const [todayRaw, historyRaw] = await Promise.all([
            AsyncStorage.getItem(todayKey),
            AsyncStorage.getItem(HEALTH_STATUS_HISTORY_KEY),
        ]);

        const todayRecord = todayRaw ? JSON.parse(todayRaw) : null;
        const statusHistory = historyRaw ? JSON.parse(historyRaw) : [];
        const latestStatus = Array.isArray(statusHistory) && statusHistory.length > 0 ? statusHistory[0] : null;

        const learning = todayRecord?.learningState || {};
        const advanced = todayRecord?.advancedMetrics || {};
        const completed = todayRecord?.schedule?.completedCount ?? 0;
        const total = todayRecord?.schedule?.totalCount ?? 0;
        const sleep = todayRecord?.sleep || {};
        const meals = todayRecord?.meals || {};
        const symptoms = Array.isArray(todayRecord?.symptoms) ? todayRecord.symptoms : [];
        const courseSelfRatings = Array.isArray(todayRecord?.courseSelfRatings) ? todayRecord.courseSelfRatings : [];

        return [
            `生存面板: overall=${latestStatus?.overallScore ?? 0}, body=${latestStatus?.bodyHealthScore ?? 0}, stress=${latestStatus?.stressScore ?? 0}, fatigue=${latestStatus?.fatigueScore ?? 0}, energy=${latestStatus?.energyScore ?? 0}`,
            `学习面板: overall=${learning.overall ?? 0}, course=${learning.courseStudy ?? 0}, acm=${learning.acmStudy ?? 0}, project=${learning.projectStudy ?? 0}, english=${learning.englishStudy ?? 0}, research=${learning.researchStudy ?? 0}`,
            `今日进度: completed=${completed}/${total}`,
            `作息时间: sleep=${sleep.sleepTime || 'unknown'}, wake=${sleep.wakeUpTime || 'unknown'}`,
            `进食时间: breakfast=${meals.breakfast || 'unknown'}, lunch=${meals.lunch || 'unknown'}, dinner=${meals.dinner || 'unknown'}`,
            `体征症状: ${symptoms.length > 0 ? symptoms.join(', ') : 'none'}`,
            `辅助状态: sleepHours=${advanced.sleepDurationHours ?? 0}, wakeRefresh=${advanced.wakeRefreshScore ?? 0}, mood=${advanced.subjectiveMood ?? 0}, energy=${advanced.subjectiveEnergy ?? 0}, focus=${advanced.subjectiveFocus ?? 0}`,
            `课程自评: count=${courseSelfRatings.length}`,
        ].join('\n');
    } catch (error) {
        console.warn('Failed to build health panels context for assistant:', error);
        return '暂无健康状态面板数据';
    }
};

const buildSchedulingBackgroundContext = async () => {
    return buildSchedulingBackgroundContextFromStorage();
};

const buildGoalsContext = async () => {
    try {
        const [normalized, longTermGoals] = await Promise.all([
            readGoalsBundle(),
            readProfileLongTermGoals(),
        ]);

        const lines: string[] = [];
        if (longTermGoals.length > 0) {
            const longTermLines = longTermGoals
                .slice(0, 8)
                .map(
                    (item) =>
                        `长期目标: ${item.title} @ ${item.targetDate || '未定日期'} (期望:${getGoalExpectationLabel(item.expectation)})`
                );
            lines.push(...longTermLines);
        }

        if (normalized.length === 0 && lines.length === 0) {
            return '暂无目标模块数据';
        }

        const dailyLines = normalized
            .slice(0, 12)
            .map((item) => `短期目标: ${item.title} @ ${item.targetTime} (期望:${getGoalExpectationLabel(item.expectation)})`);

        return [...lines, ...dailyLines].join('\n');
    } catch (error) {
        console.warn('Failed to build goals context:', error);
        return '目标数据读取失败';
    }
};

const buildCPContext = async () => {
    try {
        const [dailyRaw, knowledgeRaw] = await Promise.all([
            AsyncStorage.getItem(STORAGE_CP_DAILY_SNAPSHOT),
            AsyncStorage.getItem(STORAGE_CP_KNOWLEDGE),
        ]);

        const daily = dailyRaw ? JSON.parse(dailyRaw) : [];
        const latestDaily = Array.isArray(daily) && daily.length > 0 ? daily[0] : null;

        let modules: Array<{ name?: string; totalExp?: number }> = [];
        if (knowledgeRaw) {
            const parsed = JSON.parse(knowledgeRaw) as { modules?: Array<{ name?: string; totalExp?: number }> } | Array<any>;
            modules = Array.isArray(parsed) ? [] : (Array.isArray(parsed?.modules) ? parsed.modules : []);
        }

        const topModules = modules
            .slice()
            .sort((a, b) => (b.totalExp || 0) - (a.totalExp || 0))
            .slice(0, 3)
            .map((item) => `${item.name || '未知模块'}:${item.totalExp || 0}`)
            .join(', ');

        return [
            `CP每日累积: date=${latestDaily?.dateKey || '暂无'}, feedbackCount=${latestDaily?.feedbackCount ?? 0}, moduleTotalExp=${latestDaily?.moduleTotalExp ?? 0}, subPointTotalExp=${latestDaily?.subPointTotalExp ?? 0}`,
            `CP强项Top: ${topModules || '暂无'}`,
        ].join('\n');
    } catch (error) {
        console.warn('Failed to build CP context:', error);
        return 'CP 数据读取失败';
    }
};

const buildEnglishContext = async () => {
    try {
        const [dailyRaw, modulesRaw] = await Promise.all([
            AsyncStorage.getItem(STORAGE_EN_DAILY_SNAPSHOT),
            AsyncStorage.getItem(STORAGE_EN_MODULES),
        ]);

        const daily = dailyRaw ? JSON.parse(dailyRaw) : [];
        const latestDaily = Array.isArray(daily) && daily.length > 0 ? daily[0] : null;
        const modules = modulesRaw ? JSON.parse(modulesRaw) : [];

        const topModules = Array.isArray(modules)
            ? modules
                .slice()
                .sort((a: any, b: any) => (b.totalExp || 0) - (a.totalExp || 0))
                .slice(0, 3)
                .map((item: any) => `${item.name || '未知模块'}:${item.totalExp || 0}`)
                .join(', ')
            : '';

        return [
            `英语每日累积: date=${latestDaily?.dateKey || '暂无'}, todayRecords=${latestDaily?.recordCount ?? 0}, moduleTotalExp=${latestDaily?.moduleTotalExp ?? 0}, cumulativeRecords=${latestDaily?.cumulativeRecordCount ?? 0}`,
            `英语强项Top: ${topModules || '暂无'}`,
        ].join('\n');
    } catch (error) {
        console.warn('Failed to build English context:', error);
        return '英语数据读取失败';
    }
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantAction {
    type: 'create_task' | 'update_task' | 'delete_task' | 'create_course' | 'update_course' | 'delete_course' | 'query_schedule' | 'chat';
    data?: any;
}

const MUTATION_ACTION_TYPES: AssistantAction['type'][] = [
    'create_task',
    'update_task',
    'delete_task',
    'create_course',
    'update_course',
    'delete_course',
];

const describeAction = (action: AssistantAction) => {
    switch (action.type) {
        case 'create_task':
            return `创建任务：${action.data?.title || '未命名任务'}`;
        case 'update_task':
            return `修改任务：${action.data?.targetTitleStr || '未指定'}`;
        case 'delete_task':
            return `删除任务：${action.data?.targetTitleStr || '未指定'}`;
        case 'create_course':
            return `添加课程：${action.data?.name || '未命名课程'}`;
        case 'update_course':
            return `修改课程：${action.data?.targetNameStr || '未指定'}`;
        case 'delete_course':
            return `删除课程：${action.data?.targetNameStr || '未指定'}`;
        case 'query_schedule':
            return `查询日程：${action.data?.date || '指定日期'}`;
        default:
            return '排程动作';
    }
};

const WEEKDAY_TEXT: Record<number, string> = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日',
};

const formatDateTimeLabel = (value?: string) => {
    if (!value) return '未指定';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
};

const formatLocalISOWithoutZ = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${mm}:${s}`;
};

const parseHHMMToDate = (baseDate: Date, hhmm?: string) => {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const [h, m] = hhmm.split(':').map(Number);
    const next = new Date(baseDate);
    next.setHours(h, m, 0, 0);
    return next;
};

const hasOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) => startA < endB && startB < endA;

const findTaskByTitleKeyword = (tasks: Task[], keyword?: string) => {
    const key = (keyword || '').toLowerCase().trim();
    if (!key) return null;
    return tasks.find((task) => (task.title || '').toLowerCase().includes(key)) || null;
};

type BusySlot = {
    start: Date;
    end: Date;
    source: 'task' | 'course' | 'virtual';
    courseName?: string;
    courseLocation?: string;
};

const normalizeTextKey = (value?: string) => (value || '').trim().toLowerCase();

const isLearningLikeTask = (action: AssistantAction, tasks: Task[]) => {
    if (action.type !== 'create_task' && action.type !== 'update_task') return false;

    const title =
        action.type === 'create_task'
            ? String(action.data?.title || '')
            : String(action.data?.updates?.title || findTaskByTitleKeyword(tasks, action.data?.targetTitleStr)?.title || '');
    const description =
        action.type === 'create_task'
            ? String(action.data?.description || '')
            : String(action.data?.updates?.description || '');
    const text = `${title} ${description}`.toLowerCase();
    const learningKeywords = ['学习', '复习', '刷题', '算法', '英语', '课程', '作业', '项目', '科研', '阅读', '背单词', '写代码'];
    return learningKeywords.some((keyword) => text.includes(keyword));
};

const isStudyFriendlyLocation = (location?: string) => {
    const text = normalizeTextKey(location);
    if (!text) return false;
    const keywords = ['教室', '教学楼', '图书馆', '自习', '实验室', '研讨室', '机房', '安静'];
    return keywords.some((keyword) => text.includes(keyword));
};

const parseAllowDuringCourseNames = (settings: SchedulingBackgroundSettings) => {
    return (settings.allowTaskDuringCourseNames || '')
        .split(/\n|,|，/g)
        .map((item) => normalizeTextKey(item))
        .filter(Boolean);
};

const sanitizeCourseNameLikeTask = (action: AssistantAction, courses: any[]) => {
    const courseNames = courses
        .map((course) => normalizeTextKey(course?.name))
        .filter(Boolean);

    if (action.type === 'create_task') {
        const title = String(action.data?.title || '').trim();
        const normalizedTitle = normalizeTextKey(title);
        if (!normalizedTitle) return { action, note: '' };

        const matchedCourse = courseNames.find((name) => normalizedTitle === name || normalizedTitle.includes(name) || name.includes(normalizedTitle));
        if (!matchedCourse) return { action, note: '' };

        const nextAction: AssistantAction = {
            ...action,
            data: {
                ...(action.data || {}),
                title: `课后任务：${title}`,
            },
        };
        return {
            action: nextAction,
            note: `任务标题「${title}」与课程名称过于相似，已改为「${nextAction.data?.title}」避免把课程当任务。`,
        };
    }

    if (action.type === 'update_task') {
        const title = String(action.data?.updates?.title || '').trim();
        const normalizedTitle = normalizeTextKey(title);
        if (!normalizedTitle) return { action, note: '' };

        const matchedCourse = courseNames.find((name) => normalizedTitle === name || normalizedTitle.includes(name) || name.includes(normalizedTitle));
        if (!matchedCourse) return { action, note: '' };

        const nextAction: AssistantAction = {
            ...action,
            data: {
                ...(action.data || {}),
                updates: {
                    ...(action.data?.updates || {}),
                    title: `课后任务：${title}`,
                },
            },
        };
        return {
            action: nextAction,
            note: `更新后的任务标题「${title}」与课程名称相似，已自动调整为「${nextAction.data?.updates?.title}」。`,
        };
    }

    return { action, note: '' };
};

const sanitizeTaskActionConflict = (
    action: AssistantAction,
    tasks: Task[],
    courses: any[],
    settings: SchedulingBackgroundSettings,
    virtualBusy: BusySlot[]
) => {
    const deriveWindow = () => {
        if (action.type === 'create_task') {
            const start = parseDateTimeValue(action.data?.startTime);
            if (!start) return null;
            const minutes = Number(action.data?.estimatedDuration) > 0 ? Number(action.data?.estimatedDuration) : 30;
            const end = action.data?.endTime
                ? parseDateTimeValue(action.data?.endTime) || new Date(start.getTime() + minutes * 60 * 1000)
                : new Date(start.getTime() + minutes * 60 * 1000);
            return { start, end, minutes };
        }

        if (action.type === 'update_task') {
            const start = parseDateTimeValue(action.data?.updates?.startTime);
            if (!start) return null;
            const targetTask = findTaskByTitleKeyword(tasks, action.data?.targetTitleStr);
            const fallbackMinutes = targetTask?.estimated_duration ? Math.max(1, Math.round(targetTask.estimated_duration / 60)) : 30;
            const minutes = Number(action.data?.updates?.estimatedDuration) > 0 ? Number(action.data?.updates?.estimatedDuration) : fallbackMinutes;
            const end = action.data?.updates?.endTime
                ? parseDateTimeValue(action.data?.updates?.endTime) || new Date(start.getTime() + minutes * 60 * 1000)
                : new Date(start.getTime() + minutes * 60 * 1000);
            return { start, end, minutes };
        }

        return null;
    };

    const window = deriveWindow();
    if (!window) return { action, note: '' };

    const allowDuringCourseNames = parseAllowDuringCourseNames(settings);
    const targetTitleKey = normalizeTextKey(action.type === 'update_task' ? action.data?.targetTitleStr : undefined);

    let candidateStart = new Date(window.start);
    let candidateEnd = new Date(window.end);

    const getBusySlots = (baseDate: Date): BusySlot[] => {
        const day = baseDate.getDay() === 0 ? 7 : baseDate.getDay();

        const taskSlots = tasks
            .filter((task) => {
                if (!task.start_time) return false;
                if (action.type !== 'update_task') return true;
                if (!targetTitleKey) return true;
                return !normalizeTextKey(task.title).includes(targetTitleKey);
            })
            .map((task) => {
                const start = parseDateTimeValue(task.start_time || undefined);
                if (!start) return null;
                const minutes = task.estimated_duration ? Math.max(1, Math.round(task.estimated_duration / 60)) : 30;
                return { start, end: new Date(start.getTime() + minutes * 60 * 1000), source: 'task' as const };
            })
            .filter((slot): slot is NonNullable<typeof slot> => !!slot);

        const courseSlots = courses
            .filter((course) => Number(course.day_of_week) === day)
            .map((course) => {
                const start = parseHHMMToDate(baseDate, course.start_time);
                const end = parseHHMMToDate(baseDate, course.end_time);
                if (!start || !end || end <= start) return null;
                return {
                    start,
                    end,
                    source: 'course' as const,
                    courseName: String(course.name || ''),
                    courseLocation: String(course.location || ''),
                };
            })
            .filter((slot): slot is NonNullable<typeof slot> => !!slot);

        const sameDayVirtualBusy = virtualBusy.filter(
            (slot) =>
                slot.start.getFullYear() === baseDate.getFullYear() &&
                slot.start.getMonth() === baseDate.getMonth() &&
                slot.start.getDate() === baseDate.getDate()
        );

        return [...taskSlots, ...courseSlots, ...sameDayVirtualBusy];
    };

    const canIgnoreCourseConflict = (slot: BusySlot) => {
        if (slot.source !== 'course') return false;

        const courseKey = normalizeTextKey(slot.courseName);
        const allowByName = !!courseKey && allowDuringCourseNames.some((item) => courseKey.includes(item) || item.includes(courseKey));
        if (!allowByName) return false;

        if (!isLearningLikeTask(action, tasks)) return false;

        const explicitTaskLocation =
            action.type === 'create_task'
                ? String(action.data?.location || '')
                : String(action.data?.updates?.location || findTaskByTitleKeyword(tasks, action.data?.targetTitleStr)?.location || '');

        return isStudyFriendlyLocation(explicitTaskLocation) || isStudyFriendlyLocation(slot.courseLocation);
    };

    let shifted = false;
    for (let i = 0; i < 16; i++) {
        const busySlots = getBusySlots(candidateStart);
        const conflict = busySlots.find((slot) => hasOverlap(candidateStart, candidateEnd, slot.start, slot.end) && !canIgnoreCourseConflict(slot));
        if (!conflict) break;

        shifted = true;
        const bufferMinutes = conflict.source === 'course' ? 20 : 10;
        candidateStart = new Date(conflict.end.getTime() + bufferMinutes * 60 * 1000);
        candidateStart.setSeconds(0, 0);
        const roundedMinutes = Math.ceil(candidateStart.getMinutes() / 15) * 15;
        if (roundedMinutes >= 60) {
            candidateStart.setHours(candidateStart.getHours() + 1, 0, 0, 0);
        } else {
            candidateStart.setMinutes(roundedMinutes, 0, 0);
        }
        candidateEnd = new Date(candidateStart.getTime() + window.minutes * 60 * 1000);
    }

    if (!shifted) return { action, note: '' };

    if (action.type === 'create_task') {
        const nextAction: AssistantAction = {
            ...action,
            data: {
                ...(action.data || {}),
                startTime: formatLocalISOWithoutZ(candidateStart),
                endTime: formatLocalISOWithoutZ(candidateEnd),
            },
        };
        return {
            action: nextAction,
            note: `任务「${action.data?.title || '未命名任务'}」与已有日程冲突，已自动顺延到 ${formatDateTimeLabel(nextAction.data?.startTime)}。`,
        };
    }

    if (action.type === 'update_task') {
        const nextAction: AssistantAction = {
            ...action,
            data: {
                ...(action.data || {}),
                updates: {
                    ...(action.data?.updates || {}),
                    startTime: formatLocalISOWithoutZ(candidateStart),
                    endTime: formatLocalISOWithoutZ(candidateEnd),
                },
            },
        };
        return {
            action: nextAction,
            note: `任务「${action.data?.targetTitleStr || '目标任务'}」新时间与已有日程冲突，已自动顺延到 ${formatDateTimeLabel(nextAction.data?.updates?.startTime)}。`,
        };
    }

    return { action, note: '' };
};

const parseDateTimeValue = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getNextAvailableSlot = () => {
    const next = new Date(Date.now() + 10 * 60 * 1000);
    next.setSeconds(0, 0);
    const minutes = next.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    if (roundedMinutes >= 60) {
        next.setHours(next.getHours() + 1, 0, 0, 0);
    } else {
        next.setMinutes(roundedMinutes, 0, 0);
    }
    return next;
};

const sanitizeTaskActionTime = (action: AssistantAction) => {
    const now = new Date();
    const nextSlot = getNextAvailableSlot();
    const minAllowed = now.getTime() + 5 * 60 * 1000;

    if (action.type === 'create_task') {
        const originalStart = parseDateTimeValue(action.data?.startTime);
        if (!originalStart || originalStart.getTime() >= minAllowed) {
            return { action, note: '' };
        }

        const duration = Number(action.data?.estimatedDuration) > 0 ? Number(action.data?.estimatedDuration) : 30;
        const shifted = {
            ...action,
            data: {
                ...action.data,
                startTime: formatLocalISOWithoutZ(nextSlot),
                endTime: formatLocalISOWithoutZ(new Date(nextSlot.getTime() + duration * 60 * 1000)),
            },
        };

        return {
            action: shifted,
            note: `任务「${action.data?.title || '未命名任务'}」原时间已过，已自动顺延到 ${formatDateTimeLabel(shifted.data?.startTime)}。`,
        };
    }

    if (action.type === 'update_task') {
        const originalStart = parseDateTimeValue(action.data?.updates?.startTime);
        if (!originalStart || originalStart.getTime() >= minAllowed) {
            return { action, note: '' };
        }

        const shifted = {
            ...action,
            data: {
                ...action.data,
                updates: {
                    ...(action.data?.updates || {}),
                    startTime: formatLocalISOWithoutZ(nextSlot),
                },
            },
        };

        return {
            action: shifted,
            note: `任务「${action.data?.targetTitleStr || '目标任务'}」原修改时间已过，已自动顺延到 ${formatDateTimeLabel(shifted.data?.updates?.startTime)}。`,
        };
    }

    return { action, note: '' };
};

const sanitizeAssistantActions = (
    actions: AssistantAction[],
    tasks: Task[],
    courses: any[],
    settings: SchedulingBackgroundSettings
) => {
    const notes: string[] = [];
    const virtualBusy: BusySlot[] = [];

    const registerVirtualBusy = (action: AssistantAction) => {
        if (action.type === 'create_task') {
            const start = parseDateTimeValue(action.data?.startTime);
            if (!start) return;
            const minutes = Number(action.data?.estimatedDuration) > 0 ? Number(action.data?.estimatedDuration) : 30;
            virtualBusy.push({
                start,
                end: new Date(start.getTime() + minutes * 60 * 1000),
                source: 'virtual',
            });
            return;
        }

        if (action.type === 'update_task') {
            const start = parseDateTimeValue(action.data?.updates?.startTime);
            if (!start) return;
            const targetTask = findTaskByTitleKeyword(tasks, action.data?.targetTitleStr);
            const fallbackMinutes = targetTask?.estimated_duration ? Math.max(1, Math.round(targetTask.estimated_duration / 60)) : 30;
            const minutes = Number(action.data?.updates?.estimatedDuration) > 0 ? Number(action.data?.updates?.estimatedDuration) : fallbackMinutes;
            virtualBusy.push({
                start,
                end: new Date(start.getTime() + minutes * 60 * 1000),
                source: 'virtual',
            });
        }
    };

    const normalized = actions.map((action) => {
        const { action: withNameSanitize, note: nameNote } = sanitizeCourseNameLikeTask(action, courses);
        if (nameNote) notes.push(nameNote);

        const { action: withTimeSanitize, note: timeNote } = sanitizeTaskActionTime(withNameSanitize);
        if (timeNote) notes.push(timeNote);

        const { action: withConflictSanitize, note: conflictNote } = sanitizeTaskActionConflict(withTimeSanitize, tasks, courses, settings, virtualBusy);
        if (conflictNote) notes.push(conflictNote);

        registerVirtualBusy(withConflictSanitize);

        return withConflictSanitize;
    });
    return { actions: normalized, notes };
};

const buildActionDetails = (action: AssistantAction): string[] => {
    const data = action.data || {};
    switch (action.type) {
        case 'create_task':
            return [
                `类型：${data.isDeadline ? '截止任务' : '普通任务'}`,
                `标题：${data.title || '未命名任务'}`,
                `开始：${formatDateTimeLabel(data.startTime)}`,
                `时长：${data.estimatedDuration ? `${data.estimatedDuration} 分钟` : '30 分钟（默认）'}`,
                `地点：${data.location || '未指定'}`,
                `备注：${data.description || '无'}`,
            ];
        case 'update_task': {
            const updates = data.updates || {};
            return [
                `目标任务：${data.targetTitleStr || '未指定'}`,
                `新标题：${updates.title || '不修改'}`,
                `新开始：${updates.startTime ? formatDateTimeLabel(updates.startTime) : '不修改'}`,
                `新时长：${updates.estimatedDuration ? `${updates.estimatedDuration} 分钟` : '不修改'}`,
                `新地点：${updates.location || '不修改'}`,
                `新状态：${updates.status || '不修改'}`,
            ];
        }
        case 'delete_task':
            return [
                `目标任务：${data.targetTitleStr || '未指定'}`,
                `批量删除：${data.deleteAllMatched ? '是' : '否'}`,
            ];
        case 'create_course': {
            const dayNum = Number(data.dayOfWeek);
            return [
                `课程名：${data.name || '未命名课程'}`,
                `时间：${WEEKDAY_TEXT[dayNum] || `周${dayNum || '?'}`} ${data.startTime || '--:--'}-${data.endTime || '--:--'}`,
                `地点：${data.location || '未指定'}`,
            ];
        }
        case 'update_course': {
            const updates = data.updates || {};
            const dayNum = Number(updates.dayOfWeek);
            return [
                `目标课程：${data.targetNameStr || '未指定'}`,
                `新星期：${updates.dayOfWeek ? (WEEKDAY_TEXT[dayNum] || `周${dayNum}`) : '不修改'}`,
                `新时间：${updates.startTime || '--:--'}-${updates.endTime || '--:--'}`,
                `新地点：${updates.location || '不修改'}`,
            ];
        }
        case 'delete_course':
            return [
                `目标课程：${data.targetNameStr || '未指定'}`,
                `批量删除：${data.deleteAllMatched ? '是' : '否'}`,
            ];
        default:
            return ['暂无详细信息'];
    }
};

export function useGlobalAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
    const [pendingActions, setPendingActions] = useState<AssistantAction[]>([]);
  const [schedulingBackgroundSettings, setSchedulingBackgroundSettings] = useState<SchedulingBackgroundSettings>(DEFAULT_SCHEDULING_BACKGROUND_SETTINGS);
        const [goals, setGoals] = useState<SchedulingGoalItem[]>([]);
  const [isSavingSchedulingBackground, setIsSavingSchedulingBackground] = useState(false);

        const saveGoalsBundle = useCallback(async (goals: SchedulingGoalItem[]) => {
                const payload: SchedulingGoalsBundle = {
                        goals,
                };
                await AsyncStorage.setItem(STORAGE_GOALS_BUNDLE, JSON.stringify(payload));
        }, []);

    const loadSchedulingBackgroundSettings = useCallback(async () => {
        try {
            const settings = await loadSchedulingBackgroundSettingsFromStorage();
            setSchedulingBackgroundSettings(settings);
        } catch (error) {
            console.warn('Failed to load scheduling background settings:', error);
            setSchedulingBackgroundSettings(DEFAULT_SCHEDULING_BACKGROUND_SETTINGS);
        }
    }, []);

    useEffect(() => {
        void loadSchedulingBackgroundSettings();
    }, [loadSchedulingBackgroundSettings]);

    const loadGoals = useCallback(async () => {
        try {
            const parsed = await readGoalsBundle();
            setGoals(parsed);
        } catch (error) {
            console.warn('Failed to load goals:', error);
            setGoals([]);
        }
    }, []);

    useEffect(() => {
        void loadGoals();
    }, [loadGoals]);

    const updateSchedulingBackgroundField = useCallback(
        (key: keyof SchedulingBackgroundSettings, value: string | SchedulingMode) => {
            setSchedulingBackgroundSettings((prev) => ({
                ...prev,
                [key]: value,
            }));
        },
        []
    );

    const addPreferredLocation = useCallback((payload: { name: string; availableTimeDetail: string; locationFeatures: string }) => {
        const name = payload.name.trim();
        if (!name) return false;
        if (schedulingBackgroundSettings.locationRecords.some((item) => item.name === name)) return false;

        setSchedulingBackgroundSettings((prev) => ({
            ...prev,
            locationRecords: [
                ...prev.locationRecords,
                {
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    name,
                    availableTimeDetail: payload.availableTimeDetail.trim(),
                    locationFeatures: payload.locationFeatures.trim(),
                },
            ],
        }));
        return true;
    }, [schedulingBackgroundSettings.locationRecords]);

    const removePreferredLocation = useCallback((id: string) => {
        setSchedulingBackgroundSettings((prev) => ({
            ...prev,
            locationRecords: prev.locationRecords.filter((item) => item.id !== id),
        }));
    }, []);

    const setSchedulingMode = useCallback(async (mode: SchedulingMode) => {
        setSchedulingBackgroundSettings((prev) => {
            const next = { ...prev, schedulingMode: mode };
            void saveSchedulingBackgroundSettingsToStorage(next);
            return next;
        });
    }, []);

    const createGoal = useCallback(
        async (payload: { title: string; targetTime: string; expectation: GoalExpectation }) => {
            const title = payload.title.trim();
            if (!title) return false;

            try {
                const next: SchedulingGoalItem[] = [
                    {
                        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        title,
                        targetTime: payload.targetTime,
                        expectation: payload.expectation,
                        createdAt: new Date().toISOString(),
                    },
                    ...goals,
                ].slice(0, 80);

                await saveGoalsBundle(next);
                setGoals(next);
                return true;
            } catch (error) {
                console.warn('Failed to create goal:', error);
                return false;
            }
        },
        [goals, saveGoalsBundle]
    );

    const deleteGoal = useCallback(
        async (goalId: string) => {
            try {
                const next = goals.filter((item) => item.id !== goalId);
                await saveGoalsBundle(next);
                setGoals(next);
                return true;
            } catch (error) {
                console.warn('Failed to delete goal:', error);
                return false;
            }
        },
        [goals, saveGoalsBundle]
    );

    const saveSchedulingBackgroundSettings = useCallback(async () => {
        setIsSavingSchedulingBackground(true);
        try {
            const payload = await saveSchedulingBackgroundSettingsToStorage(schedulingBackgroundSettings);
            setSchedulingBackgroundSettings(payload);
            return true;
        } catch (error) {
            console.warn('Failed to save scheduling background settings:', error);
            return false;
        } finally {
            setIsSavingSchedulingBackground(false);
        }
    }, [schedulingBackgroundSettings]);
  
  // Access global store
  const { addTask, updateTask, deleteTask, tasks, fetchData, selectedDate, 
    courses, addCourse, updateCourse, deleteCourse 
  } = useTaskStore();

  const { session } = useUserStore(); // 获取当前用户会话

  const executeAction = useCallback(async (action: AssistantAction, userId: string | null) => {
      const { addTask, updateTask, deleteTask, fetchData, selectedDate, tasks, courses, addCourse, updateCourse, deleteCourse, setSelectedDate } = useTaskStore.getState();

      if (action.type === 'create_task' && action.data) {
          const normalized = sanitizeTaskActionTime(action).action;
          const { title, description, startTime, estimatedDuration, isDeadline, location } = normalized.data;
          const dbStartTime = startTime ? new Date(startTime).toISOString() : null;

          await addTask({
              title,
              description,
              location,
              start_time: dbStartTime,
              estimated_duration: (estimatedDuration || 30) * 60,
              is_deadline: !!isDeadline,
              color: isDeadline ? '#FF3B30' : '#AF52DE'
          }, userId);

          if (startTime && new Date(startTime).toDateString() === selectedDate.toDateString()) {
              await fetchData(userId, selectedDate);
          }
          return '';
      }

      if (action.type === 'create_course' && action.data) {
          const { name, location, dayOfWeek, startTime, endTime } = action.data;
          await addCourse({
              name,
              location,
              day_of_week: dayOfWeek,
              start_time: startTime,
              end_time: endTime,
              color: '#FF9500'
          }, userId);
          return '';
      }

      if (action.type === 'delete_task' && action.data?.targetTitleStr) {
          const targetStr = action.data.targetTitleStr.toLowerCase().trim();
          const isGuest = !userId;

          const allKeywords = ['all', '所有', '全部'];
          const genericKeywords = ['任务', 'task', 'tasks'];
          const hasAllKeyword = allKeywords.some(k => targetStr.includes(k));
          const isGenericOnly = genericKeywords.includes(targetStr);
          const isDeleteAll = hasAllKeyword || (isGenericOnly && action.data.deleteAllMatched);

          let targets: Task[] = [];
          if (isDeleteAll) {
              targets = [...tasks];
          } else if (action.data.deleteAllMatched) {
              targets = tasks.filter(t => t.title.toLowerCase().includes(targetStr));
          } else {
              const targetTask = tasks.find(t => t.title.toLowerCase().includes(targetStr));
              if (targetTask) targets = [targetTask];
          }

          if (targets.length > 0) {
              await Promise.allSettled(targets.map(t => deleteTask(t.id, isGuest)));
          }
          return '';
      }

      if (action.type === 'delete_course' && action.data?.targetNameStr) {
          const targetStr = action.data.targetNameStr.toLowerCase().trim();
          const isGuest = !userId;

          const allKeywords = ['all', '所有', '全部'];
          const genericKeywords = ['课程', 'course', 'courses', '课'];
          const hasAllKeyword = allKeywords.some(k => targetStr.includes(k));
          const isGenericOnly = genericKeywords.includes(targetStr);
          const isDeleteAll = hasAllKeyword || (isGenericOnly && action.data.deleteAllMatched);

          let targets: any[] = [];
          if (isDeleteAll) {
              targets = [...courses];
          } else if (action.data.deleteAllMatched) {
              targets = courses.filter(c => c.name.toLowerCase().includes(targetStr));
          } else {
              const targetCourse = courses.find(c => c.name.toLowerCase().includes(targetStr));
              if (targetCourse) targets = [targetCourse];
          }

          if (targets.length > 0) {
              await Promise.allSettled(targets.map(c => deleteCourse(c.id, isGuest)));
          }
          return '';
      }

      if (action.type === 'update_task' && action.data?.targetTitleStr) {
          const normalized = sanitizeTaskActionTime(action).action;
          const targetStr = normalized.data.targetTitleStr.toLowerCase();
          const isGuest = !userId;
          const targetTask = tasks.find(t => t.title.toLowerCase().includes(targetStr));
          if (targetTask && normalized.data.updates) {
              const updates = { ...normalized.data.updates };
              if (updates.startTime) {
                  updates.start_time = new Date(updates.startTime).toISOString();
                  delete updates.startTime;
              }
              await updateTask(targetTask.id, updates, isGuest);
          }
          return '';
      }

      if (action.type === 'update_course' && action.data?.targetNameStr) {
          const targetStr = action.data.targetNameStr.toLowerCase();
          const isGuest = !userId;
          const targetCourse = courses.find(c => c.name.toLowerCase().includes(targetStr));
          if (targetCourse && action.data.updates) {
              await updateCourse(targetCourse.id, action.data.updates, isGuest);
          }
          return '';
      }

      if (action.type === 'query_schedule' && action.data?.date) {
          const [tY, tM, tD] = action.data.date.split('-').map(Number);
          const targetDate = new Date(tY, tM - 1, tD);

          setSelectedDate(targetDate);
          await fetchData(null, targetDate);

          const currentStore = useTaskStore.getState();
          const allTasks = currentStore.tasks;
          const allCourses = currentStore.courses;

          const dayTasks = allTasks.filter(t => {
              if (!t.start_time) return false;
              const tDate = new Date(t.start_time);
              return tDate.getFullYear() === targetDate.getFullYear() &&
                      tDate.getMonth() === targetDate.getMonth() &&
                      tDate.getDate() === targetDate.getDate();
          });

          const jsDay = targetDate.getDay();
          const targetDayOfWeek = jsDay === 0 ? 7 : jsDay;
          const dayCourses = allCourses.filter(c => c.day_of_week === targetDayOfWeek);

          let summary = `\n\n📅 **${action.data.date} 日程表:**\n`;

          if (dayCourses.length > 0) {
              summary += `\n📘 **课程:**\n` + dayCourses.map(c => `- ${c.name} (${c.start_time}-${c.end_time}) @ ${c.location}`).join('\n');
          } else {
              summary += `\n📘 **课程:** 无`;
          }

          if (dayTasks.length > 0) {
              summary += `\n\n✅ **任务:**\n` + dayTasks.map(t => `- ${t.title} (${t.start_time ? new Date(t.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Todo'})`).join('\n');
          } else {
              summary += `\n\n✅ **任务:** 无`;
          }

          return summary;
      }

      return '';
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    // 1. Add user message
    const newMsgs = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMsgs);
    setIsThinking(true);

    try {
      // 2. Prepare context
            const tasksContext = tasks
                .map((task) => {
                    const durationMinutes = task.estimated_duration ? Math.max(1, Math.round(task.estimated_duration / 60)) : null;
                    return `- ${task.title} [${task.is_deadline ? 'DDL' : 'Task'} | ${task.status}] @ ${task.start_time || 'Floating'} | duration=${durationMinutes ? `${durationMinutes}min` : 'unknown'} | location=${task.location || 'unknown'}`;
                })
                .join('\n');
            const coursesContext = courses.map(c => `- ${c.name} @ 周${c.day_of_week} ${c.start_time}-${c.end_time}`).join('\n');
            const [healthPanelsContext, schedulingBackgroundContext, goalsContext] = await Promise.all([
                buildHealthPanelsContext(),
                buildSchedulingBackgroundContext(),
                buildGoalsContext(),
            ]);
            const cpContext = EXCLUDE_CP_ENGLISH_CONTEXT ? '' : await buildCPContext();
            const englishContext = EXCLUDE_CP_ENGLISH_CONTEXT ? '' : await buildEnglishContext();

      // 3. Prepare History (last 3 messages)
      const history = messages.slice(-3);

      // 4. Call AI Service
        const response = await assistantService.processUserRequest(
            text,
            tasksContext,
            coursesContext,
            healthPanelsContext,
            schedulingBackgroundContext,
            cpContext,
            englishContext,
            goalsContext,
            history
        );
      
      // 5. Handle Actions
      let systemReply = response.reply;
    const rawActions = response.actions || [];
    const { actions, notes: adjustedNotes } = sanitizeAssistantActions(
        rawActions as AssistantAction[],
        tasks,
        courses,
        schedulingBackgroundSettings
    );
      const userId = session?.user?.id || null;

      if (actions.length > 0) {
          const confirmActions: AssistantAction[] = [];
          for (const action of actions) {
              if (MUTATION_ACTION_TYPES.includes(action.type as AssistantAction['type'])) {
                  confirmActions.push(action as AssistantAction);
                  continue;
              }

              try {
                  const actionSummary = await executeAction(action as AssistantAction, userId);
                  if (actionSummary) {
                      systemReply += actionSummary;
                  }
              } catch (err) {
                  console.warn('AI Action Failed:', action, err);
              }
          }

          if (confirmActions.length > 0) {
              setPendingActions(prev => [...prev, ...confirmActions]);
              systemReply += `\n\n我生成了 ${confirmActions.length} 条排程建议，请在下方逐条确认后执行。`;
          }

          if (adjustedNotes.length > 0) {
              systemReply += `\n\n⏱ 时间校正：\n- ${adjustedNotes.join('\n- ')}`;
          }
      }
      
      // 5. Add Assistant Reply
      setMessages(prev => [...prev, { role: 'assistant', content: systemReply }]);

    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "抱歉，我处理时遇到了问题。" }]);
    } finally {
      setIsThinking(false);
    }
    }, [messages, tasks, courses, selectedDate, addTask, updateTask, deleteTask, fetchData, addCourse, updateCourse, deleteCourse, executeAction, session?.user?.id, schedulingBackgroundSettings]);

    const confirmPendingAction = useCallback(async () => {
        const action = pendingActions[0];
        if (!action) return;

        const userId = session?.user?.id || null;
        setIsThinking(true);
        try {
            const actionSummary = await executeAction(action, userId);
            setPendingActions(prev => prev.slice(1));
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: `✅ 已执行：${describeAction(action)}${actionSummary || ''}`
                }
            ]);
        } catch (error) {
            console.warn('Confirm AI action failed:', error);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: `❌ 执行失败：${describeAction(action)}，请重试或跳过。`
                }
            ]);
        } finally {
            setIsThinking(false);
        }
    }, [pendingActions, session?.user?.id, executeAction]);

    const skipPendingAction = useCallback(() => {
        const action = pendingActions[0];
        if (!action) return;

        setPendingActions(prev => prev.slice(1));
        setMessages(prev => [
            ...prev,
            {
                role: 'assistant',
                content: `⏭️ 已跳过：${describeAction(action)}`
            }
        ]);
    }, [pendingActions]);

  return {
    messages,
    sendMessage,
        isThinking,
        pendingAction: pendingActions[0] || null,
        pendingCount: pendingActions.length,
        pendingActionLabel: pendingActions[0] ? describeAction(pendingActions[0]) : '',
        pendingActionDetails: pendingActions[0] ? buildActionDetails(pendingActions[0]) : [],
        confirmPendingAction,
        skipPendingAction,
        schedulingBackgroundSettings,
        goals,
        updateSchedulingBackgroundField,
        addPreferredLocation,
        removePreferredLocation,
        setSchedulingMode,
        createGoal,
        deleteGoal,
        saveSchedulingBackgroundSettings,
        isSavingSchedulingBackground,
        reloadSchedulingBackgroundSettings: loadSchedulingBackgroundSettings,
        reloadGoals: loadGoals,
  };
}
