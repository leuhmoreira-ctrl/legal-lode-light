import { createContext, useContext, ReactNode } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { lightTheme, darkTheme, Theme } from '@/styles/theme';

interface ThemeContextType {
  theme: Theme;
  mode: string | undefined;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  mode: 'light',
  setTheme: () => {},
});

export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
  const { theme: mode, setTheme, resolvedTheme } = useNextTheme();

  // Determine which theme object to use based on resolvedTheme (light/dark)
  const currentTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, mode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
