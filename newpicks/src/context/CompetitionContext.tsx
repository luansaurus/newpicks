'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const CompetitionContext = createContext<any>(null);

export function CompetitionProvider({ children }: { children: React.ReactNode }) {
  const [activeCompetitionId, setActiveCompetitionId] = useState<number | null>(null);

  // Opcional: Persistir a competição selecionada no localStorage
  useEffect(() => {
    const saved = localStorage.getItem('active_competition_id');
    if (saved) setActiveCompetitionId(parseInt(saved));
  }, []);

  const selectCompetition = (id: number) => {
    setActiveCompetitionId(id);
    localStorage.setItem('active_competition_id', id.toString());
  };

  return (
    <CompetitionContext.Provider value={{ activeCompetitionId, selectCompetition }}>
      {children}
    </CompetitionContext.Provider>
  );
}

export const useCompetition = () => useContext(CompetitionContext);