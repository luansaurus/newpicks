'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface CompetitionContextType {
  activeCompetition: any | null;
  selectCompetition: (comp: any) => void;
}

const CompetitionContext = createContext<CompetitionContextType | null>(null);

export function CompetitionProvider({ children }: { children: React.ReactNode }) {
  const [activeCompetition, setActiveCompetition] = useState<any | null>(null);

  useEffect(() => {
    // Lê o objeto completo do cache quando o app inicia
    const saved = localStorage.getItem('active_competition_obj');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setActiveCompetition(parsed);
        }
      } catch (e) {
        console.error('Erro ao ler cache da competição', e);
      }
    }
  }, []);

  const selectCompetition = (comp: any) => {
    setActiveCompetition(comp); // Atualiza o estado para o app inteiro renderizar
    localStorage.setItem('active_competition_obj', JSON.stringify(comp)); // Salva no cache
  };

  return (
    <CompetitionContext.Provider value={{ activeCompetition, selectCompetition }}>
      {children}
    </CompetitionContext.Provider>
  );
}

export const useCompetition = () => {
  const context = useContext(CompetitionContext);
  if (!context) throw new Error('useCompetition deve ser usado dentro de um CompetitionProvider');
  return context;
};