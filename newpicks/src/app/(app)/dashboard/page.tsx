'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { MatchCard, MatchStatus } from '@/components/shared/MatchCard';
import { CompetitionSelector } from '@/components/shared/CompetitionSelector';
import { useCompetition } from '@/context/CompetitionContext';
import { useTheme } from '@/context/ThemeContext';
import { Calendar, TrendingUp, Loader2, Save, ChevronDown, ChevronUp, Layers, Flame, Minus } from 'lucide-react';

interface DayGroup {
  dateKey: string;
  dateLabel: string;
  rawDate: Date;
  matches: any[];
}

interface UserStats {
  totalPoints: number;
  todayPoints: number;
  lastDayPoints: number;
  exactScores: number;
  rank: number;
  movement: number; 
}

const isColorDark = (hex: string) => {
  const c = hex?.charAt(0) === '#' ? hex.substring(1, 7) : (hex || '000000');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128; 
};

export default function DashboardPage() {
  const { activeCompetition, selectCompetition } = useCompetition();
  const { themeColor } = useTheme(); 
  
  const todayStr = new Date().toLocaleDateString('pt-BR'); 
  
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [guesses, setGuesses] = useState<Record<number, { home: string; away: string }>>({});
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0, todayPoints: 0, lastDayPoints: 0, exactScores: 0, rank: 0, movement: 0
  });
  
  const [isCompSelectorOpen, setIsCompSelectorOpen] = useState(false);
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false); 
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayStr);
  
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [savingGuesses, setSavingGuesses] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const todaySectionRef = useRef<HTMLDivElement>(null);
  const selectedDateSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setCurrentUserId(session.user.id);

        const { data: compData, error: compError } = await supabase
          .from('competitions')
          .select('id, name, competition_logo, slug, theme_primary, theme_secondary, is_active');

        if (compError) throw compError;
        if (compData) setCompetitions(compData);
        
      } catch (err) {
        console.error('Erro ao inicializar competições:', err);
      } finally {
        setLoadingCompetitions(false);
      }
    };
    fetchCompetitions();
  }, []);

  useEffect(() => {
    if (competitions.length > 0 && (!activeCompetition || !activeCompetition.id)) {
      try {
        const saved = localStorage.getItem('active_competition_obj');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && parsed.id) {
            selectCompetition(parsed);
            return;
          }
        }
      } catch (e) {
        console.warn('Cache inválido encontrado. Limpando...');
      }
      localStorage.removeItem('active_competition_obj');
      selectCompetition(competitions[0]);
    }
  }, [competitions, activeCompetition, selectCompetition]);

  useEffect(() => {
    if (!activeCompetition?.id || !currentUserId) return;

    const fetchMatchesByCompetition = async () => {
      setLoadingMatches(true);
      try {
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id,
            match_time,
            status,
            home_score,
            away_score,
            home_penalty,
            away_penalty,
            competition_id,
            home_team:teams!home_team_id (id, name, short_code, logo_url),
            away_team:teams!away_team_id (id, name, short_code, logo_url),
            guesses (user_id, home_guess, away_guess, points_awarded)
          `)
          .eq('competition_id', activeCompetition.id)
          .order('match_time', { ascending: true });

        if (error) throw error;

        if (data) {
          const formattedMatches = data.map((match: any) => {
            let uiStatus: MatchStatus = 'SCHEDULED';
            if (match.status === 'FT') uiStatus = 'FINISHED';
            if (match.status === 'LIVE' || match.status === 'HT') uiStatus = 'IN_PLAY';

            const userGuessData = match.guesses?.find((g: any) => g.user_id === currentUserId);
            
            return {
              id: match.id,
              match_time: match.match_time,
              status: uiStatus,
              home_score: match.home_score ?? undefined,
              away_score: match.away_score ?? undefined,
              home_penalties: match.home_penalty ?? undefined,
              away_penalties: match.away_penalty ?? undefined,
              home_team: Array.isArray(match.home_team) ? match.home_team[0] : match.home_team,
              away_team: Array.isArray(match.away_team) ? match.away_team[0] : match.away_team,
              userGuess: userGuessData ? { home_guess: userGuessData.home_guess, away_guess: userGuessData.away_guess } : undefined,
              points: uiStatus === 'FINISHED' && userGuessData ? (userGuessData.points_awarded || 0) : undefined // Pega direto da Trigger do BD
            };
          });

          setMatches(formattedMatches);
        }
      } catch (err) {
        console.error('Erro ao buscar confrontos:', err);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchMatchesByCompetition();
  }, [activeCompetition, currentUserId]); 

  useEffect(() => {
    if (!activeCompetition?.id || !currentUserId || matches.length === 0) return;

    const calculateStats = async () => {
      try {
        const { data: allGuessesData } = await supabase
          .from('guesses')
          .select('user_id, match_id, points_awarded, home_guess, away_guess')
          .eq('competition_id', activeCompetition.id);

        if (!allGuessesData) return;

        const matchDates: Record<number, number> = {};
        const matchScores: Record<number, any> = {};
        
        matches.forEach(m => {
          const d = new Date(m.match_time);
          d.setHours(0, 0, 0, 0);
          matchDates[m.id] = d.getTime();
          matchScores[m.id] = { h: m.home_score, a: m.away_score, status: m.status };
        });

        const todayTime = new Date().setHours(0, 0, 0, 0);
        const pastMatchTimes = Object.values(matchDates).filter(t => t < todayTime);
        const lastDayTime = pastMatchTimes.length > 0 ? Math.max(...pastMatchTimes) : null;

        const totalScores: Record<string, number> = {};
        const previousScores: Record<string, number> = {}; 

        let myTotal = 0;
        let myToday = 0;
        let myLastDay = 0;
        let myExactScores = 0;

        allGuessesData.forEach(guess => {
          const mTime = matchDates[guess.match_id];
          const pts = guess.points_awarded || 0;
          const uid = guess.user_id;

          if (!totalScores[uid]) totalScores[uid] = 0;
          if (!previousScores[uid]) previousScores[uid] = 0;

          totalScores[uid] += pts;
          
          if (mTime < todayTime) {
            previousScores[uid] += pts;
          }

          if (uid === currentUserId) {
            myTotal += pts;
            if (mTime === todayTime) myToday += pts;
            if (mTime === lastDayTime) myLastDay += pts;
            
            const mData = matchScores[guess.match_id];
            if (mData && mData.status === 'FINISHED' && mData.h === guess.home_guess && mData.a === guess.away_guess) {
              myExactScores++;
            }
          }
        });

        const totalRanking = Object.entries(totalScores).sort((a, b) => b[1] - a[1]);
        const previousRanking = Object.entries(previousScores).sort((a, b) => b[1] - a[1]);

        const currentRankIndex = totalRanking.findIndex(r => r[0] === currentUserId);
        const previousRankIndex = previousRanking.findIndex(r => r[0] === currentUserId);

        const currentRank = currentRankIndex !== -1 ? currentRankIndex + 1 : 0;
        const previousRank = previousRankIndex !== -1 ? previousRankIndex + 1 : currentRank;

        const movement = previousRank === 0 ? 0 : (previousRank - currentRank);

        setUserStats({
          totalPoints: myTotal,
          todayPoints: myToday,
          lastDayPoints: myLastDay,
          exactScores: myExactScores,
          rank: currentRank,
          movement: movement
        });

      } catch(e) {
        console.error('Erro ao calcular ranking', e);
      }
    };

    calculateStats();
  }, [matches, activeCompetition, currentUserId]);

  const handleGuessChange = (matchId: number, side: 'home' | 'away', value: string) => {
    setGuesses((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: value },
    }));
  };

  const handleSaveAllGuesses = async () => {
    if (!currentUserId || Object.keys(guesses).length === 0 || !activeCompetition?.id) return;
    setSavingGuesses(true);
    try {
      const recordsToUpsert = Object.entries(guesses).map(([matchId, guess]) => ({
        user_id: currentUserId,
        match_id: parseInt(matchId, 10),
        home_guess: parseInt(guess.home, 10),
        away_guess: parseInt(guess.away, 10),
        competition_id: activeCompetition.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('guesses').upsert(recordsToUpsert, { onConflict: 'user_id,match_id' });
      if (error) throw error;
      
      setGuesses({});
      window.location.reload(); 
    } catch (err) {
      console.error('Erro ao salvar palpites:', err);
    } finally {
      setSavingGuesses(false);
    }
  };

  const handleDateSelect = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setTimeout(() => {
      if (dateKey === todayStr) {
        todaySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        selectedDateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const groupedMatches = matches.reduce((groups: Record<string, DayGroup>, match: any) => {
    const dateObj = new Date(match.match_time);
    const dateKey = dateObj.toLocaleDateString('pt-BR');
    if (!groups[dateKey]) {
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

  const sortedDays: DayGroup[] = Object.values(groupedMatches).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  const todayMatches = groupedMatches[todayStr]?.matches || [];

  const buttonTextColor = isColorDark(themeColor || '#ea580c') ? '#ffffff' : '#020617';

  if (loadingCompetitions) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* SELETOR DE COMPETIÇÃO */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => setIsCompSelectorOpen(!isCompSelectorOpen)}
          className="w-full p-4 flex items-center justify-between font-display font-bold uppercase tracking-wide text-sm bg-background/40 hover:bg-background/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Layers size={18} style={{ color: themeColor || 'var(--color-primary)' }} />
            <span>
              Bolão Ativo: <span style={{ color: themeColor || 'var(--color-primary)' }}>{activeCompetition?.name || 'Selecione uma Competição'}</span>
            </span>
          </div>
          {isCompSelectorOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isCompSelectorOpen && (
          <CompetitionSelector 
            competitions={competitions} 
            onRowClick={() => setIsCompSelectorOpen(false)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          
          {loadingMatches ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" style={{ color: themeColor || 'var(--color-primary)' }} size={32} />
            </div>
          ) : (
            <>
              {/* 1. JOGOS DE HOJE */}
              <div ref={todaySectionRef} className="bg-card border border-primary/40 p-5 sm:p-6 rounded-2xl relative shadow-[0_0_15px_rgba(var(--color-primary),0.05)] scroll-mt-24">
                <h2 className="text-lg sm:text-xl font-display font-bold mb-6 uppercase tracking-tight flex items-center gap-2">
                  <Flame size={22} style={{ color: themeColor || 'var(--color-primary)' }} /> 
                  <span style={{ color: themeColor || 'var(--color-primary)' }}>Jogos de Hoje</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayMatches.length === 0 ? (
                    <div className="col-span-full text-center py-8 border-2 border-dashed border-border/60 rounded-xl">
                      <p className="text-slate-500 text-sm font-medium">Nenhum confronto agendado para hoje.</p>
                    </div>
                  ) : (
                    todayMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        homeTeam={match.home_team}
                        awayTeam={match.away_team}
                        matchDate={match.match_time}
                        status={match.status}
                        homeScore={match.home_score}
                        awayScore={match.away_score}
                        homePenalties={match.home_penalties}
                        awayPenalties={match.away_penalties}
                        guessHome={guesses[match.id]?.home}
                        guessAway={guesses[match.id]?.away}
                        onGuessChange={(side, val) => handleGuessChange(match.id, side, val)}
                        userGuess={match.userGuess}
                        points={match.points}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* 2. NAVEGAÇÃO DE DATAS COLAPSÁVEL */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all shadow-sm">
                <button
                  onClick={() => setIsDateSelectorOpen(!isDateSelectorOpen)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between font-display font-bold uppercase tracking-wide text-sm hover:bg-background/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={18} style={{ color: themeColor || 'var(--color-primary)' }} /> 
                    <span>Navegar por Datas</span>
                  </div>
                  {isDateSelectorOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {isDateSelectorOpen && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-border/50">
                    <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
                      {sortedDays.map((dayGroup) => {
                        const isToday = dayGroup.dateKey === todayStr;
                        const isSelected = selectedDateKey === dayGroup.dateKey;
                        const isCompleted = dayGroup.matches.every(m => m.status === 'FINISHED');
                        const splitLabel = dayGroup.dateLabel.split(', ');

                        return (
                          <button
                            key={dayGroup.dateKey}
                            onClick={() => handleDateSelect(dayGroup.dateKey)}
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center transition-all flex-shrink-0 ${
                              isSelected 
                                ? 'border-primary bg-primary/20 scale-105 shadow-md' 
                                : isCompleted 
                                  ? 'border-green-500/30 bg-green-900/10 hover:bg-green-900/20' 
                                  : 'border-border bg-background/50 hover:border-slate-500'
                            }`}
                          >
                            <span 
                              className={`text-[9px] uppercase font-bold px-1 ${isToday ? 'tracking-wider' : 'opacity-70'}`}
                              style={{ color: isToday ? (themeColor || 'var(--color-primary)') : 'inherit' }}
                            >
                              {isToday ? 'HOJE' : splitLabel[0]}
                            </span>
                            <span className="text-xs sm:text-sm font-bold">{splitLabel[1]}</span>
                            {isCompleted && !isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500 opacity-70" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. JOGOS DA DATA SELECIONADA */}
              {selectedDateKey !== todayStr && (
                <div 
                  ref={selectedDateSectionRef}
                  className="bg-card border border-border p-5 sm:p-6 rounded-2xl relative shadow-md animate-in fade-in duration-300 scroll-mt-24"
                >
                  <h2 className="text-lg sm:text-xl font-display font-bold mb-6 uppercase tracking-tight flex items-center gap-2 text-slate-200">
                    <Calendar size={20} className="opacity-70" />
                    {groupedMatches[selectedDateKey]?.dateLabel}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedMatches[selectedDateKey]?.matches.map((match) => (
                      <MatchCard
                        key={match.id}
                        homeTeam={match.home_team}
                        awayTeam={match.away_team}
                        matchDate={match.match_time}
                        status={match.status}
                        homeScore={match.home_score}
                        awayScore={match.away_score}
                        homePenalties={match.home_penalties}
                        awayPenalties={match.away_penalties}
                        guessHome={guesses[match.id]?.home}
                        guessAway={guesses[match.id]?.away}
                        onGuessChange={(side, val) => handleGuessChange(match.id, side, val)}
                        userGuess={match.userGuess}
                        points={match.points}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* BARRA LATERAL DE DESEMPENHO */}
        <aside className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm sticky top-24">
            <h2 className="text-lg font-display font-bold mb-6 uppercase tracking-tight flex items-center gap-2">
              <TrendingUp size={18} style={{ color: themeColor || 'var(--color-primary)' }} /> Meu Desempenho
            </h2>
            
            {/* CARD DE POSIÇÃO NO RANKING */}
            <div className="flex items-center justify-between bg-background/50 p-4 rounded-xl border border-border/50 mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Posição Atual</span>
                <span className="text-3xl sm:text-4xl font-display font-bold" style={{ color: themeColor || 'var(--color-primary)' }}>
                  {userStats.rank > 0 ? `${userStats.rank}º` : '-'}
                </span>
              </div>
              <div className={`flex flex-col items-end ${userStats.movement > 0 ? 'text-green-500' : userStats.movement < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Movimento</span>
                <div className="flex items-center gap-0.5 font-bold text-lg sm:text-xl">
                  {userStats.movement > 0 ? <ChevronUp size={20} /> : userStats.movement < 0 ? <ChevronDown size={20} /> : <Minus size={18} className="opacity-50" />}
                  {userStats.movement !== 0 && Math.abs(userStats.movement)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-slate-400 text-sm">Pontuação Total</span>
                <span className="font-bold text-lg font-display">{userStats.totalPoints} pts</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-slate-400 text-sm">Feitos Hoje</span>
                <span className="font-bold text-lg font-display text-green-400">+{userStats.todayPoints} pts</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border/50">
                <span className="text-slate-400 text-sm">Última Rodada</span>
                <span className="font-bold text-lg font-display">+{userStats.lastDayPoints} pts</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-slate-400 text-sm">Placares Cravados</span>
                <span className="font-bold text-lg font-display text-yellow-500">{userStats.exactScores}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* BOTÃO FLUTUANTE DE SALVAMENTO */}
      {Object.keys(guesses).length > 0 && (
        <button
          onClick={handleSaveAllGuesses}
          disabled={savingGuesses}
          className="fixed bottom-24 md:bottom-8 right-6 z-50 px-6 py-4 rounded-full shadow-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform active:scale-95 cursor-pointer select-none"
          style={{ 
            backgroundColor: themeColor || 'var(--color-primary)', 
            color: buttonTextColor 
          }}
        >
          {savingGuesses ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          <span className="tracking-tight uppercase text-sm">Salvar Palpites</span>
        </button>
      )}
    </div>
  );
}