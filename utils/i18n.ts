import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

export const STORAGE_LANGUAGE = 'app:language';
export const DEFAULT_LANGUAGE = 'zh';
const canUseStorage = typeof window !== 'undefined';

const normalizeLanguage = (value?: string) => {
  if (!value) return DEFAULT_LANGUAGE;
  const lower = value.toLowerCase();
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('en')) return 'en';
  return DEFAULT_LANGUAGE;
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});

const initLanguage = async () => {
  const saved = canUseStorage ? await AsyncStorage.getItem(STORAGE_LANGUAGE) : null;
  const systemLocale = Localization.getLocales()?.[0]?.languageTag;
  const lang = normalizeLanguage(saved ?? systemLocale);
  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }
};

void initLanguage();

export const setLanguage = async (lang: 'en' | 'zh') => {
  if (canUseStorage) {
    await AsyncStorage.setItem(STORAGE_LANGUAGE, lang);
  }
  await i18n.changeLanguage(lang);
};

export const getLocaleForDate = (lang: string) => (lang === 'zh' ? 'zh-CN' : 'en-US');

export default i18n;
