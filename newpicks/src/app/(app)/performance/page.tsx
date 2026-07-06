'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { useCompetition } from '@/context/CompetitionContext';
import { useLeague } from '@/context/LeagueContext';
import { useTheme } from '@/context/ThemeContext';
import { 
  TrendingUp, 
  Calendar, 
  ArrowLeft, 
  Loader2, 
  Trophy, 
  Activity,
  Award,
  LineChart
} from 'lucide-react';
import Link from 'next/link';
import { GLOBAL_LEAGUE_RULES, isPlayoffPhase } from '@/utils/leagueEngine';

interface DailyPoints {
  date: string;
  points: number;
  cumulative: number;
  label: string;
  matches: number;
}

export default function PerformancePage() {
  const router = useRouter();
  const { activeCompetition } = useCompetition();
  const { activeLeague } = useLeague();
  const { themeColor } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dailyPoints, setDailyPoints] = useState<DailyPoints[]>([]);
  const [stats, setStats] = useState({
    totalPoints: 0,
    averagePoints: 0,
    bestDay: { date: '', points: 0, matches: 0 },
    daysActive: 0,
    consistency: 0,
    totalMatches: 0,
    avgPerMatch: 0
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }
        setCurrentUserId(session.user.id);
        
        if (!activeCompetition?.id) {
          setLoading(false);
          return;
        }
        
        await fetchPerformanceData(session.user.id);
      } catch (error) {
        console.error('Erro na inicialização:', error);
      }
      setLoading(false);
    };
    init();
  }, [activeCompetition, activeLeague]);

  const fetchPerformanceData = async (userId: string) => {
    if (!activeCompetition?.id) return;

    try {
      // Busca todos os jogos finalizados da competição
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id, match_time, status, phase')
        .eq('competition_id', activeCompetition.id)
        .in('status', ['FINISHED', 'FT', 'PEN', 'AET'])
        .order('match_time', { ascending: true });

      if (matchesError) {
        console.error('Erro ao buscar matches:', matchesError);
        return;
      }

      if (!matches || matches.length === 0) {
        setDailyPoints([]);
        return;
      }

      const matchIds = matches.map(m => m.id);

      // Busca os palpites do usuário
      const { data: userGuesses, error: userGuessesError } = await supabase
        .from('guesses')
        .select('match_id, points_awarded')
        .eq('user_id', userId)
        .in('match_id', matchIds);

      if (userGuessesError) {
        console.error('Erro ao buscar palpites do usuário:', userGuessesError);
        return;
      }

      // Cria um mapa para aplicar o multiplicador do mata-mata
      const matchPhaseMap: Record<number, string> = {};
      matches.forEach(m => {
        matchPhaseMap[m.id] = m.phase || 'groups';
      });

      // Função para aplicar multiplicador do mata-mata
      const applyPlayoffMultiplier = (points: number, phase: string) => {
        if (isPlayoffPhase(phase) && GLOBAL_LEAGUE_RULES.playoff_multiplier > 1) {
          return points * GLOBAL_LEAGUE_RULES.playoff_multiplier;
        }
        return points;
      };

      // Agrupa por dia com multiplicador
      const dailyMap: Record<string, { userPoints: number; matches: number }> = {};
      
      matches.forEach(match => {
        const date = new Date(match.match_time);
        const dateKey = date.toISOString().split('T')[0];
        const phase = match.phase || 'groups';
        
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { userPoints: 0, matches: 0 };
        }
        
        dailyMap[dateKey].matches += 1;
        
        // Pontos do usuário com multiplicador
        const userGuess = userGuesses?.find(g => g.match_id === match.id);
        if (userGuess && userGuess.points_awarded !== null) {
          const points = applyPlayoffMultiplier(userGuess.points_awarded, phase);
          dailyMap[dateKey].userPoints += points;
        }
      });

      // Calcula dados diários com acumulado
      const dailyData: DailyPoints[] = [];
      let cumulativeUser = 0;

      Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([date, data]) => {
          cumulativeUser += data.userPoints;
          
          const label = new Date(date).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'short' 
          });
          
          dailyData.push({
            date,
            points: data.userPoints,
            cumulative: cumulativeUser,
            label,
            matches: data.matches
          });
        });

      setDailyPoints(dailyData);

      // Calcula estatísticas
      const totalPoints = dailyData.length > 0 ? dailyData[dailyData.length - 1].cumulative : 0;
      const daysActive = dailyData.filter(d => d.points > 0).length;
      const totalMatches = dailyData.reduce((sum, d) => sum + d.matches, 0);
      
      let bestDay = { date: '', points: 0, matches: 0 };
      dailyData.forEach(d => {
        if (d.points > bestDay.points) {
          bestDay = { date: d.date, points: d.points, matches: d.matches };
        }
      });
      
      const daysWithMatches = dailyData.filter(d => d.matches > 0).length;
      const consistency = daysWithMatches > 0 ? (daysActive / daysWithMatches) * 100 : 0;
      const avgPerMatch = totalMatches > 0 ? totalPoints / totalMatches : 0;

      setStats({
        totalPoints,
        averagePoints: dailyData.length > 0 ? totalPoints / dailyData.length : 0,
        bestDay,
        daysActive,
        consistency,
        totalMatches,
        avgPerMatch
      });

    } catch (error) {
      console.error('Erro ao buscar dados de performance:', error);
    }
  };

  // Função para calcular o máximo de pontos para o gráfico
  const maxPoints = Math.max(
    ...dailyPoints.map(d => d.cumulative),
    1
  );

  // Função para calcular a altura da barra (entre 5% e 100%)
  const getBarHeight = (value: number) => {
    if (maxPoints === 0) return 5;
    return Math.max((value / maxPoints) * 100, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  // Dados para o gráfico
  const chartData = dailyPoints;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/dashboard" 
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-tight flex items-center gap-2">
            <TrendingUp size={28} style={{ color: themeColor || 'var(--color-primary)' }} />
            Desempenho Detalhado
          </h1>
          <p className="text-sm text-slate-400">
            {activeLeague ? activeLeague.name : 'Liga Global'} • {activeCompetition?.name}
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Trophy size={14} />
            <span>Total de Pontos</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.totalPoints}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Calendar size={14} />
            <span>Média por Dia</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.averagePoints.toFixed(1)}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Activity size={14} />
            <span>Média por Jogo</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-blue-400">{stats.avgPerMatch.toFixed(1)}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Award size={14} />
            <span>Melhor Dia</span>
          </div>
          <p className="text-lg font-bold mt-1 text-yellow-500">
            {stats.bestDay.date ? `${stats.bestDay.points} pts` : '-'}
          </p>
          {stats.bestDay.date && (
            <p className="text-[10px] text-slate-500">
              {new Date(stats.bestDay.date).toLocaleDateString('pt-BR')} • {stats.bestDay.matches} jogos
            </p>
          )}
        </div>
      </div>

      {/* Gráfico de Evolução Acumulada */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-bold flex items-center gap-2 mb-6">
          <LineChart size={18} style={{ color: themeColor || 'var(--color-primary)' }} />
          Evolução Acumulada de Pontos
        </h2>

        {chartData.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <LineChart size={40} className="mx-auto mb-4 opacity-30" />
            <p>Nenhum dado disponível ainda</p>
            <p className="text-sm mt-1">Complete mais palpites para ver sua evolução</p>
          </div>
        ) : (
          <div className="relative w-full h-72">
            <div className="absolute inset-0 flex flex-col pb-8">
              {/* Linhas de grade */}
              <div className="flex-1 relative">
                {[0, 25, 50, 75, 100].map((percent) => (
                  <div 
                    key={percent}
                    className="absolute w-full border-t border-slate-700/30"
                    style={{ bottom: `${percent}%` }}
                  >
                    <span className="absolute -left-12 text-[10px] text-slate-500 -translate-y-1/2">
                      {Math.round((percent / 100) * maxPoints)}
                    </span>
                  </div>
                ))}

                {/* Área do gráfico */}
                <div className="absolute inset-0 flex items-end px-2">
                  {chartData.map((day, index) => {
                    const height = getBarHeight(day.cumulative);
                    const isLast = index === chartData.length - 1;
                    const isFirst = index === 0;
                    
                    return (
                      <div 
                        key={day.date} 
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Área preenchida (gradiente) */}
                        <div 
                          className="absolute bottom-0 w-full transition-all duration-500 rounded-t"
                          style={{ 
                            height: `${height}%`, 
                            background: `linear-gradient(to top, ${themeColor || 'var(--color-primary)'}40, transparent)`,
                            opacity: height > 0 ? 0.6 : 0
                          }}
                        />

                        {/* Linha vertical (barra) */}
                        <div 
                          className="absolute bottom-0 w-1 transition-all duration-500 rounded-t"
                          style={{ 
                            height: `${height}%`, 
                            backgroundColor: themeColor || 'var(--color-primary)',
                            opacity: height > 0 ? 1 : 0.2
                          }}
                        />

                        {/* Ponto no topo da barra */}
                        {height > 5 && (
                          <div 
                            className="absolute rounded-full transition-all duration-500"
                            style={{ 
                              bottom: `${height}%`, 
                              width: isLast ? '10px' : '6px',
                              height: isLast ? '10px' : '6px',
                              backgroundColor: themeColor || 'var(--color-primary)',
                              boxShadow: isLast ? `0 0 15px ${themeColor || 'var(--color-primary)'}` : 'none',
                              left: '50%',
                              transform: 'translateX(-50%)'
                            }}
                          />
                        )}

                        {/* Label */}
                        <span className="absolute -bottom-6 text-[8px] text-slate-500 truncate w-full text-center">
                          {day.label}
                        </span>

                        {/* Valor na barra (apenas último dia) */}
                        {isLast && (
                          <span 
                            className="absolute -top-6 text-xs font-bold"
                            style={{ color: themeColor || 'var(--color-primary)' }}
                          >
                            {day.cumulative}
                          </span>
                        )}

                        {/* Tooltip no hover */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                          <div className="font-bold">{day.label}</div>
                          <div style={{ color: themeColor || 'var(--color-primary)' }}>
                            Total: {day.cumulative} pts
                          </div>
                          <div className="text-slate-400">
                            {day.points} pts no dia • {day.matches} jogos
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo final */}
              {chartData.length > 0 && (
                <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/30 mt-2">
                  <span>Início</span>
                  <span className="font-bold" style={{ color: themeColor || 'var(--color-primary)' }}>
                    {chartData[chartData.length - 1].cumulative} pts
                  </span>
                  <span>Final</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo do progresso */}
        {chartData.length > 0 && (
          <div className="mt-8 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-background/30 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Progresso Total</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-2xl font-bold" style={{ color: themeColor || 'var(--color-primary)' }}>
                    {chartData[chartData.length - 1].cumulative}
                  </span>
                  <span className="text-xs text-slate-500">pts</span>
                </div>
              </div>
              <div className="bg-background/30 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Dias Ativos</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-green-400">{stats.daysActive}</span>
                  <span className="text-xs text-slate-500">
                    de {chartData.length} dias
                  </span>
                </div>
              </div>
              <div className="bg-background/30 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Consistência</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-2xl font-bold text-yellow-400">{Math.round(stats.consistency)}%</span>
                  <span className="text-xs text-slate-500">
                    {stats.daysActive} dias com pontos
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Dados Diários */}
      {dailyPoints.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <h2 className="font-bold flex items-center gap-2 mb-4">
            <Calendar size={18} style={{ color: themeColor || 'var(--color-primary)' }} />
            Detalhamento Diário
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Data</th>
                  <th className="text-right py-2 px-3">Jogos</th>
                  <th className="text-right py-2 px-3">Pontos</th>
                  <th className="text-right py-2 px-3">Acumulado</th>
                  <th className="text-right py-2 px-3">Crescimento</th>
                </tr>
              </thead>
              <tbody>
                {dailyPoints.slice().reverse().map((day, index, array) => {
                  const prev = index < array.length - 1 ? array[index + 1] : null;
                  const growth = prev ? day.cumulative - prev.cumulative : day.cumulative;
                  const isPositive = growth > 0;
                  
                  return (
                    <tr key={day.date} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-medium">
                        {new Date(day.date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'long',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="text-right py-2 px-3 text-slate-400">
                        {day.matches}
                      </td>
                      <td className="text-right py-2 px-3 font-bold" style={{ color: themeColor || 'var(--color-primary)' }}>
                        {day.points}
                      </td>
                      <td className="text-right py-2 px-3 font-bold">
                        {day.cumulative}
                      </td>
                      <td className={`text-right py-2 px-3 font-bold ${isPositive ? 'text-green-400' : 'text-slate-400'}`}>
                        {isPositive ? '+' : ''}{growth}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}