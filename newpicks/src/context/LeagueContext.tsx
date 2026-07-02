'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LeagueContext = createContext<any>(null);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [activeLeague, setActiveLeague] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('active_league_obj');
    if (saved) {
      try {
        setActiveLeague(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao recuperar liga salva', e);
      }
    }
  }, []);

  const selectLeague = (league: any) => {
    setActiveLeague(league);
    if (league) {
      localStorage.setItem('active_league_obj', JSON.stringify(league));
    } else {
      localStorage.removeItem('active_league_obj');
    }
  };

  return (
    <LeagueContext.Provider value={{ activeLeague, selectLeague }}>
      {children}
    </LeagueContext.Provider>
  );
}

export const useLeague = () => useContext(LeagueContext);