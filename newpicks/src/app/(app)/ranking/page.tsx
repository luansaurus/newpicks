'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Trophy, Medal, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useCompetition } from '@/context/CompetitionContext';

export default function RankingPage() {
  const { activeCompetition } = useCompetition(); // Corrigido: sem await
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
  }, [activeCompetition]);

  const fetchRanking = async () => {
    if (!activeCompetition?.id) return;
    setLoading(true);

    const { data: allGuesses, error } = await supabase
      .from('guesses')
      .select(`
        user_id,
        points_awarded,
        match_id,
        profiles(username, teams(logo_url)),
        matches(match_time)
      `)
      .eq('competition_id', activeCompetition.id);

    if (error) {
      console.error('Erro ao buscar ranking:', error);
      return;
    }

    const todayTime = new Date().setHours(0, 0, 0, 0);

    const totalScores: Record<string, any> = {};
    const yesterdayScores: Record<string, number> = {};

    allGuesses.forEach((g: any) => {
      const uid = g.user_id;
      const pts = g.points_awarded || 0;
      const matchTime = new Date(g.matches.match_time).getTime();

      if (!totalScores[uid]) {
        totalScores[uid] = { 
          id: uid, name: g.profiles?.username, logo: g.profiles?.teams?.logo_url || defaultLogo, total: 0 
        };
        yesterdayScores[uid] = 0;
      }

      totalScores[uid].total += pts;
      if (matchTime < todayTime) {
        yesterdayScores[uid] += pts;
      }
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
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={28} style={{ color: themeColor || 'var(--color-primary)' }} />
        <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Ranking Geral</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={32} /></div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {ranking.map((user, index) => {
            const isMe = user.id === currentUserId;
            
            return (
              <div key={user.id} className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${isMe ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-4">
                  {/* Posição com Medalha ou número */}
                  <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold font-display ${
                    index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    index === 1 ? 'bg-slate-300/30 text-slate-300' :
                    index === 2 ? 'bg-orange-800/30 text-orange-700' : 'text-slate-500'
                  }`}>
                    {index < 3 ? <Medal size={20} /> : <span className="text-sm">{index + 1}º</span>}
                  </div>

                  <img src={user.logo} className="w-10 h-10 rounded-full object-contain bg-background border border-border p-1" />
                  <span className={`font-medium ${isMe ? 'text-primary font-bold' : ''}`}>{user.name}</span>
                </div>

                <div className="flex items-center gap-6">
                  {/* Movimento */}
                  <div className={`flex items-center gap-1 text-xs font-bold ${
                    user.movement > 0 ? 'text-green-500' : user.movement < 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {user.movement > 0 && <ChevronUp size={16} />}
                    {user.movement < 0 && <ChevronDown size={16} />}
                    {user.movement === 0 && <Minus size={16} className="opacity-50" />}
                    {user.movement !== 0 && Math.abs(user.movement)}
                  </div>

                  {/* Pontos Empilhados */}
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