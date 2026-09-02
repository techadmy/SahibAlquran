import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  fontScale: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  canIncreaseFontSize: boolean;
  canDecreaseFontSize: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'sahibalquran_theme';
const FONT_SCALE_STORAGE_KEY = 'sahibalquran_font_scale';
const DEFAULT_FONT_SCALE = 100;
const MIN_FONT_SCALE = 90;
const MAX_FONT_SCALE = 115;
const FONT_SCALE_STEP = 5;

function clampFontScale(value: number): number {
  return Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark';
  });

  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem(FONT_SCALE_STORAGE_KEY);
    const parsed = Number(saved);

    if (Number.isNaN(parsed)) {
      return DEFAULT_FONT_SCALE;
    }

    return clampFontScale(parsed);
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-font-scale', `${fontScale}%`);
    localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(fontScale));
  }, [fontScale]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const increaseFontSize = () => {
    setFontScale((prev) => clampFontScale(prev + FONT_SCALE_STEP));
  };

  const decreaseFontSize = () => {
    setFontScale((prev) => clampFontScale(prev - FONT_SCALE_STEP));
  };

  const canIncreaseFontSize = fontScale < MAX_FONT_SCALE;
  const canDecreaseFontSize = fontScale > MIN_FONT_SCALE;

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        fontScale,
        increaseFontSize,
        decreaseFontSize,
        canIncreaseFontSize,
        canDecreaseFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
