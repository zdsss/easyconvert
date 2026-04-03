import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null) as Theme | null;
const initial = stored || 'light';
const initialResolved = resolveTheme(initial);

// Apply on load
if (typeof document !== 'undefined') {
  applyTheme(initialResolved);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  resolvedTheme: initialResolved,
  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    localStorage.setItem('theme', theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
  },
}));

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      const resolved = getSystemTheme();
      applyTheme(resolved);
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  });
}
