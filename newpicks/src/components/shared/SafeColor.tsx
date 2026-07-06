'use client';

import { useColor } from '@/context/ColorContext';

interface SafeColorProps {
  color: string | undefined;
  children: (safeColor: string) => React.ReactNode;
}

export function SafeColor({ color, children }: SafeColorProps) {
  const { getSafeColor } = useColor();
  const safeColor = getSafeColor(color);
  return <>{children(safeColor)}</>;
}

// Componente para aplicar cor de fundo segura
interface SafeBackgroundProps {
  color: string | undefined;
  className?: string;
  children?: React.ReactNode;
}

export function SafeBackground({ color, className = '', children }: SafeBackgroundProps) {
  const { getSafeColor } = useColor();
  const safeColor = getSafeColor(color);
  
  return (
    <div 
      className={className}
      style={{ backgroundColor: safeColor }}
    >
      {children}
    </div>
  );
}

// Componente para texto com contraste seguro
interface SafeTextProps {
  backgroundColor: string | undefined;
  className?: string;
  children?: React.ReactNode;
}

export function SafeText({ backgroundColor, className = '', children }: SafeTextProps) {
  const { getTextColorForBackground } = useColor();
  const textColor = getTextColorForBackground(backgroundColor);
  
  return (
    <span 
      className={className}
      style={{ color: textColor }}
    >
      {children}
    </span>
  );
}