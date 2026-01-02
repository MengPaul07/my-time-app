import React, { createContext, useContext, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export const CustomThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useNativeColorScheme();
  const [theme, setTheme] = useState<Theme>(systemScheme ?? 'light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
