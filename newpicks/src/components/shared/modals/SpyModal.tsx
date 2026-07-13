'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Users, Calendar, Clock, ChevronLeft, ChevronRight, CalendarDays, Lock } from 'lucide-react';
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

// Função para verificar se o jogo está liberado (faltam 10min ou menos)
const isMatchUnlocked = (matchTime: string | Date): boolean => {
  if (!matchTime) return false;
  try {
    const matchDate = new Date(matchTime);
    if (isNaN(matchDate.getTime())) return false;
    
    const now = new Date();
    const timeDiff = matchDate.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    // Liberado quando faltam 10 minutos ou menos, ou se o jogo já começou
    return minutesDiff <= 10;
  } catch {
    return false;
  }
};

// Função para encontrar o próximo jogo não iniciado
const findNextUnstartedMatch = (matches: any[]): any => {
  const now = new Date();
  const futureMatches = matches
    .filter(m => new Date(m.match_time) > now)
    .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());
  
  return futureMatches[0] || null;
};

export function SpyModal({ isOpen, onClose, targetUser, matches, rankingUsers }: any) {
  const [activeTab, setActiveTab] = useState<'groups' | 'playoffs'>('groups');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [showAllDates, setShowAllDates] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const todayStr = getFormattedDate(new Date());

  // Função para determinar a data inicial
  const getInitialDate = (datesArray: DayGroup[], matches: any[]) => {
    if (!datesArray.length) return '';
    
    // Tenta abrir hoje se tiver jogos
    const hasToday = datesArray.some(d => d.dateKey === todayStr);
    if (hasToday) return todayStr;
    
    // Se não tiver jogos hoje, tenta o próximo jogo
    const nextMatch = findNextUnstartedMatch(matches);
    if (nextMatch) {
      const nextDateKey = getFormattedDate(nextMatch.match_time);
      const dateExists = datesArray.some(d => d.dateKey === nextDateKey);
      if (dateExists) return nextDateKey;
    }
    
    // Fallback: primeiro dia disponível
    return datesArray[0]?.dateKey || '';
  };

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

  const groupedMatches = phaseMatches.reduce((groups: Record<string, DayGroup>, match: any) => {
    const dateKey = getFormattedDate(match?.match_time);
    if (!dateKey) return groups;
    
    if (!groups[dateKey]) {
      const dateObj = new Date(match.match_time);
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      groups[dateKey] = {
        dateKey,
        dateLabel: `${weekday}, ${dayMonth}`,
        rawDate: dateObj,
        matches: []
      };
    }
    groups[dateKey].matches.push(match);
    return groups;
  }, {} as Record<string, DayGroup>);

  const sortedDays = (Object.values(groupedMatches) as DayGroup[]).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  const daysDependency = sortedDays.map(d => d.dateKey).join(',');
  useEffect(() => {
    if (isOpen && sortedDays.length > 0) {
      const dateExists = sortedDays.some(d => d.dateKey === selectedDate);
      if (!dateExists) {
        const initialDate = getInitialDate(sortedDays, phaseMatches);
        setSelectedDate(initialDate);
      }
    }
  }, [isOpen, activeTab, daysDependency, phaseMatches]);

  const currentMatches = [...(groupedMatches[selectedDate]?.matches || [])].sort((a, b) => {
    return new Date(a.match_time).getTime() - new Date(b.match_time).getTime();
  });

  const matchesDependency = currentMatches.map(m => m.id).join(',');
  useEffect(() => {
    if (currentMatches.length > 0) {
      // Tenta selecionar o próximo jogo não iniciado
      const nextMatch = findNextUnstartedMatch(currentMatches);
      if (nextMatch) {
        setSelectedMatchId(nextMatch.id);
        return;
      }
      
      // Fallback: primeiro jogo da lista
      const matchExists = currentMatches.some(m => m.id === selectedMatchId);
      if (!matchExists) {
        setSelectedMatchId(currentMatches[0].id);
      }
    } else {
      setSelectedMatchId(null);
    }
  }, [selectedDate, matchesDependency]);

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

  const usersList = targetUser?.id === 'ALL' && rankingUsers 
    ? rankingUsers.map((u: any) => u?.id).filter(Boolean)
    : [targetUser?.id].filter(Boolean);

  const activeMatch = currentMatches.find(m => m.id === selectedMatchId);

  const getWinnerBadge = (guess: any, match: any) => {
    if (!guess) return <Minus size={16} className="text-slate-600" />;
    
    // Verifica se o jogo está liberado - REGRA IGUAL PARA TODOS
    if (!isMatchUnlocked(match?.match_time)) {
      return <Lock size={16} className="text-yellow-500" />;
    }
    
    if (guess.home > guess.away) return <img src={match?.home_team?.logo_url || ''} className="w-6 h-6 sm:w-7 sm:h-7 object-contain inline-block drop-shadow-md" />;
    if (guess.away > guess.home) return <img src={match?.away_team?.logo_url || ''} className="w-6 h-6 sm:w-7 sm:h-7 object-contain inline-block drop-shadow-md" />;
    
    if (isPlayoffPhase(match?.phase) && guess.penalty_winner) {
      const isHomePen = guess.penalty_winner === 'home' || String(guess.penalty_winner) === String(match?.home_team?.id);
      const penTeam = isHomePen ? match?.home_team : match?.away_team;
      return (
        <div className="relative flex items-center justify-center">
          {penTeam?.logo_url && <img src={penTeam.logo_url} className="w-6 h-6 sm:w-7 sm:h-7 object-contain inline-block drop-shadow-md opacity-90" />}
          <div className="absolute -bottom-1 -right-2 bg-slate-900 text-[10px] font-black px-1 rounded text-yellow-500 border border-slate-700">P</div>
        </div>
      );
    }
    return <div className="text-sm font-black bg-slate-900 px-2 rounded text-yellow-500 border border-slate-700 shadow-sm">X</div>;
  };

  // Função para verificar se deve mostrar o palpite - REGRA IGUAL PARA TODOS
  const shouldShowGuess = (match: any): boolean => {
    return isMatchUnlocked(match?.match_time);
  };

  // Função para verificar se deve mostrar os pontos - REGRA IGUAL PARA TODOS
  const shouldShowPoints = (match: any): boolean => {
    return isMatchUnlocked(match?.match_time) && match?.status === 'FINISHED';
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in overflow-y-auto">
        <div className="bg-card w-full max-w-6xl max-h-[98vh] sm:max-h-[95vh] rounded-xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border relative">
          
          {/* CABEÇALHO - MAIOR EM MOBILE */}
          <div className="p-3 sm:p-4 md:p-5 border-b border-border flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex-shrink-0">
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg md:text-xl uppercase tracking-tight leading-tight">Espião de Palpites</h2>
              <p className="text-xs sm:text-sm text-slate-400">Alvo: <span className="text-primary font-bold">{targetUser?.name || 'Geral da Liga'}</span></p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors bg-white/5">
              <X size={24} className="sm:w-[28px] sm:h-[28px]" />
            </button>
          </div>

          {/* ABAS - MAIORES */}
          <div className="flex border-b border-border bg-background/30 flex-shrink-0">
            <button 
              onClick={() => setActiveTab('groups')} 
              className={`flex-1 py-3 sm:py-3.5 md:py-4 text-sm sm:text-base font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'groups' 
                  ? 'border-b-2 border-primary text-white bg-primary/5' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Grupos
            </button>
            <button 
              onClick={() => setActiveTab('playoffs')} 
              className={`flex-1 py-3 sm:py-3.5 md:py-4 text-sm sm:text-base font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'playoffs' 
                  ? 'border-b-2 border-primary text-white bg-primary/5' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Mata-Mata
            </button>
          </div>

          {/* SELETOR DE DATAS - MAIOR */}
          <div className="p-2 sm:p-3 md:p-4 bg-background/20 border-b border-border/40 flex-shrink-0">
            {sortedDays.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-2">Nenhuma data cadastrada.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={scrollLeft}
                    className="hidden sm:flex p-2 rounded-lg bg-card/50 border border-border hover:bg-card hover:border-slate-500 transition-colors flex-shrink-0"
                  >
                    <ChevronLeft size={20} className="text-slate-400" />
                  </button>

                  <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-thin flex-1 py-1 px-1"
                    style={{ 
                      scrollbarWidth: 'thin',
                      WebkitOverflowScrolling: 'touch',
                      scrollSnapType: 'x proximity'
                    }}
                  >
                    <Calendar size={16} className="text-slate-500 flex-shrink-0 hidden sm:block" />
                    
                    {sortedDays.map((dayGroup: DayGroup) => {
                      const isToday = dayGroup.dateKey === todayStr;
                      const isSelected = selectedDate === dayGroup.dateKey;
                      const matchCount = dayGroup.matches.length;
                      
                      return (
                        <button
                          key={dayGroup.dateKey}
                          data-date={dayGroup.dateKey}
                          onClick={() => scrollToDate(dayGroup.dateKey)}
                          className={`py-1.5 sm:py-2 px-2.5 sm:px-3 md:px-4 text-xs sm:text-sm font-bold rounded-lg border transition-all flex-shrink-0 flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-primary text-slate-900 border-primary shadow-md scale-105' 
                              : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-500 hover:bg-white/5'
                          }`}
                        >
                          <span>{isToday ? '📅 HOJE' : dayGroup.dateLabel}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-slate-900/20 text-slate-800' : 'bg-slate-900/50 text-slate-500'
                          }`}>
                            {matchCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={scrollRight}
                    className="hidden sm:flex p-2 rounded-lg bg-card/50 border border-border hover:bg-card hover:border-slate-500 transition-colors flex-shrink-0"
                  >
                    <ChevronRight size={20} className="text-slate-400" />
                  </button>

                  <button
                    onClick={() => setShowAllDates(!showAllDates)}
                    className="sm:hidden p-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors flex-shrink-0"
                  >
                    <CalendarDays size={20} className="text-primary" />
                  </button>
                </div>

                {/* Lista expandida - Mobile */}
                {showAllDates && (
                  <div className="sm:hidden grid grid-cols-2 gap-1.5 p-3 bg-background/30 rounded-lg border border-border/50 animate-in slide-in-from-top-2">
                    {sortedDays.map((dayGroup: DayGroup) => {
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
                          className={`py-2 px-3 text-sm font-bold rounded-lg border transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'bg-primary text-slate-900 border-primary' 
                              : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-500 hover:bg-white/5'
                          }`}
                        >
                          <span>{isToday ? '📅 HOJE' : dayGroup.dateLabel}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-slate-900/20 text-slate-800' : 'bg-slate-900/50 text-slate-500'
                          }`}>
                            {matchCount}
                          </span>
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setShowAllDates(false)}
                      className="col-span-2 py-2 text-sm text-slate-500 hover:text-white bg-card/30 rounded-lg border border-border/50 transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                )}

                {/* Indicador de scroll - Mobile */}
                {!showAllDates && sortedDays.length > 4 && (
                  <div className="sm:hidden flex items-center justify-between px-1">
                    <span className="text-[10px] text-slate-600 animate-pulse flex items-center gap-1">
                      <span>←</span> Deslize <span>→</span>
                    </span>
                    <span className="text-[10px] text-slate-600 bg-slate-900/30 px-2 py-0.5 rounded-full">
                      {sortedDays.length} datas
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CORPO PRINCIPAL */}
          <div className="flex flex-col flex-1 overflow-hidden bg-background/5 min-h-0">
            
            {/* MESTRE: GRID DE JOGOS - MAIOR */}
            <div className="p-2 sm:p-3 md:p-4 border-b border-border/40 overflow-y-auto max-h-[25vh] sm:max-h-[30vh] md:max-h-[35vh] scrollbar-thin flex-shrink-0 bg-background/10">
              {currentMatches.length === 0 ? (
                <div className="text-center text-slate-500 text-sm sm:text-base py-4 sm:py-6">Nenhum confronto neste dia.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {currentMatches.map((m: any) => {
                    const isSelected = selectedMatchId === m.id;
                    const isUnlocked = isMatchUnlocked(m?.match_time);
                    
                    let hV=0, dV=0, aV=0;
                    usersList.forEach((uid: string) => {
                      const guess = m.palpites?.[uid];
                      if (guess) {
                        if (guess.home > guess.away) hV++; 
                        else if (guess.away > guess.home) aV++; 
                        else dV++;
                      }
                    });

                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMatchId(m.id)}
                        className={`relative flex flex-col p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all hover:-translate-y-0.5 ${
                          isSelected 
                            ? 'bg-primary/10 border-primary shadow-sm' 
                            : 'bg-card border-border hover:border-slate-500 opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-2 opacity-70">
                          <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase">
                            <Clock size={12} className="sm:w-[14px] sm:h-[14px] inline mr-1 -mt-0.5"/>{getTime(m.match_time)}
                          </span>
                          <span className="text-[10px] sm:text-xs font-black uppercase bg-slate-900 px-1.5 sm:px-2 rounded">
                            {m.status === 'FINISHED' ? 'FT' : 'Agendado'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between w-full mb-2 px-1">
                          {m?.home_team?.logo_url ? 
                            <img src={m.home_team.logo_url} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" /> : 
                            <div className="w-6 h-6 sm:w-8 sm:h-8" />
                          }
                          <div className="text-sm sm:text-base font-bold truncate max-w-[40px] sm:max-w-[50px]">
                            {m?.home_team?.short_code}
                          </div>
                          <div className="text-base sm:text-lg md:text-xl font-black bg-slate-950/60 px-1.5 sm:px-2 py-1 rounded border border-border/50 text-slate-300 text-center min-w-[40px] sm:min-w-[50px] md:min-w-[60px]">
                            {m.status === 'FINISHED' ? `${m.home_score}:${m.away_score}` : '-:-'}
                          </div>
                          <div className="text-sm sm:text-base font-bold truncate max-w-[40px] sm:max-w-[50px]">
                            {m?.away_team?.short_code}
                          </div>
                          {m?.away_team?.logo_url ? 
                            <img src={m.away_team.logo_url} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" /> : 
                            <div className="w-6 h-6 sm:w-8 sm:h-8" />
                          }
                        </div>

                        <div className="w-full flex justify-between px-1 text-base sm:text-lg font-bold">
                          <span className="text-primary">{hV}</span>
                          <span className="text-slate-500">{dV}</span>
                          <span className="text-amber-500">{aV}</span>
                        </div>
                        {!isUnlocked && m.status === 'FINISHED' && (
                          <div className="absolute top-1 right-1">
                            <Lock size={14} className="text-yellow-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DETALHE: GRID DOS JOGADORES - MAIOR */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-5 scrollbar-thin relative min-h-0">
              {!activeMatch ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 opacity-50">
                  <Users size={40} className="sm:w-[48px] sm:h-[48px]" />
                  <p className="text-sm sm:text-base font-bold uppercase tracking-wider text-center">Selecione um jogo acima</p>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  
                  <div className="flex flex-col items-center mb-4 sm:mb-5 bg-background/50 border border-border/50 rounded-xl sm:rounded-2xl py-3 sm:py-4 shadow-inner">
                    <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        {activeMatch?.home_team?.logo_url ? 
                          <img src={activeMatch.home_team.logo_url} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" /> :
                          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                        }
                        <span className="font-display font-bold text-base sm:text-lg md:text-xl text-slate-300 truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px] text-right">
                          {activeMatch?.home_team?.short_code}
                        </span>
                      </div>
                      <span className="text-lg sm:text-xl md:text-2xl font-black bg-slate-900 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl text-white border border-border">
                        {activeMatch.status === 'FINISHED' ? `${activeMatch.home_score} : ${activeMatch.away_score}` : '- : -'}
                      </span>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="font-display font-bold text-base sm:text-lg md:text-xl text-slate-300 truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px] text-left">
                          {activeMatch?.away_team?.short_code}
                        </span>
                        {activeMatch?.away_team?.logo_url ? 
                          <img src={activeMatch.away_team.logo_url} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" /> :
                          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                        }
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                    {usersList.map((uid: string) => {
                      const guess = activeMatch.palpites?.[uid];
                      if (!guess) return null;
                      const fallbackName = rankingUsers?.find((u:any) => u?.id === uid)?.name || 'Membro';
                      const canSeeGuesses = shouldShowGuess(activeMatch);
                      const canSeePoints = shouldShowPoints(activeMatch);

                      return (
                        <div key={uid} className="bg-card border border-border/80 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center relative overflow-hidden shadow-sm">
                          <div className="mb-1 sm:mb-2 h-6 sm:h-7 flex items-center justify-center">
                            {canSeeGuesses ? getWinnerBadge(guess, activeMatch) : <Lock size={20} className="text-yellow-500" />}
                          </div>

                          <span className="text-xs sm:text-sm font-bold text-slate-300 truncate w-full text-center pb-1 sm:pb-2">
                            {guess?.name || fallbackName}
                          </span>
                          
                          <div className="flex flex-col items-center w-full">
                            <div className="bg-background/80 border border-border/60 w-full py-1.5 sm:py-2 md:py-2.5 rounded-xl flex items-center justify-center gap-1 font-display font-bold text-base sm:text-lg shadow-inner">
                              {canSeeGuesses ? (
                                <>
                                  <span className="text-white">{guess.home ?? '-'}</span>
                                  <span className="text-slate-600 text-sm sm:text-base">:</span>
                                  <span className="text-white">{guess.away ?? '-'}</span>
                                </>
                              ) : (
                                <span className="flex items-center gap-2 text-yellow-500">
                                  <Lock size={16} /> ???
                                </span>
                              )}
                            </div>

                            {isPlayoffPhase(activeMatch?.phase) && guess.home === guess.away && guess.penalty_winner && canSeeGuesses && (
                              <div className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 uppercase tracking-widest text-center bg-slate-950 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-800">
                                Pên: {guess.penalty_winner === 'home' || String(guess.penalty_winner) === String(activeMatch?.home_team?.id) 
                                  ? activeMatch?.home_team?.short_code 
                                  : activeMatch?.away_team?.short_code}
                              </div>
                            )}

                            {canSeePoints && activeMatch?.status === 'FINISHED' ? (
                              <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-lg border uppercase tracking-wider mt-1.5 sm:mt-2 w-full text-center ${
                                guess.color === 'GREEN' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                guess.color === 'BLUE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                guess.color === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                +{guess.pts || 0} pts
                              </span>
                            ) : activeMatch?.status === 'FINISHED' && !isMatchUnlocked(activeMatch?.match_time) ? (
                              <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-lg border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 uppercase tracking-wider mt-1.5 sm:mt-2 w-full text-center flex items-center justify-center gap-1">
                                <Lock size={12} /> Aguarde
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </Portal>
  );
}