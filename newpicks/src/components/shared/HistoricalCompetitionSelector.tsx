'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useCompetition } from '@/context/CompetitionContext';
import { Calendar, Trophy, Check, Loader2, Play } from 'lucide-react';
import Link from 'next/link';

interface HistoricalCompetitionSelectorProps {
  onRowClick?: () => void;
}

export function HistoricalCompetitionSelector({ onRowClick }: HistoricalCompetitionSelectorProps) {
  const { activeCompetition, selectCompetition } = useCompetition();
  const [activeCompetitions, setActiveCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveCompetitions = async () => {
      setLoading(true);
      try {
        // Busca SOMENTE competições ativas
        const { data, error } = await supabase
          .from('competitions')
          .select('id, name, competition_logo, slug, theme_primary, theme_secondary, is_active, start_date, end_date')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!error && data) {
          setActiveCompetitions(data);
          
          // Verifica se a competição ativa atual está na lista
          if (activeCompetition) {
            setSelectedId(activeCompetition.id);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar competições ativas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveCompetitions();
  }, [activeCompetition]);

  const handleSelect = (competition: any) => {
    setSelectedId(competition.id);
    selectCompetition(competition);
    if (onRowClick) onRowClick();
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 size={18} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (activeCompetitions.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        <Calendar size={20} className="mx-auto mb-2 opacity-30" />
        <p className="text-[10px] font-medium">Nenhuma competição ativa</p>
        <p className="text-[8px] text-slate-600 mt-0.5">As competições ativas aparecerão aqui</p>
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
        <p className="text-[8px] text-slate-600 mt-0.5">Competições em andamento</p>
      </div>

      {/* Lista */}
      <div className="max-h-60 overflow-y-auto scrollbar-thin">
        {activeCompetitions.map((comp) => {
          const isSelected = selectedId === comp.id;
          const isActive = activeCompetition?.id === comp.id;

          return (
            <button
              key={comp.id}
              onClick={() => handleSelect(comp)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-all text-left ${
                isSelected || isActive ? 'bg-primary/10' : ''
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
                  <span className={`text-xs font-bold truncate ${isSelected || isActive ? 'text-primary' : 'text-slate-200'}`}>
                    {comp.name}
                  </span>
                  <span className="text-[8px] font-bold bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Ativa
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <span>{formatDate(comp.start_date)}</span>
                  <span>→</span>
                  <span>{comp.end_date ? formatDate(comp.end_date) : 'Em andamento'}</span>
                </div>
              </div>

              {/* Check de seleção */}
              {(isSelected || isActive) && (
                <Check size={16} className="text-primary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Link para ver todas as competições (incluindo históricas) */}
      <div className="border-t border-slate-800/50 p-2">
        <Link 
          href="/historical" 
          onClick={onRowClick}
          className="block text-center text-[10px] text-primary font-bold uppercase p-2 hover:bg-white/5 rounded transition-colors"
        >
          Ver todas as competições →
        </Link>
      </div>
    </div>
  );
}