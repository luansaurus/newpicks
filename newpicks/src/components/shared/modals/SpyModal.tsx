'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Users, Calendar, Clock, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
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

export function SpyModal({ isOpen, onClose, targetUser, matches, rankingUsers }: any) {
  const [activeTab, setActiveTab] = useState<'groups' | 'playoffs'>('groups');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
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
        const hasToday = sortedDays.some(d => d.dateKey === todayStr);
        setSelectedDate(hasToday ? todayStr : sortedDays[0].dateKey);
      }
    }
  }, [isOpen, activeTab, daysDependency]);

  const currentMatches = [...(groupedMatches[selectedDate]?.matches || [])].sort((a, b) => {
    return new Date(a.match_time).getTime() - new Date(b.match_time).getTime();
  });

  const matchesDependency = currentMatches.map(m => m.id).join(',');
  useEffect(() => {
    if (currentMatches.length > 0) {
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
    if (!guess) return <Minus size={14} className="text-slate-600" />;
    if (guess.home > guess.away) return <img src={match?.home_team?.logo_url || ''} className="w-5 h-5 object-contain inline-block drop-shadow-md" />;
    if (guess.away > guess.home) return <img src={match?.away_team?.logo_url || ''} className="w-5 h-5 object-contain inline-block drop-shadow-md" />;
    
    if (isPlayoffPhase(match?.phase) && guess.penalty_winner) {
      const isHomePen = guess.penalty_winner === 'home' || String(guess.penalty_winner) === String(match?.home_team?.id);
      const penTeam = isHomePen ? match?.home_team : match?.away_team;
      return (
        <div className="relative flex items-center justify-center">
          {penTeam?.logo_url && <img src={penTeam.logo_url} className="w-5 h-5 object-contain inline-block drop-shadow-md opacity-90" />}
          <div className="absolute -bottom-1 -right-2 bg-slate-900 text-[8px] font-black px-0.5 rounded text-yellow-500 border border-slate-700">P</div>
        </div>
      );
    }
    return <div className="text-[10px] font-black bg-slate-900 px-1.5 rounded text-yellow-500 border border-slate-700 shadow-sm">X</div>;
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/90 z-[100] flex items-start sm:items-center justify-center p-1 sm:p-3 md:p-6 animate-in fade-in overflow-y-auto">
        <div className="bg-card w-full max-w-6xl max-h-[98vh] sm:max-h-[90vh] md:max-h-[85vh] rounded-xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border relative my-1 sm:my-0">
          
          {/* CABEÇALHO FIXO COM STICKY */}
          <div className="p-2 sm:p-3 md:p-4 border-b border-border flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex-shrink-0">
            <div>
              <h2 className="font-display font-bold text-sm sm:text-base md:text-lg uppercase tracking-tight leading-tight">Espião de Palpites</h2>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-400">Alvo: <span className="text-primary font-bold">{targetUser?.name || 'Geral da Liga'}</span></p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors bg-white/5">
              <X size={20} className="sm:w-[24px] sm:h-[24px]" />
            </button>
          </div>

          {/* ABAS: GRUPOS / MATA-MATA */}
          <div className="flex border-b border-border bg-background/30 flex-shrink-0">
            <button 
              onClick={() => setActiveTab('groups')} 
              className={`flex-1 py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'groups' 
                  ? 'border-b-2 border-primary text-white bg-primary/5' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Grupos
            </button>
            <button 
              onClick={() => setActiveTab('playoffs')} 
              className={`flex-1 py-2 sm:py-2.5 md:py-3 text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider transition-colors ${
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
            {sortedDays.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-1">Nenhuma data cadastrada.</p>
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
                    
                    {sortedDays.map((dayGroup: DayGroup) => {
                      const isToday = dayGroup.dateKey === todayStr;
                      const isSelected = selectedDate === dayGroup.dateKey;
                      const matchCount = dayGroup.matches.length;
                      
                      return (
                        <button
                          key={dayGroup.dateKey}
                          data-date={dayGroup.dateKey}
                          onClick={() => scrollToDate(dayGroup.dateKey)}
                          className={`py-0.5 sm:py-1 md:py-1.5 px-1.5 sm:px-2 md:px-3 text-[8px] sm:text-[10px] md:text-[11px] lg:text-xs font-bold rounded-lg border transition-all flex-shrink-0 flex items-center gap-0.5 sm:gap-1 ${
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
                {!showAllDates && sortedDays.length > 4 && (
                  <div className="sm:hidden flex items-center justify-between px-0.5">
                    <span className="text-[7px] text-slate-600 animate-pulse flex items-center gap-0.5">
                      <span>←</span> Deslize <span>→</span>
                    </span>
                    <span className="text-[7px] text-slate-600 bg-slate-900/30 px-1.5 py-0.5 rounded-full">
                      {sortedDays.length} datas
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CORPO PRINCIPAL */}
          <div className="flex flex-col flex-1 overflow-hidden bg-background/5 min-h-0">
            
            {/* MESTRE: GRID DE JOGOS COMPACTO */}
            <div className="p-1.5 sm:p-2 md:p-3 lg:p-4 border-b border-border/40 overflow-y-auto max-h-[20vh] sm:max-h-[25vh] md:max-h-[30vh] lg:max-h-[35vh] scrollbar-thin flex-shrink-0 bg-background/10">
              {currentMatches.length === 0 ? (
                <div className="text-center text-slate-500 text-xs sm:text-sm py-2 sm:py-4">Nenhum confronto neste dia.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3">
                  {currentMatches.map((m: any) => {
                    const isSelected = selectedMatchId === m.id;
                    
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
                        className={`relative flex flex-col p-1.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl border transition-all hover:-translate-y-0.5 ${
                          isSelected 
                            ? 'bg-primary/10 border-primary shadow-sm' 
                            : 'bg-card border-border hover:border-slate-500 opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-1 sm:mb-2 opacity-70">
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase">
                            <Clock size={6} className="sm:w-[8px] sm:h-[8px] inline mr-0.5 -mt-0.5"/>{getTime(m.match_time)}
                          </span>
                          <span className="text-[6px] sm:text-[7px] md:text-[8px] lg:text-[9px] font-black uppercase bg-slate-900 px-0.5 sm:px-1 rounded">
                            {m.status === 'FINISHED' ? 'FT' : 'Agendado'}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between w-full mb-1 sm:mb-2 px-0.5 sm:px-1">
                          {m?.home_team?.logo_url ? 
                            <img src={m.home_team.logo_url} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 object-contain" /> : 
                            <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6" />
                          }
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-bold truncate max-w-[30px] sm:max-w-[40px]">
                            {m?.home_team?.short_code}
                          </div>
                          <div className="text-[10px] sm:text-sm md:text-base lg:text-lg font-black bg-slate-950/60 px-0.5 sm:px-1 md:px-1.5 py-0.5 rounded border border-border/50 text-slate-300 text-center min-w-[25px] sm:min-w-[30px] md:min-w-[40px] lg:min-w-[50px]">
                            {m.status === 'FINISHED' ? `${m.home_score}:${m.away_score}` : '-:-'}
                          </div>
                          <div className="text-[9px] sm:text-[10px] md:text-xs font-bold truncate max-w-[30px] sm:max-w-[40px]">
                            {m?.away_team?.short_code}
                          </div>
                          {m?.away_team?.logo_url ? 
                            <img src={m.away_team.logo_url} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 object-contain" /> : 
                            <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6" />
                          }
                        </div>

                        <div className="w-full flex justify-between px-0.5 sm:px-1 text-[11px] sm:text-[13px] md:text-[15px] font-bold">
                          <span className="text-primary">{hV}</span>
                          <span className="text-slate-500">{dV}</span>
                          <span className="text-amber-500">{aV}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DETALHE: GRID DOS JOGADORES NA PARTIDA SELECIONADA */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-5 scrollbar-thin relative min-h-0">
              {!activeMatch ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 sm:gap-3 opacity-50">
                  <Users size={28} className="sm:w-[40px] sm:h-[40px]" />
                  <p className="text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wider text-center">Selecione um jogo acima</p>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  
                  <div className="flex flex-col items-center mb-3 sm:mb-4 md:mb-5 bg-background/50 border border-border/50 rounded-lg sm:rounded-xl py-2 sm:py-3 shadow-inner">
                    <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {activeMatch?.home_team?.logo_url ? 
                          <img src={activeMatch.home_team.logo_url} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 object-contain" /> :
                          <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                        }
                        <span className="font-display font-bold text-xs sm:text-sm md:text-base lg:text-lg text-slate-300 truncate max-w-[50px] sm:max-w-[70px] md:max-w-[100px] text-right">
                          {activeMatch?.home_team?.short_code}
                        </span>
                      </div>
                      <span className="text-sm sm:text-base md:text-lg lg:text-xl font-black bg-slate-900 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-xl text-white border border-border">
                        {activeMatch.status === 'FINISHED' ? `${activeMatch.home_score} : ${activeMatch.away_score}` : '- : -'}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="font-display font-bold text-xs sm:text-sm md:text-base lg:text-lg text-slate-300 truncate max-w-[50px] sm:max-w-[70px] md:max-w-[100px] text-left">
                          {activeMatch?.away_team?.short_code}
                        </span>
                        {activeMatch?.away_team?.logo_url ? 
                          <img src={activeMatch.away_team.logo_url} className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 object-contain" /> :
                          <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                        }
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3">
                    {usersList.map((uid: string) => {
                      const guess = activeMatch.palpites?.[uid];
                      if (!guess) return null;
                      const fallbackName = rankingUsers?.find((u:any) => u?.id === uid)?.name || 'Membro';

                      return (
                        <div key={uid} className="bg-card border border-border/80 p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl flex flex-col items-center relative overflow-hidden shadow-sm">
                          <div className="mb-0.5 sm:mb-1 md:mb-2 h-4 sm:h-5 flex items-center justify-center">
                            {getWinnerBadge(guess, activeMatch)}
                          </div>

                          <span className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] font-bold text-slate-300 truncate w-full text-center pb-0.5 sm:pb-1 md:pb-2">
                            {guess?.name || fallbackName}
                          </span>
                          
                          <div className="flex flex-col items-center w-full">
                            <div className="bg-background/80 border border-border/60 w-full py-1 sm:py-1.5 md:py-2 rounded-lg flex items-center justify-center gap-0.5 sm:gap-1 font-display font-bold text-[10px] sm:text-xs md:text-sm shadow-inner">
                              <span className="text-white">{guess.home ?? '-'}</span>
                              <span className="text-slate-600 text-[8px] sm:text-[10px]">:</span>
                              <span className="text-white">{guess.away ?? '-'}</span>
                            </div>

                            {isPlayoffPhase(activeMatch?.phase) && guess.home === guess.away && guess.penalty_winner && (
                              <div className="text-[6px] sm:text-[7px] md:text-[8px] text-slate-400 mt-0.5 sm:mt-1 uppercase tracking-widest text-center bg-slate-950 px-1 sm:px-1.5 py-0.5 rounded border border-slate-800">
                                Pên: {guess.penalty_winner === 'home' || String(guess.penalty_winner) === String(activeMatch?.home_team?.id) 
                                  ? activeMatch?.home_team?.short_code 
                                  : activeMatch?.away_team?.short_code}
                              </div>
                            )}

                            {activeMatch?.status === 'FINISHED' && (
                              <span className={`text-[7px] sm:text-[8px] md:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded border uppercase tracking-wider mt-1 sm:mt-1.5 w-full text-center ${
                                guess.color === 'GREEN' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                guess.color === 'BLUE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                guess.color === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                +{guess.pts || 0} pts
                              </span>
                            )}
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