'use client';

import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';

export function useSafeColor() {
  const { themeColor: contextThemeColor } = useTheme();

  /**
   * Verifica se uma cor é escura e retorna uma cor segura
   */
  const getSafeColor = (hex: string | undefined): string => {
    if (!hex) return '#e11d48';
    
    // Remove o # se presente
    const cleanHex = hex.charAt(0) === '#' ? hex.substring(1) : hex;
    
    // Verifica se é um hex válido
    if (cleanHex.length !== 6) return hex;
    
    // Calcula o brilho usando a fórmula de luminância relativa
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    
    // Fórmula de luminância (percepção humana)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // Se for muito escuro (< 40), retorna uma cor clara
    return luminance < 40 ? '#f8fafc' : hex;
  };

  /**
   * Verifica se uma cor é clara ou escura
   */
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

  /**
   * Obtém uma cor de texto segura (branco ou preto) baseado no fundo
   */
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

  /**
   * Aplica a cor segura com fallback
   */
  const getThemeColor = (color: string | undefined): string => {
    return getSafeColor(color || contextThemeColor || '#e11d48');
  };

  return {
    getSafeColor,
    isColorDark,
    getTextColorForBackground,
    getThemeColor,
    themeColor: getThemeColor(contextThemeColor)
  };
}