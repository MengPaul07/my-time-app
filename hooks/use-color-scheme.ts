import { useTheme } from '@/contexts/ThemeContext';

export const useColorScheme = () => {
  const { theme } = useTheme();
  return theme;
};
