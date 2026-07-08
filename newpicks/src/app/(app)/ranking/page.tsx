'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Trophy, Medal, ChevronUp, ChevronDown, Minus, Users, ChartNoAxesCombinedIcon, Search, Eye } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useCompetition } from '@/context/CompetitionContext';
import { useLeague } from '@/context/LeagueContext';
import { calculateGuessPoints, GLOBAL_LEAGUE_RULES, isPlayoffPhase } from '@/utils/leagueEngine';
import { SpyModal } from '@/components/shared/modals/SpyModal';
import { ComparisonModal } from '@/components/shared/modals/ComparisonModal';
import { ChampionDisplay } from '@/components/shared/ChampionDisplay';
import { getUserChampionInfo, ChampionInfo } from '@/utils/championUtils';

export default function RankingPage() {
  const { activeCompetition } = useCompetition();
  const { activeLeague } = useLeague();
  const { themeColor } = useTheme();
  
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [spyModal, setSpyModal] = useState<{isOpen: boolean, user: any | null}>({isOpen: false, user: null});
  const [compModal, setCompModal] = useState<any>(null);
  const [matchesForModals, setMatchesForModals] = useState<any[]>([]);

  const [championInfo, setChampionInfo] = useState<{ 
    champion: ChampionInfo | null; 
    userPosition: number | null; 
    isChampion: boolean;
  }>({
    champion: null,
    userPosition: null,
    isChampion: false
  });

  const defaultLogo = "https://assets.football-logos.cc/logos/tournaments/512x512/fifa-world-cup-2026--white.12f8795d.png";

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        await fetchRanking(session.user.id);
      } else {
        setLoading(false);
      }
    };
    init();
  }, [activeCompetition, activeLeague]);

  const fetchRanking = async (userId: string) => {
    if (!activeCompetition?.id) return;
    setLoading(true);

    try {
      let validUsers = new Set<string>();
      const totalScores: Record<string, any> = {};
      const yesterdayScores: Record<string, number> = {};

      if (activeLeague) {
        const { data: members } = await supabase
          .from('league_members')
          .select('user_id, profiles!league_members_user_id_fkey(username, teams(logo_url), is_test)')
          .eq('league_id', activeLeague.id);
          
        if (members) {
          members.forEach((m: any) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            if (profile?.is_test) return;
            validUsers.add(m.user_id);
            const team = profile?.teams ? (Array.isArray(profile.teams) ? profile.teams[0] : profile.teams) : null;
            totalScores[m.user_id] = { id: m.user_id, name: profile?.username || 'Usuário', logo: team?.logo_url || defaultLogo, total: 0 };
            yesterdayScores[m.user_id] = 0;
          });
        }
      }

      const { data: matches } = await supabase
        .from('matches')
        .select('id, match_time, status, home_score, away_score, home_penalty, away_penalty, phase, competition_id, home_team, away_team, home_team_rel:teams!home_team_id(id, name, short_code, logo_url), away_team_rel:teams!away_team_id(id, name, short_code, logo_url)')
        .eq('competition_id', activeCompetition.id)
        .order('match_time', { ascending: true })
        .limit(1000); 

      const matchDataObj: Record<number, any> = {};
      const matchesWithGuesses: Record<number, any> = {}; 
      const matchIds: number[] = [];

      matches?.forEach(m => {
        let uiStatus = 'SCHEDULED';
        if (m.status === 'FT' || m.status === 'FINISHED' || m.status === 'AET' || m.status === 'PEN') uiStatus = 'FINISHED';
        else if (m.status === 'LIVE' || m.status === 'HT' || m.status === 'IN_PLAY') uiStatus = 'IN_PLAY';
        matchIds.push(m.id);
        matchDataObj[m.id] = { h: m.home_score, a: m.away_score, hp: m.home_penalty, ap: m.away_penalty, phase: m.phase, time: new Date(m.match_time).setHours(0, 0, 0, 0) };
        
        const relHome = Array.isArray(m.home_team_rel) ? m.home_team_rel[0] : m.home_team_rel;
        const relAway = Array.isArray(m.away_team_rel) ? m.away_team_rel[0] : m.away_team_rel;

        matchesWithGuesses[m.id] = {
          ...m,
          status: uiStatus,
          home_team: relHome || { name: m.home_team, short_code: m.home_team?.substring(0,3).toUpperCase(), logo_url: defaultLogo },
          away_team: relAway || { name: m.away_team, short_code: m.away_team?.substring(0,3).toUpperCase(), logo_url: defaultLogo },
          palpites: {}
        };
      });

      // =======================================================================
      // A CORREÇÃO MÁGICA: Paginação robusta para driblar o limite do Supabase
      // =======================================================================
      let allGuesses: any[] = [];
      let hasMore = true;
      let offset = 0;
      const PAGE_SIZE = 1000;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('guesses')
          .select(`user_id, match_id, points_awarded, home_guess, away_guess, penalty_winner_guess, user_profile:profiles!guesses_user_id_fkey(username, teams(logo_url), is_test)`)
          .in('match_id', matchIds)
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error("Erro na busca de palpites:", error);
          break;
        }

        if (chunk && chunk.length > 0) {
          allGuesses = [...allGuesses, ...chunk];
          offset += PAGE_SIZE;
          if (chunk.length < PAGE_SIZE) {
            hasMore = false; // Bateu no final
          }
        } else {
          hasMore = false;
        }
      }

      // Remove duplicatas
      const uniqueGuesses = new Map();
      allGuesses.forEach(g => {
        const key = `${g.user_id}-${g.match_id}`;
        if (!uniqueGuesses.has(key)) {
          uniqueGuesses.set(key, g);
        }
      });
      const uniqueGuessesArray = Array.from(uniqueGuesses.values());

      const todayTime = new Date().setHours(0, 0, 0, 0);
      const rulesToUse = activeLeague || GLOBAL_LEAGUE_RULES;

      uniqueGuessesArray.forEach((g: any) => {
        const profile = Array.isArray(g.user_profile) ? g.user_profile[0] : g.user_profile;
        if (profile?.is_test) return;
        const uid = g.user_id;
        if (activeLeague && !validUsers.has(uid)) return;

        const mData = matchDataObj[g.match_id];
        if (!mData) return;

        let pts = 0;
        let guessColor = 'GRAY'; 

        if (mData.h !== null && mData.a !== null) {
          const calc = calculateGuessPoints(mData.h, mData.a, g.home_guess, g.away_guess, rulesToUse, isPlayoffPhase(mData.phase), mData.hp, mData.ap, g.penalty_winner_guess);
          guessColor = calc.color;
          
          const basePoints = g.points_awarded || 0;
          
          if (activeLeague) {
            pts = calc.pts;
          } else {
            if (isPlayoffPhase(mData.phase) && GLOBAL_LEAGUE_RULES.playoff_multiplier > 1) {
              pts = basePoints * GLOBAL_LEAGUE_RULES.playoff_multiplier;
            } else {
              pts = basePoints;
            }
          }
        }

        const userName = profile?.username || 'Competidor';
        const team = profile?.teams ? (Array.isArray(profile.teams) ? profile.teams[0] : profile.teams) : null;

        if (matchesWithGuesses[g.match_id]) {
          matchesWithGuesses[g.match_id].palpites[uid] = { 
            home: g.home_guess, away: g.away_guess, penalty_winner: g.penalty_winner_guess,
            pts, color: guessColor, name: userName
          };
        }

        if (!totalScores[uid]) {
          totalScores[uid] = { id: uid, name: userName, logo: team?.logo_url || defaultLogo, total: 0 };
          yesterdayScores[uid] = 0;
        }

        totalScores[uid].total += pts;
        if (mData.time < todayTime) yesterdayScores[uid] += pts;
      });

      const sortedTotal = Object.values(totalScores).sort((a: any, b: any) => b.total - a.total);
      const sortedYesterday = Object.entries(yesterdayScores).sort((a: any, b: any) => b[1] - a[1]);

      const finalRanking = sortedTotal.map((user: any, index) => {
        const currentPos = index + 1;
        const prevPos = sortedYesterday.findIndex((entry) => entry[0] === user.id) + 1;
        const movement = prevPos === 0 ? 0 : (prevPos - currentPos);
        return { ...user, movement };
      });

      setRanking(finalRanking);
      setMatchesForModals(Object.values(matchesWithGuesses));

      if (userId && activeCompetition?.id) {
        const championData = await getUserChampionInfo(
          activeCompetition.id,
          userId,
          activeLeague?.id || null
        );
        setChampionInfo(championData);
      }

    } catch (e) { 
      console.error('Erro ao buscar ranking:', e); 
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex flex-col h-full max-w-3xl mx-auto px-4 pb-24">
        
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pt-6 pb-4 space-y-4">
          <div className="flex items-center gap-3">
            <ChartNoAxesCombinedIcon size={28} style={{ color: themeColor || 'var(--color-primary)' }} />
            <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Ranking Oficial</h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 bg-background/50 border border-border/50 py-3 px-4 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Trophy size={16} className={activeLeague ? 'text-yellow-500' : 'text-primary'} />
              <span className="font-bold text-white uppercase tracking-wider">{activeLeague ? activeLeague.name : 'Liga Global'}</span>
            </div>
            <button 
              onClick={() => setSpyModal({isOpen: true, user: {id: 'ALL', name: 'Geral'}})} 
              className="flex items-center gap-2 text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded hover:bg-primary/20 transition-colors uppercase tracking-wider"
              style={{ color: themeColor }}
            >
              <Eye size={14} /> Espiar Geral
            </button>
          </div>
        </div>

        {championInfo.champion && (
          <div className="mb-6">
            <ChampionDisplay
              championName={championInfo.champion.userName}
              championLogo={championInfo.champion.userLogo}
              userPosition={championInfo.userPosition || undefined}
              userName={currentUserId ? 'Você' : undefined}
              isChampion={championInfo.isChampion}
              leagueName={activeLeague?.name}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto pt-2">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>
          ) : ranking.length === 0 ? (
            <div className="bg-card border border-border p-10 rounded-2xl text-center text-slate-500">
              <Users size={48} className="mx-auto opacity-20 mb-4" />
              <p>Nenhum participante encontrado.</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {ranking.map((user, index) => {
                const isMe = user.id === currentUserId;
                const isChampion = championInfo.isChampion && isMe;
                
                return (
                  <div key={user.id} className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${isMe ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold font-display ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                        index === 1 ? 'bg-slate-300/30 text-slate-300' : 
                        index === 2 ? 'bg-orange-800/30 text-orange-700' : 
                        'text-slate-500'
                      }`}>
                        {index < 3 ? <Medal size={20} /> : <span className="text-sm">{index + 1}º</span>}
                      </div>
                      <img src={user.logo} className="w-10 h-10 rounded-full object-contain bg-background border border-border p-1" />
                      <span className={`font-medium ${isMe ? 'text-primary font-bold' : ''}`}>
                        {user.name}
                        {isChampion && (
                          <span className="ml-2 text-[10px] font-bold bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
                            🏆 Campeão
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                      {!isMe && (
                        <button onClick={() => setCompModal({userB: user})} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                          <Search size={16} />
                        </button>
                      )}
                      <div className="flex flex-col items-end w-12 sm:w-16">
                        <span className="font-display font-bold text-lg leading-none">{user.total}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">PTS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SpyModal 
        isOpen={spyModal.isOpen} 
        onClose={() => setSpyModal({isOpen: false, user: null})} 
        targetUser={spyModal.user} 
        matches={matchesForModals} 
        rankingUsers={ranking} 
      />
      
      <ComparisonModal 
        isOpen={!!compModal} 
        onClose={() => setCompModal(null)} 
        userA={{id: currentUserId, name: 'Você'}} 
        userB={compModal?.userB} 
        matches={matchesForModals} 
      />
    </>
  );
}