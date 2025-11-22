import {
  createContext,
  useContext,
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
  ReactNode,
} from 'react';

type DarkModeContextType = {
  isDark: boolean;
  toggleDarkMode: () => void;
};

const STORAGE_KEY = 'darkMode';

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const getStoredPreference = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const storedValue = localStorage.getItem(STORAGE_KEY);
  if (storedValue !== null) {
    return storedValue === 'true';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const hasStoredPreference = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return localStorage.getItem(STORAGE_KEY) !== null;
};

const applyThemeClass = (value: boolean) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', value);
};

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => getStoredPreference());
  const [userSetPreference, setUserSetPreference] = useState<boolean>(() => hasStoredPreference());

  // Apply the class to <html> as soon as possible and persist preference if user explicitly set it
  useLayoutEffect(() => {
    applyThemeClass(isDark);

    if (userSetPreference) {
      localStorage.setItem(STORAGE_KEY, String(isDark));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isDark, userSetPreference]);

  // Follow system preference until a user explicitly picks a theme
  useEffect(() => {
    if (userSetPreference || typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDark(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Safari < 14 fallback
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [userSetPreference]);

  const toggleDarkMode = useCallback(() => {
    setUserSetPreference(true);
    setIsDark((prev) => {
      const next = !prev;
      applyThemeClass(next);
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
}

