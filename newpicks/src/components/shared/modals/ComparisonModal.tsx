'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { X, Minus } from 'lucide-react';
import { isPlayoffPhase } from '@/utils/leagueEngine';

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

export function ComparisonModal({ isOpen, onClose, userA, userB, matches = [] }: any) {
  const [activeTab, setActiveTab] = useState<'groups' | 'playoffs'>('groups');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const todayStr = getFormattedDate(new Date());

  const phaseMatches = (matches || []).filter((m: any) => 
    activeTab === 'groups' ? !isPlayoffPhase(m?.phase) : isPlayoffPhase(m?.phase)
  );

  const groupedByDate = phaseMatches.reduce((acc: any, m: any) => {
    const dateKey = getFormattedDate(m?.match_time);
    if (!dateKey) return acc;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(m);
    return acc;
  }, {});

  const datesArray = Object.keys(groupedByDate).sort((a, b) => {
    const partsA = a.split('/');
    const partsB = b.split('/');
    if (partsA.length !== 3 || partsB.length !== 3) return 0;
    return new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0])).getTime() - 
           new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0])).getTime();
  });

  useEffect(() => {
    if (isOpen && datesArray.length > 0) {
      if (datesArray.includes(todayStr)) setSelectedDate(todayStr);
      else setSelectedDate(datesArray[0]);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const currentMatches = groupedByDate[selectedDate] || [];

  const getWinnerBadge = (guess: any, match: any) => {
    if (!guess) return <Minus size={14} className="text-slate-600" />;
    if (guess.home > guess.away) {
      return <img src={match?.home_team?.logo_url || ''} className="w-7 h-7 object-contain inline-block drop-shadow-md" title={`Vitória: ${match?.home_team?.name || ''}`} />;
    }
    if (guess.away > guess.home) {
      return <img src={match?.away_team?.logo_url || ''} className="w-7 h-7 object-contain inline-block drop-shadow-md" title={`Vitória: ${match?.away_team?.name || ''}`} />;
    }
    
    if (isPlayoffPhase(match?.phase) && guess.penalty_winner) {
      const isHomePen = guess.penalty_winner === 'home' || String(guess.penalty_winner) === String(match?.home_team?.id);
      const penTeam = isHomePen ? match?.home_team : match?.away_team;
      return (
        <div className="relative flex items-center justify-center" title={`Vencedor Pênaltis: ${penTeam?.name || ''}`}>
          {penTeam?.logo_url && <img src={penTeam.logo_url} className="w-5 h-5 object-contain inline-block drop-shadow-md opacity-90" />}
          <div className="absolute -bottom-1 -right-2 bg-slate-900 text-[8px] font-black px-0.5 rounded text-yellow-500 border border-slate-700">P</div>
        </div>
      );
    }

    return <div className="text-[10px] font-black bg-slate-900 px-1.5 rounded text-yellow-500 border border-slate-700 shadow-sm" title="Empate">X</div>;
  };

  const getBadgeClass = (color: string) => {
    if (color === 'GREEN') return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (color === 'BLUE') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (color === 'YELLOW') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border">
        
        <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
          <h2 className="font-display font-bold text-lg uppercase tracking-tight">Comparação Direta</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-3 text-center py-2.5 bg-slate-950/40 border-b border-border text-[11px] font-bold uppercase text-slate-400 tracking-wider">
          <div className="text-primary truncate px-2">{userA?.name || 'Você'}</div>
          <div className="text-slate-600">VS</div>
          <div className="text-amber-500 truncate px-2">{userB?.name || 'Oponente'}</div>
        </div>

        <div className="flex border-b border-border bg-background/30">
          <button onClick={() => setActiveTab('groups')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'groups' ? 'border-b-2 border-primary text-white bg-primary/5' : 'text-slate-400 hover:text-slate-300'}`}>Fase de Grupos</button>
          <button onClick={() => setActiveTab('playoffs')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'playoffs' ? 'border-b-2 border-primary text-white bg-primary/5' : 'text-slate-400 hover:text-slate-300'}`}>Mata-Mata</button>
        </div>

        <div className="p-4 bg-background/20 border-b border-border/40 max-h-36 overflow-y-auto scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Selecione uma data da rodada:</span>
          {datesArray.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">Nenhum confronto agendado.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {datesArray.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all truncate ${selectedDate === date ? 'bg-primary text-slate-900 border-primary shadow-md scale-[1.01]' : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-600'}`}
                >
                  {date === todayStr ? 'HOJE 📅' : date}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1 bg-background/5 scrollbar-thin">
          {currentMatches.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-sm">Nenhum jogo nesta data.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentMatches.map((m: any) => {
                const guessA = m?.palpites?.[userA?.id];
                const guessB = m?.palpites?.[userB?.id];

                return (
                  <div key={m?.id || Math.random()} className="bg-card border border-border/80 rounded-xl p-3 shadow-sm flex flex-col hover:border-slate-600 transition-colors">
                    
                    <div className="flex flex-col items-center justify-center border-b border-border/40 pb-2 mb-3 bg-background/40 p-2 rounded-lg gap-1">
                      <div className="flex items-center gap-3">
                        <img src={m?.home_team?.logo_url || ''} className="w-8 h-8 object-contain drop-shadow" title={m?.home_team?.logo_url || ''} />
                        
                        <div className="flex items-center gap-1 font-bold font-display text-sm bg-slate-950/60 px-2 py-0.5 rounded border border-border">
                          <span className={m?.status === 'FINISHED' ? 'text-green-400' : 'text-white'}>{m?.status === 'FINISHED' ? (m?.home_score ?? '-') : '-'}</span>
                          <span className="text-slate-600 text-xs">x</span>
                          <span className={m?.status === 'FINISHED' ? 'text-green-400' : 'text-white'}>{m?.status === 'FINISHED' ? (m?.away_score ?? '-') : '-'}</span>
                        </div>
                        
                        <img src={m?.away_team?.logo_url || ''} className="w-8 h-8 object-contain drop-shadow" title={m?.away_team?.logo_url || ''} />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                        {m?.status === 'FINISHED' ? 'Encerrado' : m?.status === 'IN_PLAY' ? 'Ao Vivo' : 'Agendado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 flex-1 px-1">
                      
                      {/* PALPITE VOCÊ */}
                      <div className="flex flex-col items-center space-y-1.5 w-5/12">
                        <div className="h-6 flex items-center justify-center">{getWinnerBadge(guessA, m)}</div>
                        <div className="bg-slate-950/60 border border-primary/30 w-full py-1.5 rounded-lg text-sm font-bold font-display text-primary shadow-inner text-center flex justify-center gap-0.5">
                          {guessA ? <>{guessA.home}<span className="text-slate-700">:</span>{guessA.away}</> : <span className="text-xs text-slate-600">-:-</span>}
                        </div>
                        {isPlayoffPhase(m?.phase) && guessA?.home === guessA?.away && guessA?.penalty_winner && (
                          <div className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-widest text-center">
                            Pên: {guessA.penalty_winner === 'home' || String(guessA.penalty_winner) === String(m?.home_team?.id) ? m?.home_team?.short_code : m?.away_team?.short_code}
                          </div>
                        )}
                        {m?.status === 'FINISHED' && guessA ? (
                           <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold w-full text-center border ${getBadgeClass(guessA.color)}`}>
                             +{guessA.pts || 0} PTS
                           </span>
                        ) : <span className="h-[22px]"></span>}
                      </div>

                      <div className="text-[9px] text-slate-600 font-bold uppercase w-2/12 text-center pb-5">VS</div>

                      {/* PALPITE OPONENTE */}
                      <div className="flex flex-col items-center space-y-1.5 w-5/12">
                        <div className="h-6 flex items-center justify-center">{getWinnerBadge(guessB, m)}</div>
                        <div className="bg-slate-950/60 border border-amber-500/30 w-full py-1.5 rounded-lg text-sm font-bold font-display text-amber-500 shadow-inner text-center flex justify-center gap-0.5">
                          {guessB ? <>{guessB.home}<span className="text-slate-700">:</span>{guessB.away}</> : <span className="text-xs text-slate-600">-:-</span>}
                        </div>
                        {isPlayoffPhase(m?.phase) && guessB?.home === guessB?.away && guessB?.penalty_winner && (
                          <div className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-widest text-center">
                            Pên: {guessB.penalty_winner === 'home' || String(guessB.penalty_winner) === String(m?.home_team?.id) ? m?.home_team?.short_code : m?.away_team?.short_code}
                          </div>
                        )}
                        {m?.status === 'FINISHED' && guessB ? (
                           <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold w-full text-center border ${getBadgeClass(guessB.color)}`}>
                             +{guessB.pts || 0} PTS
                           </span>
                        ) : <span className="h-[22px]"></span>}
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
  );
}