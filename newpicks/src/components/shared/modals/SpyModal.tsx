'use client';

import { useState, useEffect } from 'react';
import { X, Minus } from 'lucide-react';
import { isPlayoffPhase } from '@/utils/leagueEngine';

// Garante o formato DD/MM/AAAA exato em qualquer navegador
const getFormattedDate = (dateString: string | Date) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function SpyModal({ isOpen, onClose, targetUser, matches, rankingUsers }: any) {
  const [activeTab, setActiveTab] = useState<'groups' | 'playoffs'>('groups');
  const [selectedDate, setSelectedDate] = useState<string>('');

  const todayStr = getFormattedDate(new Date());

  const phaseMatches = matches.filter((m: any) => 
    activeTab === 'groups' ? !isPlayoffPhase(m.phase) : isPlayoffPhase(m.phase)
  );

  const groupedByDate = phaseMatches.reduce((acc: any, m: any) => {
    const dateKey = getFormattedDate(m.match_time);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(m);
    return acc;
  }, {});

  const datesArray = Object.keys(groupedByDate).sort((a, b) => {
    const [da, ma, ya] = a.split('/');
    const [db, mb, yb] = b.split('/');
    return new Date(Number(ya), Number(ma) - 1, Number(da)).getTime() - new Date(Number(yb), Number(mb) - 1, Number(db)).getTime();
  });

  useEffect(() => {
    if (isOpen && datesArray.length > 0) {
      if (datesArray.includes(todayStr)) setSelectedDate(todayStr);
      else setSelectedDate(datesArray[0]);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const currentMatches = groupedByDate[selectedDate] || [];

  // Pega a lista do Ranking se for GERAL para garantir que NINGUÉM fique de fora
  const usersList = targetUser?.id === 'ALL' && rankingUsers 
    ? rankingUsers.map((u: any) => u.id) 
    : [targetUser?.id];

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border">
        
        <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
          <div>
            <h2 className="font-display font-bold text-lg uppercase tracking-tight">Painel do Espiador</h2>
            <p className="text-xs text-slate-400">Modo de Visualização: <span className="text-primary font-bold">{targetUser?.name || 'Geral'}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg"><X size={20} /></button>
        </div>

        <div className="flex border-b border-border bg-background/30">
          <button onClick={() => { setActiveTab('groups'); }} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'groups' ? 'border-b-2 border-primary text-white bg-primary/5' : 'text-slate-400 hover:text-slate-300'}`}>Fase de Grupos</button>
          <button onClick={() => { setActiveTab('playoffs'); }} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'playoffs' ? 'border-b-2 border-primary text-white bg-primary/5' : 'text-slate-400 hover:text-slate-300'}`}>Fases Eliminatórias</button>
        </div>

        <div className="p-4 bg-background/20 border-b border-border/40 max-h-36 overflow-y-auto scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Selecione o Dia:</span>
          {datesArray.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-2">Nenhuma data cadastrada nesta fase.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {datesArray.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all truncate ${selectedDate === date ? 'bg-primary text-slate-900 border-primary shadow-md scale-[1.02]' : 'bg-card border-border text-slate-400 hover:text-white hover:border-slate-600'}`}
                >
                  {date === todayStr ? 'HOJE 📅' : date}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1 bg-background/10 space-y-6 scrollbar-thin">
          {currentMatches.length === 0 ? (
            <div className="text-center text-slate-500 py-10 text-sm">Nenhum confronto agendado para o dia selecionado.</div>
          ) : (
            currentMatches.map((m: any) => (
              <div key={m.id} className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-4">
                
                <div className="flex flex-col items-center justify-center border-b border-border/40 pb-4 bg-background/30 p-3 rounded-xl gap-2">
                  <div className="flex items-center gap-3 font-display text-lg md:text-xl text-slate-300">
                    <img src={m.home_team?.logo_url} alt={m.home_team?.name} className="w-8 h-8 object-contain" />
                    <div className="flex items-center gap-1 font-bold font-display text-sm bg-slate-950/60 px-2 py-0.5 rounded border border-border">
                          <span className={m.status === 'FINISHED' ? 'text-green-400' : 'text-white'}>{m.status === 'FINISHED' ? m.home_score : '-'}</span>
                          <span className="text-slate-600 text-xs">x</span>
                          <span className={m.status === 'FINISHED' ? 'text-green-400' : 'text-white'}>{m.status === 'FINISHED' ? m.away_score : '-'}</span>
                        </div>
                    <img src={m.away_team?.logo_url} alt={m.away_team?.name} className="w-8 h-8 object-contain" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-900 border border-border px-2 py-0.5 rounded-full">
                    {m.status === 'FINISHED' ? 'Encerrado' : m.status === 'IN_PLAY' ? 'Ao Vivo' : 'Agendado'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                  {usersList.map((uid: string) => {
                    const guess = m.palpites?.[uid];
                    if (!guess) return null;
                    const fallbackName = rankingUsers?.find((u:any) => u.id === uid)?.name || 'Membro';
                    let winBadgeElement = <Minus size={14} className="text-slate-600" />;
                    if (guess) {
                      if (guess.home > guess.away) {
                        winBadgeElement = <img src={m.home_team?.logo_url} className="w-5 h-5 object-contain drop-shadow" title="Vencedor: Casa" />;
                      } else if (guess.away > guess.home) {
                        winBadgeElement = <img src={m.away_team?.logo_url} className="w-5 h-5 object-contain drop-shadow" title="Vencedor: Visitante" />;
                      } else {
                        winBadgeElement = <div className="bg-slate-800 text-[10px] px-1.5 rounded font-black border border-slate-700 text-yellow-500" title="Empate">X</div>;
                      }
                    }

                    return (
                      <div key={uid} className="bg-background/40 border border-border/50 p-3 rounded-xl flex flex-col items-center relative overflow-hidden group hover:border-slate-600 transition-colors">
                        <div className="mb-2 h-6 flex items-center justify-center">{winBadgeElement}</div>

                        <span className="text-[11px] font-bold text-slate-300 truncate w-full text-center pb-2">
                          {guess?.name || fallbackName}
                        </span>
                        
                        {guess ? (
                          <div className="flex flex-col items-center w-full">
                            <div className="bg-slate-950/40 border border-border/60 w-full py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-display font-bold text-base shadow-sm">
                              <span className="text-white">{guess.home}</span>
                              <span className="text-slate-700">:</span>
                              <span className="text-white">{guess.away}</span>
                            </div>

                            {m.status === 'FINISHED' && (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider mt-2 w-full text-center ${
                                guess.color === 'GREEN' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                guess.color === 'BLUE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                guess.color === 'YELLOW' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                +{guess.pts} pts
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-950/40 border border-border/60 w-full py-1.5 rounded-lg flex items-center justify-center font-display font-bold text-sm text-slate-600">
                            - : -
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}