'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Trophy, Medal, ChevronUp, ChevronDown, Minus, Users, ChartNoAxesCombinedIcon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useCompetition } from '@/context/CompetitionContext';
import { useLeague } from '@/context/LeagueContext';
import { calculateGuessPoints, GLOBAL_LEAGUE_RULES, isPlayoffPhase } from '@/utils/leagueEngine';

export default function RankingPage() {
  const { activeCompetition } = useCompetition();
  const { activeLeague } = useLeague();
  const { themeColor } = useTheme();
  
  
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

      // 1. CARREGA MEMBROS ANTECIPADAMENTE (Para não excluir quem não palpitou ainda)
      if (activeLeague) {
        const { data: members } = await supabase
          .from('league_members')
          .select('user_id, profiles(username, teams(logo_url))')
          .eq('league_id', activeLeague.id);
          
        if (members) {
          members.forEach((m: any) => {
            validUsers.add(m.user_id);
            // Corrige estrutura de objeto vindo do Supabase
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            const team = profile?.teams ? (Array.isArray(profile.teams) ? profile.teams[0] : profile.teams) : null;

            totalScores[m.user_id] = { id: m.user_id, name: profile?.username || 'Usuário', logo: team?.logo_url || defaultLogo, total: 0 };
            yesterdayScores[m.user_id] = 0;
          });
        }
      }

      // 2. BUSCA JOGOS
      const { data: matches } = await supabase.from('matches').select('*').eq('competition_id', activeCompetition.id);
      const matchDataObj: Record<number, any> = {};
      matches?.forEach(m => {
        matchDataObj[m.id] = { h: m.home_score, a: m.away_score, hp: m.home_penalty, ap: m.away_penalty, phase: m.phase, time: new Date(m.match_time).setHours(0, 0, 0, 0) };
      });

      // 3. BUSCA PALPITES
      const { data: allGuesses } = await supabase
        .from('guesses')
        .select(`user_id, match_id, points_awarded, home_guess, away_guess, profiles(username, teams(logo_url))`)
        .eq('competition_id', activeCompetition.id);

      const todayTime = new Date().setHours(0, 0, 0, 0);
      const rulesToUse = activeLeague || GLOBAL_LEAGUE_RULES;

      allGuesses?.forEach((g: any) => {
        const uid = g.user_id;
        
        // Exclui não-membros se estivermos vendo uma liga privada
        if (activeLeague && !validUsers.has(uid)) return;

        const mData = matchDataObj[g.match_id];
        if (!mData) return;

        let pts = 0;
        if (mData.h !== null && mData.a !== null) {
          if (activeLeague) {
            pts = calculateGuessPoints(mData.h, mData.a, g.home_guess, g.away_guess, rulesToUse, isPlayoffPhase(mData.phase), mData.hp, mData.ap).pts;
          } else {
            // LIGA GLOBAL: Ponto do banco * Multiplicador
            pts = g.points_awarded || 0;
            if (isPlayoffPhase(mData.phase) && GLOBAL_LEAGUE_RULES.playoff_multiplier > 1) {
              pts *= GLOBAL_LEAGUE_RULES.playoff_multiplier;
            }
          }
        }

        // Se for a Liga Global, cadastra a pessoa no momento que ela aparecer nos palpites
        if (!totalScores[uid]) {
          const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
          const team = profile?.teams ? (Array.isArray(profile.teams) ? profile.teams[0] : profile.teams) : null;
          totalScores[uid] = { id: uid, name: profile?.username || 'Usuário', logo: team?.logo_url || defaultLogo, total: 0 };
          yesterdayScores[uid] = 0;
        }

        totalScores[uid].total += pts;
        if (mData.time < todayTime) yesterdayScores[uid] += pts;
      });

      // 4. ORDENA E CALCULA MOVIMENTAÇÃO
      const sortedTotal = Object.values(totalScores).sort((a: any, b: any) => b.total - a.total);
      const sortedYesterday = Object.entries(yesterdayScores).sort((a: any, b: any) => b[1] - a[1]);

      const finalRanking = sortedTotal.map((user: any, index) => {
        const currentPos = index + 1;
        const prevPos = sortedYesterday.findIndex((entry) => entry[0] === user.id) + 1;
        const movement = prevPos === 0 ? 0 : (prevPos - currentPos);
        return { ...user, movement };
      });

      setRanking(finalRanking);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 pb-20">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <ChartNoAxesCombinedIcon size={28} style={{ color: themeColor || 'var(--color-primary)' }} />
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Ranking Oficial</h1>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-background/50 border border-border/50 py-2 px-4 rounded-xl w-fit">
          <Trophy size={16} className={activeLeague ? 'text-yellow-500' : 'text-primary'} />
          <span>Exibindo ranking da: </span>
          <span className="font-bold text-white uppercase tracking-wider">{activeLeague ? activeLeague.name : 'Liga Global'}</span>
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
                <div className="flex items-center gap-6">
                  <div className={`flex items-center gap-1 text-xs font-bold ${user.movement > 0 ? 'text-green-500' : user.movement < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {user.movement > 0 && <ChevronUp size={16} />}
                    {user.movement < 0 && <ChevronDown size={16} />}
                    {user.movement === 0 && <Minus size={16} className="opacity-50" />}
                    {user.movement !== 0 && Math.abs(user.movement)}
                  </div>
                  <div className="flex flex-col items-end w-16">
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
  );
}