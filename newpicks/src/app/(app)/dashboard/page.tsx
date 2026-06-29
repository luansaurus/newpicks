'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { MatchCard, MatchStatus } from '@/components/shared/MatchCard';
import { Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { useCompetition } from '@/context/CompetitionContext';

export default function DashboardPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        // 1. Pegamos a data atual para filtrar os jogos do dia
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // 2. A Consulta Relacional Poderosa
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id,
            match_time,
            status,
            home_score,
            away_score,
            home_team:teams!home_team_id (id, name, short_code, logo_url),
            away_team:teams!away_team_id (id, name, short_code, logo_url)
          `)
          // Traz apenas jogos de hoje. (Comente estas duas linhas se quiser ver tudo)
          .gte('match_time', startOfDay)
          .lte('match_time', endOfDay)
          .order('match_time', { ascending: true });

        if (error) {
          console.error('Erro detalhado do Supabase:', error.message);
          throw error;
        }

        // 3. Formatação dos dados para o componente
        if (data) {
          const formattedMatches = data.map((match: any) => {
            // Mapeando o status do seu banco (ex: 'NS', 'FT', 'LIVE') para o MatchCard
            let uiStatus: MatchStatus = 'SCHEDULED';
            if (match.status === 'FT') uiStatus = 'FINISHED';
            if (match.status === 'LIVE' || match.status === 'HT') uiStatus = 'IN_PLAY';

            return {
              id: match.id,
              match_time: match.match_time,
              status: uiStatus,
              home_score: match.home_score,
              away_score: match.away_score,
              // O Supabase entrega o relacionamento como um objeto aninhado. 
              // Se for um array (dependendo da versão), pegamos a posição [0].
              home_team: Array.isArray(match.home_team) ? match.home_team[0] : match.home_team,
              away_team: Array.isArray(match.away_team) ? match.away_team[0] : match.away_team,
            };
          });
          
          setMatches(formattedMatches);
        }
      } catch (err) {
        console.error('Erro ao buscar jogos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna Principal */}
      <section className="lg:col-span-2 space-y-6">
        
        <div className="bg-gradient-to-br from-card to-background border border-border p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight mb-2">
            Resumo da Rodada
          </h1>
          <p className="text-slate-400 text-sm max-w-md">
            Acompanhe os confrontos de hoje e prepare suas estratégias. Os palpites são bloqueados 15 minutos antes do início de cada partida.
          </p>
        </div>

        {/* Lista de Jogos */}
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-lg font-display font-bold mb-6 uppercase tracking-tight flex items-center gap-2">
            <Calendar size={18} className="text-primary" /> Confrontos de Hoje
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
              <p className="text-slate-500 text-sm font-medium">Não há partidas programadas para a data de hoje.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matches.map((match) => (
                <MatchCard 
                  key={match.id}
                  homeTeam={match.home_team}
                  awayTeam={match.away_team}
                  matchDate={match.match_time} 
                  status={match.status} 
                  homeScore={match.home_score ?? undefined}
                  awayScore={match.away_score ?? undefined}
                  onClick={() => console.log(`Redirecionar para o palpite do jogo ${match.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Coluna Lateral */}
      <aside className="space-y-6">
        <div className="bg-card border border-border p-6 rounded-2xl">
          <h2 className="text-lg font-display font-bold mb-4 uppercase tracking-tight flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> Seu Desempenho
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-border/50">
              <span className="text-slate-400 text-sm">Aproveitamento</span>
              <span className="font-bold text-lg font-display">--%</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-border/50">
              <span className="text-slate-400 text-sm">Cravadas</span>
              <span className="font-bold text-lg font-display">0</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}