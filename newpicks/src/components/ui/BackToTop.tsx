'use client';

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-24 right-6 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
      style={{ 
        backgroundColor: 'var(--color-primary)',
        color: 'white'
      }}
      aria-label="Voltar ao topo"
    >
      <ChevronUp size={20} />
    </button>
  );
}