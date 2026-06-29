'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState({ primary: '#22c55e' });

  // 1. Envolvemos a função no useCallback para manter a referência estável
  const applyTheme = useCallback((color: string) => {
    document.documentElement.style.setProperty('--color-primary', color);
    localStorage.setItem('team_primary_color', color);
    setTheme({ primary: color });
  }, []); // Array de dependências vazio, pois a função não depende de estados externos

  useEffect(() => {
    const savedColor = localStorage.getItem('team_primary_color');
    if (savedColor) applyTheme(savedColor);
  }, [applyTheme]); // Agora é seguro passar applyTheme como dependência

  return (
    <ThemeContext.Provider value={{ applyTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);