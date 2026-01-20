import React, { createContext, useContext, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { Themes, DEFAULT_THEME_ID, ThemeDefinition } from '@/modules/themes';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  themeId: string;
  setThemeId: (id: string) => void;
  activeTheme: ThemeDefinition;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
  activeTheme: Themes[DEFAULT_THEME_ID],
});

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useNativeColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(systemScheme ?? 'light');
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const activeTheme = Themes[themeId] || Themes[DEFAULT_THEME_ID];

  return (
    <ThemeContext.Provider value={{ 
      theme: themeMode, 
      toggleTheme,
      themeId,
      setThemeId,
      activeTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
