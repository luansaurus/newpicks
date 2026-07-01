'use client';

// Importa o contexto do lugar correto, em vez de criá-lo aqui
import { useCompetition } from '@/context/CompetitionContext';

interface CompetitionSelectorProps {
  competitions: any[];
  onRowClick?: () => void;
}

export function CompetitionSelector({ competitions, onRowClick }: CompetitionSelectorProps) {
  const { activeCompetition, selectCompetition } = useCompetition();

  if (!competitions || competitions.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-500 bg-background/20 italic">
        Nenhuma competição ativa encontrada.
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-background/20">
      {competitions.map((comp) => {
        const isSelected = activeCompetition?.id === comp.id;
        
        return (
          <div
            key={comp.id}
            onClick={() => {
              selectCompetition(comp);
              if (onRowClick) onRowClick();
            }}
            className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
              isSelected ? 'bg-card' : 'bg-card/40 border-transparent hover:border-slate-800'
            }`}
            style={{ borderColor: isSelected ? (comp.theme_primary || 'var(--color-primary)') : 'transparent' }}
          >
            <div className="flex items-center gap-3 truncate">
              {/* Ícone Real da Competição */}
              <img 
                src={comp.competition_logo} 
                alt={comp.name} 
                className="w-6 h-6 object-contain"
              />
              <span className="text-xs font-bold uppercase truncate">{comp.name}</span>
            </div>

            {/* Status da Competição */}
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
              !comp.is_active ? 'bg-slate-800 text-slate-400' : 'bg-green-500/10 text-green-400'
            }`}>
              {!comp.is_active ? 'Finalizado' : 'Em andamento'}
            </span>
          </div>
        );
      })}
    </div>
  );
}