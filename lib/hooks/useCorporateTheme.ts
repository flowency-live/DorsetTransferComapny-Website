'use client';

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface UseCorporateThemeReturn {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = 'corporate-theme';

/**
 * Hook for managing corporate portal theme (light/dark mode)
 * Persists preference to localStorage and applies CSS class to document
 * Default: dark mode for corporate users (executive/professional look)
 */
export function useCorporateTheme(): UseCorporateThemeReturn {
  // Default to dark mode for corporate portal
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount (default to dark if not set)
  useEffect(() => {
    setMounted(true);

    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
    } else {
      // Default to dark mode for corporate portal (no system preference check)
      setThemeState('dark');
    }
  }, []);

  // Apply theme class to document element
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };
}
