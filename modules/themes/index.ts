import { ThemeDefinition } from './types';
import { DefaultTheme } from './default';

export const Themes: Record<string, ThemeDefinition> = {
  [DefaultTheme.id]: DefaultTheme,
};

export const DEFAULT_THEME_ID = DefaultTheme.id;

export * from './types';
