'use client';

import { createContext, useContext, useMemo } from 'react';

interface ColorContextType {
  getSafeColor: (hex: string | undefined) => string;
  isColorDark: (hex: string | undefined) => boolean;
  getTextColorForBackground: (backgroundColor: string | undefined) => string;
  getThemeColor: (color: string | undefined) => string;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export function ColorProvider({ children }: { children: React.ReactNode }) {
  const getSafeColor = (hex: string | undefined): string => {
    if (!hex) return '#e11d48';
    
    const cleanHex = hex.charAt(0) === '#' ? hex.substring(1) : hex;
    if (cleanHex.length !== 6) return hex;
    
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 40 ? '#f8fafc' : hex;
  };

  const isColorDark = (hex: string | undefined): boolean => {
    if (!hex) return true;
    
    const cleanHex = hex.charAt(0) === '#' ? hex.substring(1) : hex;
    if (cleanHex.length !== 6) return true;
    
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 128;
  };

  const getTextColorForBackground = (backgroundColor: string | undefined): string => {
    if (!backgroundColor) return '#ffffff';
    
    const cleanHex = backgroundColor.charAt(0) === '#' ? backgroundColor.substring(1) : backgroundColor;
    if (cleanHex.length !== 6) return '#ffffff';
    
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance < 128 ? '#ffffff' : '#000000';
  };

  const getThemeColor = (color: string | undefined): string => {
    return getSafeColor(color || '#e11d48');
  };

  const value = {
    getSafeColor,
    isColorDark,
    getTextColorForBackground,
    getThemeColor
  };

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
}

export const useColor = () => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error('useColor must be used within a ColorProvider');
  }
  return context;
};