'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { ScoreManager } from '@/components/admin/ScoreManager';
import { MatchManager } from '@/components/admin/MatchManager';
import { SettingsManager } from '@/components/admin/settings/SettingsManager';

type Team = {
  id: number;
  name: string;
  short_code: string;
  logo_url: string;
};

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  home_team_data?: Team | null;
  away_team_data?: Team | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty: number | null;
  away_penalty: number | null;
  status: string;
  phase: string;
  match_time: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        if (!profile?.is_admin) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
        await loadMatches();
      } catch (error) {
        console.error('Erro ao verificar admin:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  const loadMatches = async () => {
    try {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, short_code, logo_url');

      if (teamsError) throw teamsError;

      const teamsMap: Record<number, Team> = {};
      teams?.forEach((team: Team) => {
        teamsMap[team.id] = team;
      });

      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('match_time', { ascending: true });

      if (matchesError) throw matchesError;

      const enrichedMatches = matchesData?.map((match: any) => ({
        ...match,
        home_team_data: teamsMap[match.home_team_id] || null,
        away_team_data: teamsMap[match.away_team_id] || null,
      })) || [];

      setMatches(enrichedMatches);
    } catch (error) {
      console.error('Erro ao carregar partidas:', error);
    }
  };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const response = await fetch('/api/sync-matches');
      const data = await response.json();
      
      // Recarrega os dados após a sincronização
      await loadMatches();
      
      return {
        sucesso: data.sucesso !== false,
        mensagem: data.mensagem || data.message,
        jogosProcessados: data.jogosProcessados || 0,
        erro: data.erro
      };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro na sincronização'
      };
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminPortal 
      onSync={handleSync} 
      syncLoading={syncLoading}
      scoreManager={<ScoreManager matches={matches} onMatchUpdate={loadMatches} />}
      matchManager={<MatchManager matches={matches} onMatchUpdate={loadMatches} />}
      settingsManager={<SettingsManager matches={matches} onUpdate={loadMatches} />}
    />
  );
}