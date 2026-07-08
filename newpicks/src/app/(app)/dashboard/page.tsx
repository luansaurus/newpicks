'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { MatchCard, MatchStatus } from '@/components/shared/MatchCard';
import { useCompetition } from '@/context/CompetitionContext';
import { useLeague } from '@/context/LeagueContext';
import { useTheme } from '@/context/ThemeContext';
import { UserPerformance, UserStats } from '@/components/shared/UserPerformance';
import { Calendar, Loader2, Save, ChevronDown, ChevronUp, Flame, Trophy, Medal, Award, Crown } from 'lucide-react';
import { calculateGuessPoints, GLOBAL_LEAGUE_RULES, isPlayoffPhase } from '@/utils/leagueEngine';
import { ChampionDisplay } from '@/components/shared/ChampionDisplay';
import { getUserChampionInfo, ChampionInfo } from '@/utils/championUtils';

interface DayGroup {
  dateKey: string;
  dateLabel: string;
  rawDate: Date;
  matches: any[];
  phases: Set<string>;
}

interface GuessData {
  home: string;
  away: string;
  penaltyWinner?: 'home' | 'away' | null;
}

const isColorDark = (hex: string) => {
  const c = hex?.charAt(0) === '#' ? hex.substring(1, 7) : (hex || '000000');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128; 
};

const parseDateBR = (dateStr: string) => {
  const [d, m, y] = dateStr.split('/');
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
};

const phaseNamesBR: Record<string, string> = {
  'round_of_32': '16 avos de Final',
  'round_of_16': 'Oitavas de Final',
  'quarter_final': 'Quartas de Final',
  'semi_final': 'Semifinal',
  'third_place': 'Disputa de 3º Lugar',
  'final': 'Final',
  'groups': 'Fase de Grupos'
};

const getPhaseTheme = (phases: Set<string>) => {
  if (!phases || phases.size === 0) return 'group';
  
  if (phases.has('final')) return 'final';
  if (phases.has('third_place')) return 'third_place';
  if (phases.has('semi_final')) return 'semi';
  if (phases.has('quarter_final')) return 'quarter';
  if (phases.has('round_of_16')) return 'round16';
  if (phases.has('round_of_32')) return 'round32';
  
  return 'group'; 
};

const phaseConfig = {
  final: { 
    border: 'border-yellow-500/80', bg: 'bg-yellow-500/10', text: 'text-yellow-500', 
    active: 'shadow-[0_0_15px_rgba(234,179,8,0.3)] scale-105 bg-yellow-500/20',
    icon: <Trophy size={14} className="text-yellow-500 drop-shadow-md" />,
    badge: <div className="absolute -top-2 -right-2 bg-yellow-500 text-slate-900 rounded-full p-1 shadow-lg"><Trophy size={12}/></div>
  },
  third_place: { 
    border: 'border-amber-700/60', bg: 'bg-amber-700/10', text: 'text-amber-600', 
    active: 'shadow-[0_0_15px_rgba(180,83,9,0.3)] scale-105 bg-amber-700/20',
    icon: <Medal size={14} className="text-amber-600 drop-shadow-md" />,
    badge: <div className="absolute -top-2 -right-2 bg-amber-700 text-white rounded-full p-1 shadow-lg"><Medal size={12}/></div>
  },
  semi: { 
    border: 'border-orange-500/60', bg: 'bg-orange-500/10', text: 'text-orange-500',
    active: 'shadow-[0_0_15px_rgba(249,115,22,0.2)] scale-105 bg-orange-500/20',
    icon: <Flame size={14} className="text-orange-500" />, badge: null
  },
  quarter: { 
    border: 'border-purple-500/60', bg: 'bg-purple-500/10', text: 'text-purple-400',
    active: 'shadow-[0_0_15px_rgba(168,85,247,0.2)] scale-105 bg-purple-500/20',
    icon: <Medal size={14} className="text-purple-400" />, badge: null
  },
  round16: { 
    border: 'border-blue-500/60', bg: 'bg-blue-500/10', text: 'text-blue-400',
    active: 'shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-105 bg-blue-500/20',
    icon: <Medal size={14} className="text-blue-400" />, badge: null
  },
  round32: { 
    border: 'border-cyan-500/60', bg: 'bg-cyan-500/10', text: 'text-cyan-400',
    active: 'shadow-[0_0_15px_rgba(6,182,212,0.2)] scale-105 bg-cyan-500/20',
    icon: <Medal size={14} className="text-cyan-400" />, badge: null
  },
  group: { 
    border: 'border-border', bg: 'bg-background/50', text: 'text-slate-400',
    active: 'border-primary bg-primary/20 scale-105 shadow-md',
    icon: <Calendar size={14} />, badge: null
  }
};

export default function DashboardPage() {
  const { activeCompetition } = useCompetition();
  const { activeLeague } = useLeague();
  const { themeColor } = useTheme(); 
  
  const todayStr = new Date().toLocaleDateString('pt-BR'); 
  const todayMs = parseDateBR(todayStr);
  
  const [matches, setMatches] = useState<any[]>([]);
  const [guesses, setGuesses] = useState<Record<number, GuessData>>({});
  
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0, todayPoints: 0, lastDayPoints: 0, exactScores: 0, rank: 0, movement: 0
  });
  
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false); 
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayStr);
  
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [savingGuesses, setSavingGuesses] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [championInfo, setChampionInfo] = useState<{ 
    champion: ChampionInfo | null; 
    userPosition: number | null; 
    isChampion: boolean;
  }>({
    champion: null,
    userPosition: null,
    isChampion: false
  });

  const todaySectionRef = useRef<HTMLDivElement>(null);
  const selectedDateSectionRef = useRef<HTMLDivElement>(null);

  // Função para buscar os dados
  const fetchMatches = useCallback(async () => {
    if (!activeCompetition?.id || !currentUserId) return;

    try {
      setIsRefreshing(true);
      
      const { data, error } = await supabase
        .from('matches')
        .select(`id, match_time, status, home_score, away_score, home_penalty, away_penalty, phase, competition_id, home_team:teams!home_team_id (id, name, short_code, logo_url), away_team:teams!away_team_id (id, name, short_code, logo_url), guesses (user_id, home_guess, away_guess, points_awarded, penalty_winner_guess)`)
        .eq('competition_id', activeCompetition.id)
        .order('match_time', { ascending: true });

      if (error) throw error;

      if (data) {
        const rulesToUse = activeLeague || GLOBAL_LEAGUE_RULES;

        const formattedMatches = data.map((match: any) => {
          let uiStatus: MatchStatus = 'SCHEDULED';
          if (match.status === 'FT' || match.status === 'FINISHED') uiStatus = 'FINISHED';
          if (match.status === 'LIVE' || match.status === 'HT' || match.status === '1H' || match.status === '2H') uiStatus = 'IN_PLAY';

          const userGuessData = match.guesses?.find((g: any) => g.user_id === currentUserId);
          
          let matchPoints = 0;
          let matchColor: 'GREEN' | 'BLUE' | 'YELLOW' | 'RED' = 'RED';
          
          if (uiStatus === 'FINISHED' && userGuessData) {
            const calc = calculateGuessPoints(
              match.home_score, match.away_score, 
              userGuessData.home_guess, userGuessData.away_guess, 
              rulesToUse, isPlayoffPhase(match.phase), 
              match.home_penalty, match.away_penalty,
              userGuessData.penalty_winner_guess
            );
            
            matchColor = calc.color;

            if (activeLeague) {
              matchPoints = calc.pts;
            } else {
              const basePoints = userGuessData.points_awarded || 0;
              matchPoints = isPlayoffPhase(match.phase) && GLOBAL_LEAGUE_RULES.playoff_multiplier > 1
                ? basePoints * GLOBAL_LEAGUE_RULES.playoff_multiplier
                : basePoints;
            }
          }
          
          return {
            id: match.id, 
            match_time: match.match_time, 
            status: uiStatus, 
            home_score: match.home_score ?? undefined, 
            away_score: match.away_score ?? undefined, 
            home_penalties: match.home_penalty ?? undefined, 
            away_penalties: match.away_penalty ?? undefined, 
            phase: match.phase || 'groups', 
            home_team: Array.isArray(match.home_team) ? match.home_team[0] : match.home_team, 
            away_team: Array.isArray(match.away_team) ? match.away_team[0] : match.away_team, 
            userGuess: userGuessData ? { 
              home_guess: userGuessData.home_guess, 
              away_guess: userGuessData.away_guess,
              penalty_winner_guess: userGuessData.penalty_winner_guess
            } : undefined,
            points: matchPoints, 
            pointColor: matchColor
          };
        });
        setMatches(formattedMatches);
      }
    } catch (err) {
      console.error('Erro ao buscar confrontos:', err);
    } finally {
      setIsRefreshing(false);
      setLoadingMatches(false);
    }
  }, [activeCompetition, activeLeague, currentUserId]);

  // Carregamento inicial e atualização em tempo real
  useEffect(() => {
    const initUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (!activeCompetition?.id || !currentUserId) return;

    setLoadingMatches(true);
    fetchMatches();

    const fetchChampionInfo = async () => {
      if (currentUserId && activeCompetition?.id) {
        const championData = await getUserChampionInfo(
          activeCompetition.id,
          currentUserId,
          activeLeague?.id || null
        );
        setChampionInfo(championData);
      }
    };
    fetchChampionInfo();

    const interval = setInterval(() => {
      fetchMatches();
      fetchChampionInfo();
    }, 30000);

    const subscription = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `competition_id=eq.${activeCompetition.id}`
        },
        (payload) => {
          console.log('🔄 Mudança detectada:', payload);
          fetchMatches();
          fetchChampionInfo();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [activeCompetition, currentUserId, fetchMatches]);

  // CÁLCULO DE ESTATÍSTICAS COM PAGINAÇÃO
  useEffect(() => {
    if (!activeCompetition?.id || !currentUserId || matches.length === 0) return;

    const calculateStats = async () => {
      try {
        const matchIds = matches.map(m => m.id);
        
        // Paginação automática para buscar todos os palpites da liga
        let allGuessesData: any[] = [];
        let hasMore = true;
        let offset = 0;
        const PAGE_SIZE = 1000;

        while (hasMore) {
          const { data: chunk, error } = await supabase
            .from('guesses')
            .select('user_id, match_id, points_awarded, home_guess, away_guess, penalty_winner_guess, user_profile:profiles!guesses_user_id_fkey(is_test)')
            .in('match_id', matchIds)
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) {
            console.error("Erro na busca de palpites (Dashboard):", error);
            break;
          }

          if (chunk && chunk.length > 0) {
            allGuessesData = [...allGuessesData, ...chunk];
            offset += PAGE_SIZE;
            if (chunk.length < PAGE_SIZE) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }

        // Remoção de duplicatas (segurança)
        const uniqueGuesses = new Map();
        allGuessesData.forEach(g => {
          const key = `${g.user_id}-${g.match_id}`;
          if (!uniqueGuesses.has(key)) {
            uniqueGuesses.set(key, g);
          }
        });
        const uniqueGuessesArray = Array.from(uniqueGuesses.values());

        const validUsers = new Set<string>();
        if (activeLeague) {
          const { data: members } = await supabase.from('league_members').select('user_id').eq('league_id', activeLeague.id);
          if (members) members.forEach(m => validUsers.add(m.user_id));
        }

        const rulesToUse = activeLeague || GLOBAL_LEAGUE_RULES;
        const matchDateStrings: Record<number, string> = {};
        const matchDateTimestamps: Record<number, number> = {};
        const matchScores: Record<number, any> = {};
        
        matches.forEach(m => {
          const dateStr = new Date(m.match_time).toLocaleDateString('pt-BR');
          matchDateStrings[m.id] = dateStr; 
          matchDateTimestamps[m.id] = parseDateBR(dateStr);
          matchScores[m.id] = { 
            h: m.home_score, 
            a: m.away_score, 
            hp: m.home_penalties, 
            ap: m.away_penalties, 
            status: m.status, 
            phase: m.phase 
          };
        });

        const pastMatchTimes = Object.values(matchDateTimestamps).filter(t => t < todayMs);
        const lastDayTime = pastMatchTimes.length > 0 ? Math.max(...pastMatchTimes) : null;

        const totalScores: Record<string, number> = {};
        const previousScores: Record<string, number> = {}; 

        if (activeLeague) {
          validUsers.forEach(uid => { totalScores[uid] = 0; previousScores[uid] = 0; });
        }

        let myTotal = 0; let myToday = 0; let myLastDay = 0; let myExactScores = 0;

        uniqueGuessesArray.forEach(guess => {
          // Filtra usuários de teste
          const profile = Array.isArray(guess.user_profile) ? guess.user_profile[0] : guess.user_profile;
          if (profile?.is_test) return;

          const uid = guess.user_id;
          
          if (activeLeague && !validUsers.has(uid)) return;

          const mDateStr = matchDateStrings[guess.match_id];
          const mTimestamp = matchDateTimestamps[guess.match_id];
          const mData = matchScores[guess.match_id];

          let pts = 0;
          let isExact = false;

          if (mData && mData.status === 'FINISHED') {
            if (activeLeague) {
              pts = calculateGuessPoints(
                mData.h, mData.a, 
                guess.home_guess, guess.away_guess, 
                rulesToUse, isPlayoffPhase(mData.phase), 
                mData.hp, mData.ap,
                guess.penalty_winner_guess
              ).pts;
            } else {
              pts = guess.points_awarded || 0;
              if (isPlayoffPhase(mData.phase) && GLOBAL_LEAGUE_RULES.playoff_multiplier > 1) pts *= GLOBAL_LEAGUE_RULES.playoff_multiplier;
            }
            isExact = (mData.h === guess.home_guess && mData.a === guess.away_guess);
          }

          if (!totalScores[uid]) totalScores[uid] = 0;
          if (!previousScores[uid]) previousScores[uid] = 0;

          totalScores[uid] += pts;
          if (mTimestamp < todayMs) previousScores[uid] += pts;

          if (uid === currentUserId) {
            myTotal += pts;
            if (mDateStr === todayStr) myToday += pts;
            if (mTimestamp === lastDayTime) myLastDay += pts;
            if (isExact) myExactScores++;
          }
        });

        const totalRanking = Object.entries(totalScores).sort((a, b) => b[1] - a[1]);
        const previousRanking = Object.entries(previousScores).sort((a, b) => b[1] - a[1]);

        const currentRankIndex = totalRanking.findIndex(r => r[0] === currentUserId);
        const previousRankIndex = previousRanking.findIndex(r => r[0] === currentUserId);

        const currentRank = currentRankIndex !== -1 ? currentRankIndex + 1 : 0;
        const previousRank = previousRankIndex !== -1 ? previousRankIndex + 1 : currentRank;

        setUserStats({
          totalPoints: myTotal, todayPoints: myToday, lastDayPoints: myLastDay,
          exactScores: myExactScores, rank: currentRank, movement: (previousRank === 0 ? 0 : (previousRank - currentRank))
        });
      } catch(e) { console.error(e); }
    };
    calculateStats();
  }, [matches, activeCompetition, activeLeague, currentUserId, todayMs, todayStr]);

  // Função para obter o valor do palpite
  const getGuessValue = (matchId: number, side: 'home' | 'away' | 'penaltyWinner') => {
    const pending = guesses[matchId];
    const saved = matches.find(m => m.id === matchId)?.userGuess;
    
    if (side === 'penaltyWinner') {
      if (pending && pending.penaltyWinner !== undefined && pending.penaltyWinner !== null) {
        return pending.penaltyWinner;
      }
      return saved?.penalty_winner_guess || null;
    }
    
    const pendingValue = pending?.[side];
    if (pending && pending[side] !== undefined) {
      return pending[side];
    }
    
    if (side === 'home') {
      return saved?.home_guess?.toString() || '';
    }
    return saved?.away_guess?.toString() || '';
  };

  // Função para verificar se o placar é empate
  const isDrawScore = (matchId: number) => {
    const home = getGuessValue(matchId, 'home');
    const away = getGuessValue(matchId, 'away');
    if (!home || !away) return false;
    return parseInt(home) === parseInt(away);
  };

  const handleGuessChange = (matchId: number, side: 'home' | 'away' | 'penaltyWinner', value: string) => {
    setGuesses((prev) => {
      const current = prev[matchId] || { home: '', away: '', penaltyWinner: null };
      
      if (side === 'penaltyWinner') {
        return {
          ...prev,
          [matchId]: { ...current, penaltyWinner: value as 'home' | 'away' || null }
        };
      }
      
      const updated = { ...current, [side]: value };
      
      if (updated.home && updated.away) {
        const homeNum = parseInt(updated.home);
        const awayNum = parseInt(updated.away);
        if (homeNum !== awayNum) {
          updated.penaltyWinner = null;
        }
      } else {
        updated.penaltyWinner = null;
      }
      
      return {
        ...prev,
        [matchId]: updated
      };
    });
  };

  const handleSaveAllGuesses = async () => {
    if (!currentUserId || Object.keys(guesses).length === 0 || !activeCompetition?.id) return;
    
    setSavingGuesses(true);
    try {
      const matchIds = Object.keys(guesses).map(id => parseInt(id, 10));
      
      const { data: existingGuesses } = await supabase
        .from('guesses')
        .select('match_id, id')
        .eq('user_id', currentUserId)
        .in('match_id', matchIds);

      const existingMap = new Map();
      existingGuesses?.forEach(g => existingMap.set(g.match_id, g.id));

      const recordsToUpsert = Object.entries(guesses)
        .filter(([matchId, guess]) => {
          return guess.home && guess.away;
        })
        .map(([matchId, guess]) => {
          const matchIdNum = parseInt(matchId, 10);
          const homeNum = parseInt(guess.home, 10);
          const awayNum = parseInt(guess.away, 10);
          const isDraw = homeNum === awayNum;
          
          const record: any = {
            user_id: currentUserId,
            match_id: matchIdNum,
            home_guess: homeNum,
            away_guess: awayNum,
            competition_id: activeCompetition.id,
            updated_at: new Date().toISOString(),
          };

          const match = matches.find(m => m.id === matchIdNum);
          const isEliminatory = match ? isPlayoffPhase(match.phase) : false;
          
          if (isDraw && isEliminatory && guess.penaltyWinner) {
            record.penalty_winner_guess = guess.penaltyWinner;
          } else {
            record.penalty_winner_guess = null;
          }

          if (existingMap.has(matchIdNum)) {
            record.id = existingMap.get(matchIdNum);
          }

          return record;
        });

      if (recordsToUpsert.length === 0) {
        setGuesses({});
        return;
      }

      const { error } = await supabase
        .from('guesses')
        .upsert(recordsToUpsert, { 
          onConflict: 'user_id,match_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
      
      setGuesses({});
      await fetchMatches(); // Recarrega os dados
    } catch (err) {
      console.error('Erro ao salvar palpites:', err);
      alert('Erro ao salvar palpites. Tente novamente.');
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

  const isMatchEliminatory = (match: any) => {
    return isPlayoffPhase(match.phase);
  };

  // Agrupamento de Datas
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
        matches: [],
        phases: new Set<string>()
      };
    }
    groups[dateKey].matches.push(match);
    if (match.phase) groups[dateKey].phases.add(match.phase);
    
    return groups;
  }, {} as Record<string, DayGroup>);

  const sortedDays: DayGroup[] = Object.values(groupedMatches).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
  const todayMatches = groupedMatches[todayStr]?.matches || [];

  // Verifica se um jogo está bloqueado para palpites
  const isMatchLocked = (match: any) => {
    const matchTime = new Date(match.match_time).getTime();
    const now = new Date().getTime();
    return matchTime - now < 15 * 60 * 1000; // 15 minutos antes
  };

  const sortedDaysGroups = sortedDays.filter(day => !Array.from(day.phases).some(p => isPlayoffPhase(p)));
  const sortedDaysPlayoffs = sortedDays.filter(day => Array.from(day.phases).some(p => isPlayoffPhase(p)));

  const buttonTextColor = isColorDark(themeColor || '#ea580c') ? '#ffffff' : '#020617';

  if (!activeCompetition?.id) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500 gap-4">
        <Trophy size={48} className="opacity-20" />
        <p>Selecione uma competição no menu superior para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pb-10">
      {/* Indicador de atualização */}
      {isRefreshing && (
        <div className="fixed top-20 right-4 z-50 bg-slate-800/90 px-3 py-1.5 rounded-lg text-xs text-slate-400 flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" />
          Atualizando...
        </div>
      )}

      {/* Exibição do Campeão */}
      {championInfo.champion && (
        <div className="mb-2">
          <ChampionDisplay
            championName={championInfo.champion.userName}
            championLogo={championInfo.champion.userLogo}
            userPosition={championInfo.userPosition || undefined}
            userName="Você"
            isChampion={championInfo.isChampion}
            leagueName={activeLeague?.name}
          />
        </div>
      )}

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
                    todayMatches.map((match) => {
                      const isEliminatory = isMatchEliminatory(match);
                      const isDraw = isDrawScore(match.id);
                      const showPenaltySelector = isEliminatory && isDraw;
                      const isLocked = isMatchLocked(match);
                      
                      return (
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
                          guessHome={getGuessValue(match.id, 'home')}
                          guessAway={getGuessValue(match.id, 'away')}
                          penaltyWinnerGuess={getGuessValue(match.id, 'penaltyWinner')}
                          showPenaltySelector={showPenaltySelector}
                          onGuessChange={(side, val) => handleGuessChange(match.id, side, val)}
                          userGuess={match.userGuess}
                          points={match.points}
                          pointColor={match.pointColor}
                          isLocked={isLocked}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. NAVEGAÇÃO DE DATAS DIVIDIDA POR FASES */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden transition-all shadow-sm">
                <button
                  onClick={() => setIsDateSelectorOpen(!isDateSelectorOpen)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between font-display font-bold uppercase tracking-wide text-sm hover:bg-background/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={18} style={{ color: themeColor || 'var(--color-primary)' }} /> 
                    <span>Navegar por Datas e Fases</span>
                  </div>
                  {isDateSelectorOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {isDateSelectorOpen && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-border/50">
                    
                    {/* BLOCO: FASE DE GRUPOS */}
                    {sortedDaysGroups.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Fase de Grupos</h4>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {sortedDaysGroups.map((dayGroup) => {
                            const isToday = dayGroup.dateKey === todayStr;
                            const isSelected = selectedDateKey === dayGroup.dateKey;
                            const isCompleted = dayGroup.matches.every(m => m.status === 'FINISHED');
                            const splitLabel = dayGroup.dateLabel.split(', ');
                            const phaseType = getPhaseTheme(dayGroup.phases);
                            const style = phaseConfig[phaseType];

                            return (
                              <button
                                key={dayGroup.dateKey}
                                onClick={() => handleDateSelect(dayGroup.dateKey)}
                                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center transition-all flex-shrink-0 ${
                                  isSelected 
                                    ? style.active + ' ' + style.border
                                    : isCompleted && !isToday
                                      ? 'border-green-500/30 bg-green-900/10 hover:bg-green-900/20' 
                                      : style.border + ' ' + style.bg + ' hover:border-slate-500'
                                }`}
                              >
                                <span className={`text-[9px] uppercase font-bold px-1 z-10 ${isToday ? 'tracking-wider' : 'opacity-80'}`} style={{ color: isToday ? (themeColor || 'var(--color-primary)') : 'inherit' }}>
                                  {isToday ? 'HOJE' : splitLabel[0]}
                                </span>
                                <span className={`text-xs sm:text-sm font-bold z-10 ${isSelected ? '' : style.text}`}>{splitLabel[1]}</span>
                                {style.badge && style.badge}
                                {isCompleted && !isSelected && !style.badge && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500 opacity-70" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BLOCO: FASE ELIMINATÓRIA */}
                    {sortedDaysPlayoffs.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border/30">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Fases Eliminatórias</h4>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {sortedDaysPlayoffs.map((dayGroup) => {
                            const isToday = dayGroup.dateKey === todayStr;
                            const isSelected = selectedDateKey === dayGroup.dateKey;
                            const isCompleted = dayGroup.matches.every(m => m.status === 'FINISHED');
                            const splitLabel = dayGroup.dateLabel.split(', ');
                            const phaseType = getPhaseTheme(dayGroup.phases);
                            const style = phaseConfig[phaseType];

                            return (
                              <button
                                key={dayGroup.dateKey}
                                onClick={() => handleDateSelect(dayGroup.dateKey)}
                                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center transition-all flex-shrink-0 ${
                                  isSelected 
                                    ? style.active + ' ' + style.border
                                    : isCompleted && !isToday
                                      ? 'border-green-500/30 bg-green-900/10 hover:bg-green-900/20' 
                                      : style.border + ' ' + style.bg + ' hover:border-slate-500'
                                }`}
                              >
                                <span className={`text-[9px] uppercase font-bold px-1 z-10 ${isToday ? 'tracking-wider' : 'opacity-80'}`} style={{ color: isToday ? (themeColor || 'var(--color-primary)') : 'inherit' }}>
                                  {isToday ? 'HOJE' : splitLabel[0]}
                                </span>
                                <span className={`text-xs sm:text-sm font-bold z-10 ${isSelected ? '' : style.text}`}>{splitLabel[1]}</span>
                                {style.badge && style.badge}
                                {isCompleted && !isSelected && !style.badge && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500 opacity-70" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* 3. JOGOS DA DATA SELECIONADA */}
              {selectedDateKey !== todayStr && groupedMatches[selectedDateKey] && (
                <div 
                  ref={selectedDateSectionRef}
                  className="bg-card border border-border p-5 sm:p-6 rounded-2xl relative shadow-md animate-in fade-in duration-300 scroll-mt-24"
                >
                  {(() => {
                    const phaseType = getPhaseTheme(groupedMatches[selectedDateKey].phases);
                    const style = phaseConfig[phaseType];
                    
                    const phasesNames = Array.from(groupedMatches[selectedDateKey].phases)
                      .map(p => phaseNamesBR[p] || p)
                      .join(', ');

                    return (
                      <h2 className={`text-lg sm:text-xl font-display font-bold mb-6 uppercase tracking-tight flex items-center gap-2 ${style.text}`}>
                        {style.icon}
                        {groupedMatches[selectedDateKey].dateLabel}
                        <span className="text-xs sm:text-sm ml-1 opacity-70 font-normal">({phasesNames})</span>
                      </h2>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedMatches[selectedDateKey].matches.map((match) => {
                      const isEliminatory = isMatchEliminatory(match);
                      const isDraw = isDrawScore(match.id);
                      const showPenaltySelector = isEliminatory && isDraw;
                      const isLocked = isMatchLocked(match);
                      
                      return (
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
                          guessHome={getGuessValue(match.id, 'home')}
                          guessAway={getGuessValue(match.id, 'away')}
                          penaltyWinnerGuess={getGuessValue(match.id, 'penaltyWinner')}
                          showPenaltySelector={showPenaltySelector}
                          onGuessChange={(side, val) => handleGuessChange(match.id, side, val)}
                          userGuess={match.userGuess}
                          points={match.points}
                          pointColor={match.pointColor}
                          isLocked={isLocked}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* BARRA LATERAL COM STICKY FIXO */}
        <aside className="space-y-6 sticky top-24 self-start">
          <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-background rounded-lg text-primary shadow-sm" style={{ color: themeColor }}>
              <Trophy size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Exibindo estatísticas da</span>
              <h3 className="font-bold text-sm text-white">{activeLeague ? activeLeague.name : 'Liga Global'}</h3>
            </div>
          </div>

          <UserPerformance stats={userStats} themeColor={themeColor} />
        </aside>
      </div>

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