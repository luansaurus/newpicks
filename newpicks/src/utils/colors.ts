/**
 * Utilitários de cor para uso em todo o sistema
 */

/**
 * Verifica se uma cor é escura e retorna uma cor segura
 */
export function getSafeColor(hex: string | undefined): string {
  if (!hex) return '#e11d48';
  
  const cleanHex = hex.charAt(0) === '#' ? hex.substring(1) : hex;
  if (cleanHex.length !== 6) return hex;
  
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 40 ? '#f8fafc' : hex;
}

/**
 * Verifica se uma cor é escura
 */
export function isColorDark(hex: string | undefined): boolean {
  if (!hex) return true;
  
  const cleanHex = hex.charAt(0) === '#' ? hex.substring(1) : hex;
  if (cleanHex.length !== 6) return true;
  
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 128;
}

/**
 * Obtém uma cor de texto segura baseada no fundo
 */
export function getTextColorForBackground(backgroundColor: string | undefined): string {
  if (!backgroundColor) return '#ffffff';
  
  const cleanHex = backgroundColor.charAt(0) === '#' ? backgroundColor.substring(1) : backgroundColor;
  if (cleanHex.length !== 6) return '#ffffff';
  
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 128 ? '#ffffff' : '#000000';
}

/**
 * Aplica a cor segura com fallback
 */
export function getThemeColor(color: string | undefined, fallback: string = '#e11d48'): string {
  return getSafeColor(color || fallback);
}

/**
 * Gera uma classe CSS para cor de texto segura
 */
export function getSafeTextClass(backgroundColor: string | undefined): string {
  const isDark = isColorDark(backgroundColor);
  return isDark ? 'text-white' : 'text-black';
}

/**
 * Gera um estilo inline para cor de texto segura
 */
export function getSafeTextStyle(backgroundColor: string | undefined): React.CSSProperties {
  const color = getTextColorForBackground(backgroundColor);
  return { color };
}

/**
 * Gera um estilo inline para fundo seguro
 */
export function getSafeBackgroundStyle(color: string | undefined): React.CSSProperties {
  const safeColor = getSafeColor(color);
  return { backgroundColor: safeColor };
}