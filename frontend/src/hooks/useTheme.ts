import { useCallback } from 'react';
import { useThemeContext, Theme } from '@/components/ui/theme-provider';

export function useTheme() {
  const { theme, setTheme } = useThemeContext();

  const getCanvasBackgroundColor = useCallback((t?: Theme): string => {
    const currentTheme = t || theme;
    
    if (currentTheme === 'dark') {
      return '#000000';
    } else if (currentTheme === 'light') {
      return '#ffffff';
    } else if (currentTheme === 'system') {
      // In system mode, we need to check the media query at the moment of call
      // Note: This might not be reactive if the system theme changes while the app is running
      // but the useEffect in ThemeProvider handles the class update.
      // For canvas background, we rely on re-renders triggered by theme changes.
      if (typeof window === 'undefined') return '#ffffff';
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? '#000000' : '#ffffff';
    }
    return '#ffffff';
  }, [theme]);

  return { theme, setTheme, getCanvasBackgroundColor };
}


