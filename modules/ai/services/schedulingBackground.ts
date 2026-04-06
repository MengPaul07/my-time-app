import AsyncStorage from '@react-native-async-storage/async-storage';

export type SchedulingMode = 'full_day' | 'full_week' | 'current_decision' | 'custom';

export type LocationRecord = {
  id: string;
  name: string;
  availableTimeDetail: string;
  locationFeatures: string;
};

export type SchedulingBackgroundSettings = {
  locationRecords: LocationRecord[];
  availableTimeDetail: string;
  locationFeatures: string;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  hardConstraints: string;
  schedulingMode: SchedulingMode;
  customModeInstruction: string;
  allowTaskDuringCourseNames: string;
};

export const STORAGE_SCHEDULING_BACKGROUND = 'ai:scheduling:background';

export const DEFAULT_SCHEDULING_BACKGROUND_SETTINGS: SchedulingBackgroundSettings = {
  locationRecords: [],
  availableTimeDetail: '',
  locationFeatures: '',
  breakfastTime: '08:00',
  lunchTime: '12:00',
  dinnerTime: '18:00',
  hardConstraints: '',
  schedulingMode: 'current_decision',
  customModeInstruction: '',
  allowTaskDuringCourseNames: '',
};

export const getSchedulingModeLabel = (mode: SchedulingMode) => {
  if (mode === 'full_week') return '排满全周';
  if (mode === 'full_day') return '排满全天';
  if (mode === 'custom') return '自定义策略';
  return '只做当前决策';
};

export const loadSchedulingBackgroundSettingsFromStorage = async (): Promise<SchedulingBackgroundSettings> => {
  const raw = await AsyncStorage.getItem(STORAGE_SCHEDULING_BACKGROUND);
  if (!raw) {
    return DEFAULT_SCHEDULING_BACKGROUND_SETTINGS;
  }

  const parsed = JSON.parse(raw) as Partial<SchedulingBackgroundSettings> & {
    preferredLocations?: string[];
    locationDetail?: string;
  };

  const normalizedLocationRecords = Array.isArray(parsed.locationRecords)
    ? parsed.locationRecords
        .map((item) => {
          const value = item as Partial<LocationRecord>;
          const name = (value.name || '').trim();
          if (!name) return null;
          return {
            id: value.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name,
            availableTimeDetail: (value.availableTimeDetail || '').trim(),
            locationFeatures: (value.locationFeatures || '').trim(),
          };
        })
        .filter((item): item is LocationRecord => !!item)
    : [];

  const legacyPreferredLocations = Array.isArray(parsed.preferredLocations)
    ? parsed.preferredLocations.map((item) => (item || '').trim()).filter(Boolean)
    : (parsed.locationDetail || '')
        .split(/\n|,|，/g)
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    locationRecords:
      normalizedLocationRecords.length > 0
        ? normalizedLocationRecords
        : legacyPreferredLocations.map((name: string) => ({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name,
            availableTimeDetail: (parsed.availableTimeDetail || '').trim(),
            locationFeatures: (parsed.locationFeatures || '').trim(),
          })),
    availableTimeDetail: parsed.availableTimeDetail ?? '',
    locationFeatures: parsed.locationFeatures ?? '',
    breakfastTime: parsed.breakfastTime ?? '08:00',
    lunchTime: parsed.lunchTime ?? '12:00',
    dinnerTime: parsed.dinnerTime ?? '18:00',
    hardConstraints: parsed.hardConstraints ?? '',
    schedulingMode: parsed.schedulingMode ?? 'current_decision',
    customModeInstruction: parsed.customModeInstruction ?? '',
    allowTaskDuringCourseNames: (parsed.allowTaskDuringCourseNames as string) ?? '',
  };
};

export const saveSchedulingBackgroundSettingsToStorage = async (
  settings: SchedulingBackgroundSettings
): Promise<SchedulingBackgroundSettings> => {
  const payload: SchedulingBackgroundSettings = {
    locationRecords: settings.locationRecords
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        availableTimeDetail: item.availableTimeDetail.trim(),
        locationFeatures: item.locationFeatures.trim(),
      }))
      .filter((item) => !!item.name),
    availableTimeDetail: settings.availableTimeDetail.trim(),
    locationFeatures: settings.locationFeatures.trim(),
    breakfastTime: settings.breakfastTime,
    lunchTime: settings.lunchTime,
    dinnerTime: settings.dinnerTime,
    hardConstraints: settings.hardConstraints.trim(),
    schedulingMode: settings.schedulingMode,
    customModeInstruction: settings.schedulingMode === 'custom' ? settings.customModeInstruction.trim() : '',
    allowTaskDuringCourseNames: settings.allowTaskDuringCourseNames.trim(),
  };

  await AsyncStorage.setItem(STORAGE_SCHEDULING_BACKGROUND, JSON.stringify(payload));
  return payload;
};

export const buildSchedulingBackgroundContextFromStorage = async () => {
  try {
    const settings = await loadSchedulingBackgroundSettingsFromStorage();

    const allowTaskDuringCourseNames = (settings.allowTaskDuringCourseNames || '')
      .split(/\n|,|，/g)
      .map((item) => item.trim())
      .filter(Boolean);

    const mode = settings.schedulingMode;
    const statusWeightHint =
      mode === 'current_decision'
        ? '高（优先依据当前状态）'
        : mode === 'full_day' || mode === 'full_week'
        ? '中低（以计划完整性为主，状态仅做安全校正）'
        : '中（按自定义策略执行，状态用于微调）';

    return JSON.stringify({
      hasSchedulingBackground: settings.locationRecords.length > 0 || !!settings.hardConstraints,
      locationRecords: settings.locationRecords.map((item) => ({
        name: item.name,
        availableTimeDetail: item.availableTimeDetail || '',
        locationFeatures: item.locationFeatures || '',
      })),
      mealTimes: {
        breakfast: settings.breakfastTime || '08:00',
        lunch: settings.lunchTime || '12:00',
        dinner: settings.dinnerTime || '18:00',
      },
      hardConstraints: settings.hardConstraints || '',
      schedulingMode: mode,
      schedulingModeLabel: getSchedulingModeLabel(mode),
      customModeInstruction: mode === 'custom' ? settings.customModeInstruction || '' : '',
      statusWeightHint,
      locationPolicy: {
        requireTaskLocation: false,
        preferFromLocationRecords: true,
        requireLocationForLearningTasks: true,
        preferFromLocationRecordsForLearning: true,
        allowLocationOutsideRecordsForNonLearning: true,
        nonLearningLocationFlexible: true,
        ifUnknownUse: '待定地点',
        allowTaskDuringCourseNames,
        requireStudyFriendlyEnvironmentForInClassTasks: true,
      },
    });
  } catch (error) {
    console.warn('Failed to build scheduling background context:', error);
    return JSON.stringify({
      hasSchedulingBackground: false,
      error: '排程背景设置读取失败',
      locationRecords: [],
      locationPolicy: {
        requireTaskLocation: false,
        preferFromLocationRecords: true,
        requireLocationForLearningTasks: true,
        preferFromLocationRecordsForLearning: true,
        allowLocationOutsideRecordsForNonLearning: true,
        nonLearningLocationFlexible: true,
        ifUnknownUse: '待定地点',
        allowTaskDuringCourseNames: [],
        requireStudyFriendlyEnvironmentForInClassTasks: true,
      },
    });
  }
};
