'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useCompetition } from '@/context/CompetitionContext';
import { Loader2, Trophy, Calendar, ArrowRight, Crown, History, Clock, Users, Play } from 'lucide-react';

interface CompetitionWithDetails {
  id: number;
  name: string;
  slug: string;
  theme_primary: string;
  theme_secondary: string;
  competition_logo: string;
  is_active: boolean;
  start_date: string;
  end_date: string;
  total_matches: number;
  total_teams: number;
  winner_team_name?: string;
  winner_team_logo?: string;
  current_leader_name?: string;
  current_leader_logo?: string;
}

export default function HistoricalPage() {
  const router = useRouter();
  const { selectCompetition } = useCompetition();
  const [competitions, setCompetitions] = useState<CompetitionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllCompetitions();
  }, []);

  const fetchAllCompetitions = async () => {
    setLoading(true);
    try {
      // Busca TODAS as competições (ativas E inativas)
      const { data: competitionsData, error: competitionsError } = await supabase
        .from('competitions')
        .select('*')
        .order('is_active', { ascending: false }) // Ativas primeiro
        .order('name', { ascending: true });

      if (competitionsError) {
        console.error('Erro ao buscar competições:', competitionsError);
        throw competitionsError;
      }

      if (!competitionsData || competitionsData.length === 0) {
        setCompetitions([]);
        setLoading(false);
        return;
      }

      // Para cada competição, busca informações adicionais
      const competitionsWithDetails = await Promise.all(
        competitionsData.map(async (competition: any) => {
          try {
            // Busca times da competição
            const { data: teams } = await supabase
              .from('competition_teams')
              .select(`
                team_id,
                teams:team_id (
                  id,
                  name,
                  logo_url
                )
              `)
              .eq('competition_id', competition.id);

            // Busca jogos da competição
            const { data: matches } = await supabase
              .from('matches')
              .select('id, home_score, away_score, home_team, away_team, status')
              .eq('competition_id', competition.id)
              .eq('status', 'FINISHED');

            const matchIds = (matches || []).map((m: any) => m.id);

            // Tenta encontrar o vencedor (time com mais pontos)
            let winnerTeam = null;
            let currentLeader = null;

            if (matches && matches.length > 0) {
              // Calcula pontuação dos times (3 pontos por vitória)
              const teamPoints: Record<number, { wins: number; points: number; name: string; logo: string }> = {};
              
              const allTeams = teams?.map((t: any) => ({
                id: t.team_id,
                name: t.teams?.name || 'Time',
                logo: t.teams?.logo_url || ''
              })) || [];

              allTeams.forEach((team: any) => {
                teamPoints[team.id] = {
                  wins: 0,
                  points: 0,
                  name: team.name,
                  logo: team.logo
                };
              });

              matches.forEach((match: any) => {
                const homeId = match.home_team;
                const awayId = match.away_team;
                const homeScore = match.home_score;
                const awayScore = match.away_score;

                if (homeScore !== null && awayScore !== null) {
                  if (homeScore > awayScore && teamPoints[homeId]) {
                    teamPoints[homeId].wins += 1;
                    teamPoints[homeId].points += 3;
                  } else if (awayScore > homeScore && teamPoints[awayId]) {
                    teamPoints[awayId].wins += 1;
                    teamPoints[awayId].points += 3;
                  } else if (homeScore === awayScore) {
                    if (teamPoints[homeId]) teamPoints[homeId].points += 1;
                    if (teamPoints[awayId]) teamPoints[awayId].points += 1;
                  }
                }
              });

              let maxPoints = 0;
              Object.entries(teamPoints).forEach(([id, data]) => {
                if (data.points > maxPoints) {
                  maxPoints = data.points;
                  winnerTeam = { id: parseInt(id), ...data };
                }
              });

              // Se a competição estiver ativa, busca o líder atual
              if (competition.is_active && matchIds.length > 0) {
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
                  .in('match_id', matchIds)
                  .not('points_awarded', 'is', null);

                if (guesses && guesses.length > 0) {
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

                  let maxUserScore = 0;
                  Object.entries(userScores).forEach(([uid, data]) => {
                    if (data.total > maxUserScore) {
                      maxUserScore = data.total;
                      currentLeader = { ...data, id: uid };
                    }
                  });
                }
              }
            }

            return {
              id: competition.id,
              name: competition.name,
              slug: competition.slug,
              theme_primary: competition.theme_primary,
              theme_secondary: competition.theme_secondary,
              competition_logo: competition.competition_logo || '',
              is_active: competition.is_active,
              start_date: competition.start_date,
              end_date: competition.end_date,
              total_matches: matches?.length || 0,
              total_teams: teams?.length || 0,
              winner_team_name: winnerTeam?.name,
              winner_team_logo: winnerTeam?.logo,
              current_leader_name: currentLeader?.name,
              current_leader_logo: currentLeader?.logo
            };
          } catch (error) {
            console.error(`Erro ao processar competição ${competition.id}:`, error);
            return {
              id: competition.id,
              name: competition.name,
              slug: competition.slug,
              theme_primary: competition.theme_primary,
              theme_secondary: competition.theme_secondary,
              competition_logo: competition.competition_logo || '',
              is_active: competition.is_active,
              start_date: competition.start_date,
              end_date: competition.end_date,
              total_matches: 0,
              total_teams: 0,
              winner_team_name: undefined,
              winner_team_logo: undefined,
              current_leader_name: undefined,
              current_leader_logo: undefined
            };
          }
        })
      );

      setCompetitions(competitionsWithDetails);
    } catch (error) {
      console.error('Erro ao buscar competições:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionClick = async (competition: CompetitionWithDetails) => {
    const { data: compData } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competition.id)
      .single();

    if (compData) {
      selectCompetition(compData);
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <History size={32} className="text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Todas as Competições</h1>
            <p className="text-sm text-slate-400">Confira todas as competições cadastradas</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-16 text-center">
          <Trophy size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-300 mb-2">Nenhuma competição encontrada</h3>
          <p className="text-slate-400">As competições aparecerão aqui quando forem criadas.</p>
        </div>
      </div>
    );
  }

  const activeCompetitions = competitions.filter(c => c.is_active);
  const historicalCompetitions = competitions.filter(c => !c.is_active);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <History size={32} className="text-primary" />
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight">Todas as Competições</h1>
          <p className="text-sm text-slate-400">Confira todas as competições cadastradas</p>
        </div>
      </div>

      {/* Todas as competições em uma única lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {competitions.map((competition) => (
          <button
            key={competition.id}
            onClick={() => handleCompetitionClick(competition)}
            className={`rounded-xl p-5 hover:scale-[1.02] transition-all text-left group ${
              competition.is_active 
                ? 'bg-gradient-to-br from-green-900/20 to-green-950/20 border border-green-500/30 hover:border-green-500/50'
                : 'bg-slate-900/50 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              {competition.competition_logo && (
                <img 
                  src={competition.competition_logo} 
                  className="w-12 h-12 object-contain flex-shrink-0" 
                  alt={competition.name} 
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate">
                  {competition.name}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <Calendar size={12} />
                  <span>{competition.start_date ? new Date(competition.start_date).toLocaleDateString('pt-BR') : 'N/A'}</span>
                  <span>→</span>
                  <span>{competition.end_date ? new Date(competition.end_date).toLocaleDateString('pt-BR') : 'Em andamento'}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1 ${
                competition.is_active 
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-slate-700/50 text-slate-400'
              }`}>
                {competition.is_active ? (
                  <>
                    <Clock size={10} />
                    Ativa
                  </>
                ) : (
                  'Finalizada'
                )}
              </span>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs mb-4">
              <div className="bg-slate-800/50 rounded-lg p-2">
                <Users size={14} className="mx-auto mb-1 text-slate-500" />
                <span className="font-bold text-white">{competition.total_teams}</span>
                <p className="text-[9px] text-slate-500 uppercase">Times</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-2">
                <Calendar size={14} className="mx-auto mb-1 text-slate-500" />
                <span className="font-bold text-white">{competition.total_matches}</span>
                <p className="text-[9px] text-slate-500 uppercase">Jogos</p>
              </div>
            </div>

            {/* Status específico */}
            {competition.is_active && competition.current_leader_name && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-blue-400" />
                    <span className="text-xs font-bold text-slate-300">Líder</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {competition.current_leader_logo && (
                      <img src={competition.current_leader_logo} className="w-5 h-5 object-contain" alt="" />
                    )}
                    <span className="font-bold text-blue-400">{competition.current_leader_name}</span>
                  </div>
                </div>
              </div>
            )}

            {!competition.is_active && competition.winner_team_name && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown size={16} className="text-yellow-500" />
                    <span className="text-xs font-bold text-slate-300">Campeão</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {competition.winner_team_logo && (
                      <img src={competition.winner_team_logo} className="w-5 h-5 object-contain" alt="" />
                    )}
                    <span className="font-bold text-yellow-500">{competition.winner_team_name}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 text-center text-xs text-primary group-hover:underline flex items-center justify-center gap-1">
              {competition.is_active ? 'Acessar competição' : 'Ver detalhes'} <ArrowRight size={12} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}