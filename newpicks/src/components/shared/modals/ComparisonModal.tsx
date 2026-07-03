'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Calendar, Clock, Users, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { isPlayoffPhase } from '@/utils/leagueEngine';
import { Portal } from '@/components/shared/Portal';

interface DayGroup {
  dateKey: string;
  dateLabel: string;
  rawDate: Date;
  matches: any[];
}

const getFormattedDate = (dateString: string | Date) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
};

const getTime = (dateString: string | Date) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export function ComparisonModal({ isOpen, onClose, userA, userB, matches = [] }: any) {
  const [activeTab, setActiveTab] = useState<'groups' | 'playoffs'>('groups');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showAllDates, setShowAllDates] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const todayStr = getFormattedDate(new Date());

  useEffect(() => {
    if (isOpen) {
      const todayMatches = (matches || []).filter((m: any) => getFormattedDate(m.match_time) === todayStr);
      if (todayMatches.length > 0) {
        const hasPlayoff = todayMatches.some((m: any) => isPlayoffPhase(m.phase));
        setActiveTab(hasPlayoff ? 'playoffs' : 'groups');
      }
    }
  }, [isOpen, matches]);

  const phaseMatches = (matches || []).filter((m: any) => 
    activeTab === 'groups' ? !isPlayoffPhase(m?.phase) : isPlayoffPhase(m?.phase)
  );

  const groupedByDate = phaseMatches.reduce((acc: Record<string, DayGroup>, m: any) => {
    const dateKey = getFormattedDate(m?.match_time);
    if (!dateKey) return acc;
    if (!acc[dateKey]) {
      const dateObj = new Date(m.match_time);
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[dateKey] = {
        dateKey,
        dateLabel: `${weekday}, ${dayMonth}`,
        rawDate: dateObj,
        matches: []
      };
    }
    acc[dateKey].matches.push(m);
    return acc;
  }, {} as Record<string, DayGroup>);

  const datesArray = (Object.values(groupedByDate) as DayGroup[]).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  const daysDependency = datesArray.map(d => d.dateKey).join(',');
  useEffect(() => {
    if (isOpen && datesArray.length > 0) {
      const dateExists = datesArray.some(d => d.dateKey === selectedDate);
      if (!dateExists) {
        const hasToday = datesArray.some(d => d.dateKey === todayStr);
        setSelectedDate(hasToday ? todayStr : datesArray[0].dateKey);
      }
    }
  }, [isOpen, activeTab, daysDependency]);

  const currentMatches = [...(groupedByDate[selectedDate]?.matches || [])].sort((a, b) => {
    return new Date(a.match_time).getTime() - new Date(b.match_time).getTime();
  });

  // Função para rolar para a data selecionada
  const scrollToDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    if (scrollContainerRef.current) {
      const button = scrollContainerRef.current.querySelector(`[data-date="${dateKey}"]`);
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  // Funções para navegação
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  const getWinnerBadge = (guess: any, match: any) => {
    if (!guess) return <Minus size={12} className="text-slate-600" />;
    if (guess.home > guess.away) {
      return <img src={match?.home_team?.logo_url || ''} className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-md" />;
    }
    if (guess.away > guess.home) {
      return <img src={match?.away_team?.logo_url || ''} className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-md" />;
    }
    
    if (isPlayoffPhase(match?.phase) && guess.penalty_winner) {
      const isHomePen = guess.penalty_winner === 'home' || String(guess.penalty_winner) === String(match?.home_team?.id);
      const penTeam = isHomePen ? match?.home_team : match?.away_team;
      return (
        <div className="relative flex items-center justify-center">
          {penTeam?.logo_url && <img src={penTeam.logo_url} className="w-4 h-4 sm:w-5 sm:h-5 object-contain inline-block drop-shadow-md opacity-90" />}
          <div className="absolute -bottom-1 -right-1.5 bg-slate-900 text-[6px] sm:text-[7px] font-black px-0.5 rounded text-yellow-500 border border-slate-700">P</div>
        </div>
      );
    }

    return <div className="text-[8px] sm:text-[9px] font-black bg-slate-900 px-1 rounded text-yellow-500 border border-slate-700 shadow-sm">X</div>;
  };

  const getBadgeClass = (color: string) => {
    if (color === 'GREEN') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (color === 'BLUE') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (color === 'YELLOW') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/90 z-[100] flex items-start sm:items-center justify-center p-1 sm:p-3 md:p-6 animate-in fade-in overflow-y-auto">
        <div className="bg-card w-full max-w-6xl max-h-[98vh] sm:max-h-[90vh] md:max-h-[85vh] rounded-xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border relative my-1 sm:my-0">
          
          {/* CABEÇALHO FIXO COM STICKY */}
          <div className="p-2 sm:p-3 md:p-4 border-b border-border flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex-shrink-0">
            <h2 className="font-display font-bold text-sm sm:text-base md:text-lg uppercase tracking-tight">Comparação Direta</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors bg-white/5">
              <X size={20} className="sm:w-[24px] sm:h-[24px]" />
            </button>
          </div>

          {/* REGRAS */}
          <div className="grid grid-cols-3 text-center py-1 sm:py-1.5 md:py-2 bg-slate-950/40 border-b border-border text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase text-slate-400 tracking-wider flex-shrink-0">
            <div className="text-primary truncate px-1 sm:px-2">{userA?.name || 'Você'}</div>
            <div className="text-slate-600 text-[10px] sm:text-xs">VS</div>
            <div className="text-amber-500 truncate px-1 sm:px-2">{userB?.name || 'Oponente'}</div>
          </div>

          {/* ABAS: GRUPOS / MATA-MATA */}
          <div className="flex border-b border-border bg-background/30 flex-shrink-0">
            <button 
              onClick={() => setActiveTab('groups')} 
              className={`flex-1 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'groups' 
                  ? 'border-b-2 border-primary text-white bg-primary/5' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Grupos
            </button>
            <button 
              onClick={() => setActiveTab('playoffs')} 
              className={`flex-1 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'playoffs' 
                  ? 'border-b-2 border-primary text-white bg-primary/5' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Mata-Mata
            </button>
          </div>

          {/* SELETOR DE DATAS - VERSÃO COM BOTÕES E CONTROLES */}
          <div className="p-1.5 sm:p-2 md:p-3 bg-background/20 border-b border-border/40 flex-shrink-0">
            {datesArray.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1">Nenhum confronto agendado.</p>
            ) : (
              <div className="flex flex-col gap-1.5 sm:gap-2">
                {/* Desktop e Mobile: Container com controles */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Botão Esquerda */}
                  <button
                    onClick={scrollLeft}
                    className="hidden sm:flex p-1.5 rounded-lg bg-card/50 border border-border hover:bg-card hover:border-slate-500 transition-colors flex-shrink-0"
                    aria-label="Rolar para esquerda"
                  >
                    <ChevronLeft size={16} className="text-slate-400" />
                  </button>

                  {/* Container de Scroll */}
                  <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto scrollbar-thin flex-1 py-0.5 sm:py-1 px-0.5 sm:px-1"
                    style={{ 
                      scrollbarWidth: 'thin',
                      WebkitOverflowScrolling: 'touch',
                      scrollSnapType: 'x proximity'
                    }}
                  >
                    <Calendar size={12} className="sm:w-[14px] sm:h-[14px] text-slate-500 flex-shrink-0 hidden sm:block" />
                    
                    {datesArray.map((dayGroup: DayGroup) => {
                      const isToday = dayGroup.dateKey === todayStr;
                      const isSelected = selectedDate === dayGroup.dateKey;
                      const matchCount = dayGroup.matches.length;
                      
                      return (
                        <button
                          key={dayGroup.dateKey}
                          data-date={dayGroup.dateKey}
                          onClick={() => scrollToDate(dayGroup.dateKey)}
                          className={`py-0.5 sm:py-1 md:py-1.5 px-1.5 sm:px-2 md:px-3 text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs font-bold rounded-lg border transition-all flex-shrink-0 flex items-center gap-0.5 sm:gap-1 ${
                            isSelected 
                              ? 'bg-primary text-slate-900 border-primary shadow-md scale-105' 
                              : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-500 hover:bg-white/5'
                          }`}
                        >
                          <span>{isToday ? 'HOJE' : dayGroup.dateLabel}</span>
                          <span className={`text-[6px] sm:text-[7px] md:text-[8px] px-1 sm:px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-slate-900/20 text-slate-800' : 'bg-slate-900/50 text-slate-500'
                          }`}>
                            {matchCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Botão Direita */}
                  <button
                    onClick={scrollRight}
                    className="hidden sm:flex p-1.5 rounded-lg bg-card/50 border border-border hover:bg-card hover:border-slate-500 transition-colors flex-shrink-0"
                    aria-label="Rolar para direita"
                  >
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>

                  {/* Botão "Ver todas" - Mobile */}
                  <button
                    onClick={() => setShowAllDates(!showAllDates)}
                    className="sm:hidden p-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors flex-shrink-0"
                    aria-label={showAllDates ? 'Ocultar datas' : 'Ver todas as datas'}
                  >
                    <CalendarDays size={16} className="text-primary" />
                  </button>
                </div>

                {/* Lista expandida de datas - Mobile */}
                {showAllDates && (
                  <div className="sm:hidden grid grid-cols-2 gap-1 p-2 bg-background/30 rounded-lg border border-border/50 animate-in slide-in-from-top-2">
                    {datesArray.map((dayGroup: DayGroup) => {
                      const isToday = dayGroup.dateKey === todayStr;
                      const isSelected = selectedDate === dayGroup.dateKey;
                      const matchCount = dayGroup.matches.length;
                      
                      return (
                        <button
                          key={dayGroup.dateKey}
                          onClick={() => {
                            scrollToDate(dayGroup.dateKey);
                            setShowAllDates(false);
                          }}
                          className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'bg-primary text-slate-900 border-primary' 
                              : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-500 hover:bg-white/5'
                          }`}
                        >
                          <span>{isToday ? '📅 HOJE' : dayGroup.dateLabel}</span>
                          <span className={`text-[7px] px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-slate-900/20 text-slate-800' : 'bg-slate-900/50 text-slate-500'
                          }`}>
                            {matchCount}
                          </span>
                        </button>
                      );
                    })}
                    
                    {/* Botão fechar */}
                    <button
                      onClick={() => setShowAllDates(false)}
                      className="col-span-2 py-1 text-[10px] text-slate-500 hover:text-white bg-card/30 rounded-lg border border-border/50 transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                {/* Indicador de scroll - Mobile (quando não está expandido) */}
                {!showAllDates && datesArray.length > 4 && (
                  <div className="sm:hidden flex items-center justify-between px-0.5">
                    <span className="text-[7px] text-slate-600 animate-pulse flex items-center gap-0.5">
                      <span>←</span> Deslize <span>→</span>
                    </span>
                    <span className="text-[7px] text-slate-600 bg-slate-900/30 px-1.5 py-0.5 rounded-full">
                      {datesArray.length} datas
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CORPO PRINCIPAL - MOSTRA TODOS OS JOGOS DA DATA SELECIONADA */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 scrollbar-thin relative bg-background/5">
            {currentMatches.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 sm:gap-3 opacity-50">
                <Users size={28} className="sm:w-[40px] sm:h-[40px]" />
                <p className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider">Nenhum jogo nesta data</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {currentMatches.map((m: any) => {
                  const guessA = m?.palpites?.[userA?.id];
                  const guessB = m?.palpites?.[userB?.id];
                  const isPlayoff = isPlayoffPhase(m?.phase);
                  const hasPenalties = m?.home_penalty !== null && m?.away_penalty !== null && m?.status === 'FINISHED';

                  return (
                    <div key={m.id} className="bg-card border border-border/80 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-3.5 shadow-md flex flex-col items-center">
                      
                      {/* Cabeçalho do Jogo - Mais compacto */}
                      <div className="flex items-center justify-between w-full mb-1.5 sm:mb-2 pb-1.5 sm:pb-2 border-b border-border/40">
                        <div className="flex items-center gap-1 sm:gap-1.5 w-1/3 justify-end">
                          <span className="font-display font-bold text-[9px] sm:text-[10px] md:text-xs text-slate-300 text-right truncate max-w-[30px] sm:max-w-[50px] md:max-w-[70px]">
                            {m?.home_team?.short_code || m?.home_team?.name}
                          </span>
                          {m?.home_team?.logo_url && (
                            <img 
                              src={m.home_team.logo_url} 
                              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 object-contain flex-shrink-0" 
                            />
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center w-1/3">
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] sm:text-xs md:text-sm font-black bg-slate-900 px-1.5 sm:px-2 py-0.5 rounded-lg text-white border border-border/50">
                              {m.status === 'FINISHED' ? `${m.home_score}:${m.away_score}` : '-:-'}
                            </span>
                            {/* Mostrar resultado dos pênaltis se houver */}
                            {isPlayoff && hasPenalties && (
                              <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold text-yellow-500 bg-slate-900/60 px-1 sm:px-1.5 py-0.5 rounded-md mt-0.5 border border-yellow-500/20">
                                PÊN: {m.home_penalty}:{m.away_penalty}
                              </span>
                            )}
                          </div>
                          <span className="text-[6px] sm:text-[7px] md:text-[8px] font-bold uppercase tracking-widest mt-0.5 text-slate-500">
                            {getTime(m.match_time)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 w-1/3 justify-start">
                          {m?.away_team?.logo_url && (
                            <img 
                              src={m.away_team.logo_url} 
                              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 object-contain flex-shrink-0" 
                            />
                          )}
                          <span className="font-display font-bold text-[9px] sm:text-[10px] md:text-xs text-slate-300 text-left truncate max-w-[30px] sm:max-w-[50px] md:max-w-[70px]">
                            {m?.away_team?.short_code || m?.away_team?.name}
                          </span>
                        </div>
                      </div>

                      {/* Palpites lado a lado - Mais compacto */}
                      <div className="flex items-start justify-center w-full gap-1 sm:gap-2">
                        
                        {/* Palpite User A */}
                        <div className="flex flex-col items-center space-y-0.5 sm:space-y-1 flex-1">
                          <span className="text-[6px] sm:text-[7px] md:text-[8px] text-primary font-bold uppercase tracking-widest truncate max-w-[40px] sm:max-w-[50px] md:max-w-[60px]">
                            {userA?.name}
                          </span>
                          <div className="h-4 sm:h-5 flex items-center justify-center">
                            {getWinnerBadge(guessA, m)}
                          </div>
                          <div className="bg-slate-950/60 border border-primary/30 w-full py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs md:text-sm font-bold font-display text-primary shadow-inner text-center">
                            {guessA ? `${guessA.home}:${guessA.away}` : '-:-'}
                          </div>
                          {m?.status === 'FINISHED' && guessA ? (
                            <span className={`text-[6px] sm:text-[7px] md:text-[8px] px-1 sm:px-1.5 py-0.5 rounded font-bold w-full text-center border ${getBadgeClass(guessA.color)}`}>
                              +{guessA.pts || 0}
                            </span>
                          ) : <span className="h-[14px] sm:h-[18px]"></span>}
                        </div>

                        <div className="flex flex-col items-center pt-2 sm:pt-3 md:pt-4">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-600 uppercase bg-background/50 px-0.5 sm:px-1 py-0.5 rounded-full border border-border">
                            VS
                          </span>
                        </div>

                        {/* Palpite User B */}
                        <div className="flex flex-col items-center space-y-0.5 sm:space-y-1 flex-1">
                          <span className="text-[6px] sm:text-[7px] md:text-[8px] text-amber-500 font-bold uppercase tracking-widest truncate max-w-[40px] sm:max-w-[50px] md:max-w-[60px]">
                            {userB?.name}
                          </span>
                          <div className="h-4 sm:h-5 flex items-center justify-center">
                            {getWinnerBadge(guessB, m)}
                          </div>
                          <div className="bg-slate-950/60 border border-amber-500/30 w-full py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs md:text-sm font-bold font-display text-amber-500 shadow-inner text-center">
                            {guessB ? `${guessB.home}:${guessB.away}` : '-:-'}
                          </div>
                          {m?.status === 'FINISHED' && guessB ? (
                            <span className={`text-[6px] sm:text-[7px] md:text-[8px] px-1 sm:px-1.5 py-0.5 rounded font-bold w-full text-center border ${getBadgeClass(guessB.color)}`}>
                              +{guessB.pts || 0}
                            </span>
                          ) : <span className="h-[14px] sm:h-[18px]"></span>}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </Portal>
  );
}