'use client';

import { useCompetition } from '@/context/CompetitionContext';
import { Trophy } from 'lucide-react';

interface CompetitionSelectorProps {
  competitions: any[];
  onRowClick: () => void;
}

export function CompetitionSelector({ competitions, onRowClick }: CompetitionSelectorProps) {
  const { selectCompetition, activeCompetition } = useCompetition();

  if (!competitions || competitions.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-400 text-center">
        Nenhuma competição ativa encontrada.
      </div>
    );
  }

  return (
    <div className="py-2 max-h-60 overflow-y-auto scrollbar-thin">
      {competitions.map((comp) => {
        const isActive = activeCompetition?.id === comp.id;
        
        return (
          <button
            key={comp.id}
            onClick={() => {
              selectCompetition(comp);
              // Salva no cache para manter a competição ao recarregar a página
              localStorage.setItem('active_competition_obj', JSON.stringify(comp));
              onRowClick();
            }}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
              isActive 
                ? 'bg-primary/20 text-primary font-bold border-l-2 border-primary' 
                : 'hover:bg-white/5 text-slate-300 border-l-2 border-transparent'
            }`}
          >
            {comp.competition_logo ? (
              <img src={comp.competition_logo} alt={comp.name} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <Trophy size={20} className="opacity-50" />
            )}
            <span className="text-sm truncate">{comp.name}</span>
          </button>
        );
      })}
    </div>
  );
}