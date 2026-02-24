'use client';

import { Sun, Moon } from 'lucide-react';
import { useCorporateTheme } from '@/lib/hooks/useCorporateTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useCorporateTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        corp-theme-toggle
        flex items-center gap-2
        px-3 py-2
        rounded-lg
        transition-all duration-200
        ${className}
      `.trim()}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="relative w-5 h-5">
        {/* Sun icon - visible in dark mode */}
        <Sun
          className={`
            absolute inset-0 w-5 h-5
            transition-all duration-300
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}
          `}
        />
        {/* Moon icon - visible in light mode */}
        <Moon
          className={`
            absolute inset-0 w-5 h-5
            transition-all duration-300
            ${isDark ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}
          `}
        />
      </span>
      {showLabel && (
        <span className="text-sm font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
