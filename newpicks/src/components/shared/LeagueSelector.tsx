'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useLeague } from '@/context/LeagueContext';
import { Globe, Users, Lock, Loader2, CheckCircle2, Crown } from 'lucide-react';

interface LeagueSelectorProps {
  competitionId: number;
  currentUserId: string;
  onRowClick: () => void;
}

export function LeagueSelector({ competitionId, currentUserId, onRowClick }: LeagueSelectorProps) {
  const { activeLeague, selectLeague } = useLeague();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueChampions, setLeagueChampions] = useState<Record<string, { name: string; logo?: string }>>({});

  useEffect(() => {
    if (!competitionId || !currentUserId) return;
    
    const fetchLeagues = async () => {
      const { data } = await supabase
        .from('leagues')
        .select('*, league_members!inner(user_id)')
        .eq('competition_id', competitionId)
        .eq('league_members.user_id', currentUserId);
        
      if (data) {
        setLeagues(data);
        // Busca campeões de cada liga
        await fetchLeagueChampions(data);
      }
      setLoading(false);
    };
    fetchLeagues();
  }, [competitionId, currentUserId]);

  const fetchLeagueChampions = async (leagues: any[]) => {
    const champions: Record<string, { name: string; logo?: string }> = {};
    
    for (const league of leagues) {
      try {
        // Busca membros da liga
        const { data: members } = await supabase
          .from('league_members')
          .select('user_id')
          .eq('league_id', league.id);

        if (!members || members.length === 0) continue;

        const memberIds = members.map(m => m.user_id);

        // Busca palpites dos membros
        const { data: guesses } = await supabase
          .from('guesses')
          .select(`
            user_id,
            points_awarded,
            profiles:user_id (
              username,
              teams (logo_url)
            )
          `)
          .in('user_id', memberIds);

        if (!guesses || guesses.length === 0) continue;

        // Calcula pontuação por usuário
        const userScores: Record<string, { total: number; name: string; logo: string }> = {};
        guesses.forEach((g: any) => {
          const profile = Array.isArray(g.profiles) ? g.profiles[0] : g.profiles;
          if (!profile) return;
          const uid = g.user_id;
          if (!userScores[uid]) {
            const teamLogo = profile.teams && profile.teams.length > 0 ? profile.teams[0].logo_url : '';
            userScores[uid] = {
              total: 0,
              name: profile.username || 'Usuário',
              logo: teamLogo || ''
            };
          }
          userScores[uid].total += (g.points_awarded || 0);
        });

        // Encontra o campeão
        let champion: { name: string; logo?: string } | null = null;
        let maxScore = 0;
        Object.entries(userScores).forEach(([uid, data]) => {
          if (data.total > maxScore) {
            maxScore = data.total;
            champion = {
              name: data.name,
              logo: data.logo
            };
          }
        });

        if (champion) {
          champions[league.id] = champion;
        }
      } catch (error) {
        console.error(`Erro ao buscar campeão da liga ${league.id}:`, error);
      }
    }

    setLeagueChampions(champions);
  };

  if (loading) {
    return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-500" size={20} /></div>;
  }

  return (
    <div className="py-2 max-h-60 overflow-y-auto scrollbar-thin">
      {/* OPÇÃO GLOBAL */}
      <button
        onClick={() => { selectLeague(null); onRowClick(); }}
        className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${!activeLeague ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'hover:bg-white/5 text-slate-300 border-l-2 border-transparent'}`}
      >
        <div className="flex items-center gap-3">
          <Globe size={16} />
          <span className="text-sm font-medium">Liga Global</span>
        </div>
        {!activeLeague && <CheckCircle2 size={16} />}
      </button>

      {/* LIGAS DO USUÁRIO */}
      {leagues.map(league => {
        const champion = leagueChampions[league.id];
        const isSelected = activeLeague?.id === league.id;

        return (
          <button
            key={league.id}
            onClick={() => { selectLeague(league); onRowClick(); }}
            className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${isSelected ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'hover:bg-white/5 text-slate-300 border-l-2 border-transparent'}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                {league.is_private ? <Lock size={16} /> : <Users size={16} />}
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block">{league.name}</span>
                {champion && (
                  <span className="text-[9px] text-yellow-500 flex items-center gap-1 mt-0.5">
                    <Crown size={10} />
                    Campeão: {champion.name}
                  </span>
                )}
              </div>
            </div>
            {isSelected && <CheckCircle2 size={16} className="flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}