'use client';
import { useCompetition } from '@/context/CompetitionContext';

export function CompetitionSelector({ competitions }: { competitions: any[] }) {
  const { activeCompetitionId, selectCompetition } = useCompetition();

  return (
    <div className="flex gap-4 p-4 overflow-x-auto">
      {competitions.map((comp) => (
        <button
          key={comp.id}
          onClick={() => selectCompetition(comp.id)}
          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[100px] ${
            activeCompetitionId === comp.id 
              ? 'border-primary bg-primary/10 shadow-lg' 
              : 'border-border bg-card hover:border-slate-700'
          }`}
        >
          <img src={comp.competition_logo} alt={comp.name} className="w-12 h-12 object-contain" />
          <span className="mt-2 text-[10px] font-bold uppercase truncate w-full text-center">
            {comp.name}
          </span>
        </button>
      ))}
    </div>
  );
}