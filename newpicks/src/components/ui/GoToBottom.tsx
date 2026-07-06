'use client';

import { ChevronDown } from 'lucide-react';

export function GoToBottom() {
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <button
      onClick={scrollToBottom}
      className="fixed bottom-36 right-6 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 bg-slate-700 hover:bg-slate-600 text-white"
      aria-label="Ir para o fim da página"
    >
      <ChevronDown size={20} />
    </button>
  );
}