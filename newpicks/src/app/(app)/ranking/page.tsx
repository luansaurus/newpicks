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

  const defaultLogo = "https://assets.football-logos.cc/logos/tournaments/512x512/fifa-world-cup-2026--white.12f8795d.png";

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);
      fetchRanking();
    };
    init();
  }, [activeCompetition, activeLeague]);

  const fetchRanking = async () => {
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
            if (profile?.is_test) return; // Ignora os usuários de teste
            
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
          home_score: m.home_score ?? null,
          away_score: m.away_score ?? null,
          home_team: relHome || { name: m.home_team, short_code: m.home_team?.substring(0,3).toUpperCase(), logo_url: defaultLogo },
          away_team: relAway || { name: m.away_team, short_code: m.away_team?.substring(0,3).toUpperCase(), logo_url: defaultLogo },
          palpites: {}
        };
      });

      const { data: allGuesses } = await supabase
        .from('guesses')
        .select(`user_id, match_id, points_awarded, home_guess, away_guess, penalty_winner_guess, user_profile:profiles!guesses_user_id_fkey(username, teams(logo_url), is_test)`)
        .in('match_id', matchIds)
        .limit(20000); 

      const todayTime = new Date().setHours(0, 0, 0, 0);
      const rulesToUse = activeLeague || GLOBAL_LEAGUE_RULES;

      allGuesses?.forEach((g: any) => {
        const profile = Array.isArray(g.user_profile) ? g.user_profile[0] : g.user_profile;
        if (profile?.is_test) return;

        const uid = g.user_id;
        if (activeLeague && !validUsers.has(uid)) return;

        const mData = matchDataObj[g.match_id];
        if (!mData) return;

        let pts = 0;
        let guessColor = 'GRAY'; 

        if (mData.h !== null && mData.a !== null) {
          const calc = calculateGuessPoints(mData.h, mData.a, g.home_guess, g.away_guess, rulesToUse, isPlayoffPhase(mData.phase), mData.hp, mData.ap);
          guessColor = calc.color;

          if (activeLeague) {
            // Liga Privada: O Motor recalcula com as regras customizadas
            pts = calc.pts;
          } else {
            // LIGA GLOBAL: Pega os pontos base do banco e APLICA a multiplicação do mata-mata
            pts = g.points_awarded || 0;
            if (isPlayoffPhase(mData.phase) && GLOBAL_LEAGUE_RULES.playoff_multiplier > 1) {
              pts *= GLOBAL_LEAGUE_RULES.playoff_multiplier;
            }
          }
        }

        const userName = profile?.username || 'Competidor';
        const team = profile?.teams ? (Array.isArray(profile.teams) ? profile.teams[0] : profile.teams) : null;

        if (matchesWithGuesses[g.match_id]) {
          matchesWithGuesses[g.match_id].palpites[uid] = { 
            home: g.home_guess, 
            away: g.away_guess, 
            penalty_winner: g.penalty_winner_guess,
            pts, 
            color: guessColor,
            name: userName
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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 pb-20 relative">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <ChartNoAxesCombinedIcon size={28} style={{ color: themeColor || 'var(--color-primary)' }} />
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Ranking Oficial</h1>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4 bg-background/50 border border-border/50 py-3 px-4 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Trophy size={16} className={activeLeague ? 'text-yellow-500' : 'text-primary'} />
            <span>Ranking da: </span>
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

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>
      ) : ranking.length === 0 ? (
        <div className="bg-card border border-border p-10 rounded-2xl flex flex-col items-center gap-4 text-slate-500 text-center">
          <Users size={48} className="opacity-20" />
          <p>Ninguém na liga pontuou ainda ou a liga está vazia.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {ranking.map((user, index) => {
            const isMe = user.id === currentUserId;
            
            return (
              <div key={user.id} className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${isMe ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold font-display ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : index === 1 ? 'bg-slate-300/30 text-slate-300' : index === 2 ? 'bg-orange-800/30 text-orange-700' : 'text-slate-500'}`}>
                    {index < 3 ? <Medal size={20} /> : <span className="text-sm">{index + 1}º</span>}
                  </div>
                  <img src={user.logo} className="w-10 h-10 rounded-full object-contain bg-background border border-border p-1" />
                  <span className={`font-medium ${isMe ? 'text-primary font-bold' : ''}`}>{user.name}</span>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  {!isMe && (
                    <button 
                      onClick={() => setCompModal({userB: user})} 
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="Comparar resultados"
                    >
                      <Search size={16} />
                    </button>
                  )}
                  <div className={`hidden sm:flex items-center gap-1 text-xs font-bold ${user.movement > 0 ? 'text-green-500' : user.movement < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {user.movement > 0 && <ChevronUp size={16} />}
                    {user.movement < 0 && <ChevronDown size={16} />}
                    {user.movement === 0 && <Minus size={16} className="opacity-50" />}
                    {user.movement !== 0 && Math.abs(user.movement)}
                  </div>
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
    </div>
  );
}