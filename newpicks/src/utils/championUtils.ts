// utils/championUtils.ts
import { supabase } from './supabase/client';

export interface ChampionInfo {
  userId: string;
  userName: string;
  userLogo?: string;
  totalPoints: number;
  position: number;
}

export async function getUserChampionInfo(
  competitionId: number,
  userId: string,
  leagueId?: string | null
): Promise<{ champion: ChampionInfo | null; userPosition: number | null; isChampion: boolean }> {
  try {
    // Busca os matches da competição
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('status', 'FINISHED');

    if (!matches || matches.length === 0) {
      return { champion: null, userPosition: null, isChampion: false };
    }

    const matchIds = matches.map(m => m.id);

    // Busca os palpites
    let query = supabase
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

    // Se tiver leagueId, filtra pelos membros da liga
    if (leagueId) {
      const { data: members } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId);

      const memberIds = members?.map(m => m.user_id) || [];
      if (memberIds.length > 0) {
        query = query.in('user_id', memberIds);
      } else {
        return { champion: null, userPosition: null, isChampion: false };
      }
    }

    const { data: guesses } = await query;

    if (!guesses || guesses.length === 0) {
      return { champion: null, userPosition: null, isChampion: false };
    }

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

    // Ordena por pontuação
    const sorted = Object.entries(userScores)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([userId, data], index) => ({
        userId,
        userName: data.name,
        userLogo: data.logo,
        totalPoints: data.total,
        position: index + 1
      }));

    const champion = sorted[0] || null;
    const userPosition = sorted.find(u => u.userId === userId)?.position || null;

    return {
      champion,
      userPosition,
      isChampion: champion?.userId === userId
    };
  } catch (error) {
    console.error('Erro ao buscar informações do campeão:', error);
    return { champion: null, userPosition: null, isChampion: false };
  }
}