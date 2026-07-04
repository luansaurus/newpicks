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

  const scrollToDate = (dateKey: string) => {
    setSelectedDate(dateKey);
    if (scrollContainerRef.current) {
      const button = scrollContainerRef.current.querySelector(`[data-date="${dateKey}"]`);
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

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
    if (!guess) return <Minus size={24} className="text-slate-600" />;
    if (guess.home > guess.away) {
      return <img src={match?.home_team?.logo_url || ''} className="w-12 h-12 object-contain inline-block drop-shadow-md" />;
    }
    if (guess.away > guess.home) {
      return <img src={match?.away_team?.logo_url || ''} className="w-12 h-12 object-contain inline-block drop-shadow-md" />;
    }
    
    if (isPlayoffPhase(match?.phase) && guess.penalty_winner) {
      const isHomePen = guess.penalty_winner === 'home' || String(guess.penalty_winner) === String(match?.home_team?.id);
      const penTeam = isHomePen ? match?.home_team : match?.away_team;
      return (
        <div className="relative flex items-center justify-center">
          {penTeam?.logo_url && <img src={penTeam.logo_url} className="w-12 h-12 object-contain inline-block drop-shadow-md opacity-90" />}
          <div className="absolute -bottom-1 -right-2 bg-slate-900 text-sm font-black px-2 py-0.5 rounded text-yellow-500 border border-slate-700">P</div>
        </div>
      );
    }

    return <div className="text-xl font-black bg-slate-900 px-3 py-1 rounded text-yellow-500 border border-slate-700 shadow-sm">X</div>;
  };

  const getBadgeClass = (color: string) => {
    if (color === 'GREEN') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (color === 'BLUE') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (color === 'YELLOW') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in overflow-y-auto">
        <div className="bg-card w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] rounded-xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border relative">
          
          {/* CABEÇALHO */}
          <div className="p-4 sm:p-5 md:p-6 border-b border-border flex justify-between items-center bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 flex-shrink-0">
            <h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight">Comparação Direta</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-3 hover:bg-white/10 rounded-xl transition-colors bg-white/5">
              <X size={32} className="sm:w-[36px] sm:h-[36px]" />
            </button>
          </div>

          {/* NOMES DOS USUÁRIOS - TEXTO GRANDE */}
          <div className="grid grid-cols-3 text-center py-4 sm:py-5 bg-slate-950/50 border-b border-border text-base sm:text-lg md:text-xl font-bold uppercase text-slate-400 tracking-wider flex-shrink-0">
            <div className="text-primary truncate px-2 sm:px-4 text-lg sm:text-xl md:text-2xl">{userA?.name || 'Você'}</div>
            <div className="text-slate-500 text-xl sm:text-2xl md:text-3xl font-black">VS</div>
            <div className="text-amber-500 truncate px-2 sm:px-4 text-lg sm:text-xl md:text-2xl">{userB?.name || 'Oponente'}</div>
          </div>

          {/* ABAS - TEXTO GRANDE */}
          <div className="flex border-b border-border bg-background/40 flex-shrink-0">
            <button 
              onClick={() => setActiveTab('groups')} 
              className={`flex-1 py-4 sm:py-5 md:py-6 text-base sm:text-lg md:text-xl font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'groups' 
                  ? 'border-b-2 border-primary text-white bg-primary/10' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Grupos
            </button>
            <button 
              onClick={() => setActiveTab('playoffs')} 
              className={`flex-1 py-4 sm:py-5 md:py-6 text-base sm:text-lg md:text-xl font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'playoffs' 
                  ? 'border-b-2 border-primary text-white bg-primary/10' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Mata-Mata
            </button>
          </div>

          {/* SELETOR DE DATAS - BOTÕES GRANDES */}
          <div className="p-3 sm:p-4 md:p-5 bg-background/30 border-b border-border/50 flex-shrink-0">
            {datesArray.length === 0 ? (
              <p className="text-base sm:text-lg text-slate-500 text-center py-3">Nenhum confronto agendado.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={scrollLeft}
                    className="hidden sm:flex p-3 rounded-xl bg-card/50 border border-border hover:bg-card hover:border-slate-500 transition-colors flex-shrink-0"
                  >
                    <ChevronLeft size={28} className="text-slate-400" />
                  </button>

                  <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-thin flex-1 py-1.5 px-1"
                    style={{ 
                      scrollbarWidth: 'thin',
                      WebkitOverflowScrolling: 'touch',
                      scrollSnapType: 'x proximity'
                    }}
                  >
                    <Calendar size={24} className="text-slate-500 flex-shrink-0 hidden sm:block" />
                    
                    {datesArray.map((dayGroup: DayGroup) => {
                      const isToday = dayGroup.dateKey === todayStr;
                      const isSelected = selectedDate === dayGroup.dateKey;
                      const matchCount = dayGroup.matches.length;
                      
                      return (
                        <button
                          key={dayGroup.dateKey}
                          data-date={dayGroup.dateKey}
                          onClick={() => scrollToDate(dayGroup.dateKey)}
                          className={`py-2.5 sm:py-3 px-4 sm:px-5 md:px-6 text-base sm:text-lg font-bold rounded-xl border-2 transition-all flex-shrink-0 flex items-center gap-2 ${
                            isSelected 
                              ? 'bg-primary text-slate-900 border-primary shadow-lg scale-105' 
                              : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-400 hover:bg-white/5'
                          }`}
                        >
                          <span>{isToday ? '📅 HOJE' : dayGroup.dateLabel}</span>
                          <span className={`text-sm px-3 py-0.5 rounded-full ${
                            isSelected ? 'bg-slate-900/30 text-slate-800' : 'bg-slate-900/60 text-slate-400'
                          }`}>
                            {matchCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={scrollRight}
                    className="hidden sm:flex p-3 rounded-xl bg-card/50 border border-border hover:bg-card hover:border-slate-500 transition-colors flex-shrink-0"
                  >
                    <ChevronRight size={28} className="text-slate-400" />
                  </button>

                  <button
                    onClick={() => setShowAllDates(!showAllDates)}
                    className="sm:hidden p-3 rounded-xl bg-primary/15 border border-primary/30 hover:bg-primary/25 transition-colors flex-shrink-0"
                  >
                    <CalendarDays size={28} className="text-primary" />
                  </button>
                </div>

                {/* Lista expandida - Mobile com textos grandes */}
                {showAllDates && (
                  <div className="sm:hidden grid grid-cols-2 gap-2 p-3 bg-background/40 rounded-xl border border-border/50 animate-in slide-in-from-top-2">
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
                          className={`py-3 px-4 text-base font-bold rounded-xl border-2 transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'bg-primary text-slate-900 border-primary' 
                              : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-400 hover:bg-white/5'
                          }`}
                        >
                          <span>{isToday ? '📅 HOJE' : dayGroup.dateLabel}</span>
                          <span className={`text-sm px-3 py-0.5 rounded-full ${
                            isSelected ? 'bg-slate-900/30 text-slate-800' : 'bg-slate-900/60 text-slate-400'
                          }`}>
                            {matchCount}
                          </span>
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setShowAllDates(false)}
                      className="col-span-2 py-3 text-base text-slate-400 hover:text-white bg-card/40 rounded-xl border border-border/50 transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                {/* Indicador de scroll - Mobile */}
                {!showAllDates && datesArray.length > 3 && (
                  <div className="sm:hidden flex items-center justify-between px-1">
                    <span className="text-sm text-slate-500 animate-pulse flex items-center gap-1">
                      <span>←</span> Deslize <span>→</span>
                    </span>
                    <span className="text-sm text-slate-500 bg-slate-900/40 px-3 py-0.5 rounded-full">
                      {datesArray.length} datas
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CORPO PRINCIPAL - JOGOS COM TUDO GRANDE */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scrollbar-thin relative bg-background/10">
            {currentMatches.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-60">
                <Users size={64} className="sm:w-[72px] sm:h-[72px]" />
                <p className="text-xl sm:text-2xl font-bold uppercase tracking-wider">Nenhum jogo nesta data</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                {currentMatches.map((m: any) => {
                  const guessA = m?.palpites?.[userA?.id];
                  const guessB = m?.palpites?.[userB?.id];
                  const isPlayoff = isPlayoffPhase(m?.phase);
                  const hasPenalties = m?.home_penalty !== null && m?.away_penalty !== null && m?.status === 'FINISHED';

                  return (
                    <div key={m.id} className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-xl flex flex-col items-center">
                      
                      {/* Cabeçalho do Jogo - GRANDE */}
                      <div className="flex items-center justify-between w-full mb-4 pb-4 border-b border-border/50">
                        <div className="flex items-center gap-3 sm:gap-4 w-1/3 justify-end">
                          <span className="font-display font-bold text-base sm:text-lg md:text-xl text-slate-200 text-right truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px]">
                            {m?.home_team?.short_code || m?.home_team?.name}
                          </span>
                          {m?.home_team?.logo_url && (
                            <img 
                              src={m.home_team.logo_url} 
                              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain flex-shrink-0" 
                            />
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center w-1/3">
                          <div className="flex flex-col items-center">
                            <span className="text-2xl sm:text-3xl md:text-4xl font-black bg-slate-900 px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-white border border-border/60">
                              {m.status === 'FINISHED' ? `${m.home_score}:${m.away_score}` : '-:-'}
                            </span>
                            {isPlayoff && hasPenalties && (
                              <span className="text-sm sm:text-base font-bold text-yellow-400 bg-slate-900/80 px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg mt-1.5 border border-yellow-500/30">
                                PÊN: {m.home_penalty}:{m.away_penalty}
                              </span>
                            )}
                          </div>
                          <span className="text-sm sm:text-base font-bold uppercase tracking-widest mt-1.5 text-slate-500">
                            {getTime(m.match_time)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 w-1/3 justify-start">
                          {m?.away_team?.logo_url && (
                            <img 
                              src={m.away_team.logo_url} 
                              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain flex-shrink-0" 
                            />
                          )}
                          <span className="font-display font-bold text-base sm:text-lg md:text-xl text-slate-200 text-left truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px]">
                            {m?.away_team?.short_code || m?.away_team?.name}
                          </span>
                        </div>
                      </div>

                      {/* Palpites lado a lado - GRANDES */}
                      <div className="flex items-start justify-center w-full gap-3 sm:gap-4 md:gap-5">
                        
                        {/* Palpite User A */}
                        <div className="flex flex-col items-center space-y-2 sm:space-y-2.5 flex-1">
                          <span className="text-sm sm:text-base md:text-lg text-primary font-bold uppercase tracking-widest truncate max-w-[70px] sm:max-w-[100px] md:max-w-[120px]">
                            {userA?.name}
                          </span>
                          <div className="h-12 sm:h-14 flex items-center justify-center">
                            {getWinnerBadge(guessA, m)}
                          </div>
                          <div className="bg-slate-950/80 border-2 border-primary/40 w-full py-2 sm:py-2.5 rounded-xl text-xl sm:text-2xl md:text-3xl font-bold font-display text-primary shadow-inner text-center">
                            {guessA ? `${guessA.home}:${guessA.away}` : '-:-'}
                          </div>
                          {m?.status === 'FINISHED' && guessA ? (
                            <span className={`text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold w-full text-center border-2 ${getBadgeClass(guessA.color)}`}>
                              +{guessA.pts || 0} pts
                            </span>
                          ) : <span className="h-[34px] sm:h-[40px]"></span>}
                        </div>

                        <div className="flex flex-col items-center pt-4 sm:pt-6 md:pt-8">
                          <span className="text-base sm:text-lg md:text-xl font-black text-slate-500 uppercase bg-background/60 px-3 sm:px-4 py-2 rounded-full border-2 border-border/50">
                            VS
                          </span>
                        </div>

                        {/* Palpite User B */}
                        <div className="flex flex-col items-center space-y-2 sm:space-y-2.5 flex-1">
                          <span className="text-sm sm:text-base md:text-lg text-amber-500 font-bold uppercase tracking-widest truncate max-w-[70px] sm:max-w-[100px] md:max-w-[120px]">
                            {userB?.name}
                          </span>
                          <div className="h-12 sm:h-14 flex items-center justify-center">
                            {getWinnerBadge(guessB, m)}
                          </div>
                          <div className="bg-slate-950/80 border-2 border-amber-500/40 w-full py-2 sm:py-2.5 rounded-xl text-xl sm:text-2xl md:text-3xl font-bold font-display text-amber-500 shadow-inner text-center">
                            {guessB ? `${guessB.home}:${guessB.away}` : '-:-'}
                          </div>
                          {m?.status === 'FINISHED' && guessB ? (
                            <span className={`text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold w-full text-center border-2 ${getBadgeClass(guessB.color)}`}>
                              +{guessB.pts || 0} pts
                            </span>
                          ) : <span className="h-[34px] sm:h-[40px]"></span>}
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