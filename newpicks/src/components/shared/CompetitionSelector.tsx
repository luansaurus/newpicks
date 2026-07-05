'use client';

import { useCompetition } from '@/context/CompetitionContext';
import { Check, Trophy, Play, History } from 'lucide-react';
import Link from 'next/link';

interface CompetitionSelectorProps {
  competitions: any[];
  onRowClick?: () => void;
}

export function CompetitionSelector({ competitions, onRowClick }: CompetitionSelectorProps) {
  const { activeCompetition, selectCompetition } = useCompetition();

  const handleSelect = (competition: any) => {
    selectCompetition(competition);
    if (onRowClick) onRowClick();
  };

  // Filtra apenas competições ativas
  const activeCompetitions = competitions.filter(comp => comp.is_active === true);

  if (activeCompetitions.length === 0) {
    return (
      <div className="py-4 text-center text-slate-500">
        <Trophy size={24} className="mx-auto mb-2 opacity-30" />
        <p className="text-xs font-medium">Nenhuma competição ativa</p>
        <p className="text-[10px] text-slate-600 mt-1">As competições ativas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* Cabeçalho */}
      <div className="px-3 py-2 border-b border-slate-800/50">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
          <Play size={12} className="text-green-500" />
          <span>Competições Ativas</span>
          <span className="ml-auto text-[8px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500">
            {activeCompetitions.length}
          </span>
        </div>
        <p className="text-[8px] text-slate-600 mt-0.5">Selecione uma competição para acessar</p>
      </div>

      {/* Lista de competições ativas */}
      <div className="max-h-60 overflow-y-auto scrollbar-thin">
        {activeCompetitions.map((comp) => {
          const isSelected = activeCompetition?.id === comp.id;

          return (
            <button
              key={comp.id}
              onClick={() => handleSelect(comp)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-all text-left ${
                isSelected ? 'bg-primary/10' : ''
              }`}
            >
              {/* Ícone/Logo */}
              <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-800/50 flex items-center justify-center overflow-hidden border border-slate-700/50">
                {comp.competition_logo ? (
                  <img 
                    src={comp.competition_logo} 
                    alt={comp.name}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <Trophy size={14} className="text-slate-500" />
                )}
              </div>

              {/* Informações */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-slate-200'}`}>
                    {comp.name}
                  </span>
                  <span className="text-[8px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Ativa
                  </span>
                </div>
              </div>

              {/* Check de seleção */}
              {isSelected && (
                <Check size={16} className="text-primary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Botão para ver todas as competições */}
      <div className="border-t border-slate-800/50 p-2">
        <Link 
          href="/historical" 
          onClick={onRowClick}
          className="block text-center text-[10px] text-primary font-bold uppercase p-2 hover:bg-white/5 rounded transition-colors flex items-center justify-center gap-2"
        >
          <History size={14} />
          Ver todas as competições
        </Link>
      </div>
    </div>
  );
}