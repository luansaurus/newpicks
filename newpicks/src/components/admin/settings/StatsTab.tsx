'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { 
  Trophy, 
  Users, 
  Shield, 
  Database,
  Globe,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Medal,
  Star,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  PieChart,
  LineChart,
  Activity,
  UserCheck,
  UserX,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  Percent,
  Timer,
  Play,
  Check,
  X,
  Layers,
  Circle,
  CircleCheck,
  CircleDot,
  Earth
} from 'lucide-react';

type User = {
  id: string;
  username: string;
  is_admin: boolean;
};

type Competition = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

type MatchStats = {
  total: number;
  finished: number;
  pending: number;
  byPhase: Record<string, number>;
};

type PredictionStats = {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
  byType: {
    exact_score: number;
    correct_winner: number;
    correct_draw: number;
  };
};

interface StatsTabProps {
  matches: any[];
}

export function StatsTab({ matches }: StatsTabProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: compsData, error: compsError } = await supabase
        .from('competitions')
        .select('id, name, slug, is_active')
        .order('name');

      if (compsError) throw compsError;
      setCompetitions(compsData || []);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, is_admin')
        .order('username');

      if (usersError) throw usersError;
      setUsers(usersData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar matches por competição
  const filteredMatches = useMemo(() => {
    if (selectedCompetition === 'all') return matches;
    return matches.filter(m => m.competition_id === selectedCompetition);
  }, [matches, selectedCompetition]);

  // Estatísticas dos Jogos
  const matchStats = useMemo((): MatchStats => {
    const total = filteredMatches.length;
    const finished = filteredMatches.filter(m => m.status === 'FT' || m.status === 'FINISHED').length;
    const pending = total - finished;
    
    const byPhase: Record<string, number> = {};
    filteredMatches.forEach(m => {
      const phase = m.phase || 'unknown';
      byPhase[phase] = (byPhase[phase] || 0) + 1;
    });

    return { total, finished, pending, byPhase };
  }, [filteredMatches]);

  // Estatísticas de Palpites (simuladas)
  const predictionStats = useMemo((): PredictionStats => {
    const multiplier = selectedCompetition === 'all' ? 1 : 0.3;
    return {
      total: Math.round(1250 * multiplier),
      correct: Math.round(680 * multiplier),
      wrong: Math.round(570 * multiplier),
      accuracy: 54.4,
      byType: {
        exact_score: Math.round(180 * multiplier),
        correct_winner: Math.round(320 * multiplier),
        correct_draw: Math.round(180 * multiplier)
      }
    };
  }, [selectedCompetition]);

  // Jogos por Fase
  const phaseStats = useMemo(() => {
    const phases: Record<string, { total: number; finished: number; pending: number }> = {};
    
    filteredMatches.forEach(m => {
      const phase = m.phase || 'unknown';
      if (!phases[phase]) {
        phases[phase] = { total: 0, finished: 0, pending: 0 };
      }
      phases[phase].total++;
      if (m.status === 'FT' || m.status === 'FINISHED') {
        phases[phase].finished++;
      } else {
        phases[phase].pending++;
      }
    });

    return phases;
  }, [filteredMatches]);

  // Progressão de Jogos (últimos 7 dias)
  const dailyProgress = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayMatches = filteredMatches.filter(m => m.match_time.startsWith(dateStr));
      days.push({
        date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: dayMatches.length,
        finished: dayMatches.filter(m => m.status === 'FT' || m.status === 'FINISHED').length
      });
    }
    return days;
  }, [filteredMatches]);

  // Estatísticas de Usuários
  const userStats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.is_admin).length;
    return { total, admins, regular: total - admins };
  }, [users]);

  // Estatísticas de Performance
  const performanceStats = useMemo(() => {
    const totalMatches = matchStats.total;
    const finishedMatches = matchStats.finished;
    const completionRate = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;
    
    return {
      completionRate,
      avgPredictionsPerUser: Math.round(predictionStats.total / (userStats.total || 1)),
      accuracyRate: predictionStats.accuracy,
      totalPredictions: predictionStats.total
    };
  }, [matchStats, predictionStats, userStats]);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'phases', label: 'Jogos por Fase', icon: Calendar },
    { id: 'predictions', label: 'Análise de Palpites', icon: Target },
    { id: 'performance', label: 'Performance', icon: Activity }
  ];

  // Nome da competição selecionada
  const getCompetitionName = () => {
    if (selectedCompetition === 'all') return 'Geral';
    const comp = competitions.find(c => c.id === selectedCompetition);
    return comp?.name || 'Geral';
  };

  // Obter ícone para a competição
  const getCompetitionIcon = (comp: Competition) => {
    if (comp.is_active) {
      return <CircleCheck size={14} className="text-green-400" />;
    }
    return <Circle size={14} className="text-slate-500" />;
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/30 rounded-lg p-2 px-4 border border-slate-700/50 flex items-center gap-2">
        <Layers size={14} className="text-blue-400" />
        <span className="text-xs text-slate-400">Exibindo dados para:</span>
        <span className="text-xs font-bold text-white">{getCompetitionName()}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Trophy size={16} />
            <span>Total de Jogos</span>
          </div>
          <p className="text-2xl font-bold mt-2">{matchStats.total}</p>
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-green-400">{matchStats.finished} finalizados</span>
            <span className="text-yellow-400">{matchStats.pending} pendentes</span>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users size={16} />
            <span>Usuários</span>
          </div>
          <p className="text-2xl font-bold mt-2">{userStats.total}</p>
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-blue-400">{userStats.admins} admins</span>
            <span className="text-slate-400">{userStats.regular} usuários</span>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Target size={16} />
            <span>Palpites</span>
          </div>
          <p className="text-2xl font-bold mt-2">{predictionStats.total}</p>
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-green-400">{predictionStats.correct} acertos</span>
            <span className="text-red-400">{predictionStats.wrong} erros</span>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Percent size={16} />
            <span>Taxa de Acerto</span>
          </div>
          <p className="text-2xl font-bold mt-2">{predictionStats.accuracy}%</p>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="text-green-400">{Math.round(predictionStats.correct / predictionStats.total * 100)}% acertos</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Activity size={16} className="text-blue-400" />
          Progressão de Jogos (Últimos 7 Dias)
        </h4>
        <div className="space-y-2">
          {dailyProgress.map((day, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-16">{day.date}</span>
              <div className="flex-1 flex gap-1">
                <div 
                  className="h-6 bg-blue-500/30 rounded transition-all"
                  style={{ width: `${(day.total / Math.max(...dailyProgress.map(d => d.total))) * 100}%` }}
                  title={`${day.total} jogos`}
                />
                <div 
                  className="h-6 bg-green-500/30 rounded transition-all"
                  style={{ width: `${(day.finished / Math.max(...dailyProgress.map(d => d.total))) * 100}%` }}
                  title={`${day.finished} finalizados`}
                />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right">{day.total}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500/30 rounded" />
            Total
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500/30 rounded" />
            Finalizados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(phaseStats).slice(0, 4).map(([phase, stats]) => {
          const phaseNames: Record<string, string> = {
            'groups': 'Grupos',
            'round_of_32': '16-Avos',
            'round_of_16': 'Oitavas',
            'quarter': 'Quartas',
            'semi': 'Semifinal',
            'final': 'Final',
            'third': '3º Lugar',
            'unknown': 'Outros'
          };
          const progress = stats.total > 0 ? Math.round((stats.finished / stats.total) * 100) : 0;
          
          return (
            <div key={phase} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{phaseNames[phase] || phase}</span>
                <span className="text-xs text-slate-400">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold">{progress}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPhaseStats = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/30 rounded-lg p-2 px-4 border border-slate-700/50 flex items-center gap-2">
        <Layers size={14} className="text-blue-400" />
        <span className="text-xs text-slate-400">Exibindo dados para:</span>
        <span className="text-xs font-bold text-white">{getCompetitionName()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(phaseStats).map(([phase, stats]) => {
          const phaseNames: Record<string, string> = {
            'groups': 'Fase de Grupos',
            'round_of_32': '16-Avos de Final',
            'round_of_16': 'Oitavas de Final',
            'quarter': 'Quartas de Final',
            'semi': 'Semifinal',
            'final': 'Final',
            'third': 'Disputa de 3º Lugar',
            'unknown': 'Outros'
          };
          
          const progress = stats.total > 0 ? Math.round((stats.finished / stats.total) * 100) : 0;
          
          return (
            <div key={phase} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium">{phaseNames[phase] || phase}</span>
                  <div className="text-xs text-slate-400">{stats.total} jogos</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  progress === 100 ? 'bg-green-500/20 text-green-400' :
                  progress > 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-slate-700/50 text-slate-400'
                }`}>
                  {progress}%
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-green-400" />
                  <span>{stats.finished} finalizados</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-yellow-400" />
                  <span>{stats.pending} pendentes</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <PieChart size={16} className="text-purple-400" />
          Resumo Geral das Fases
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-400">{Object.keys(phaseStats).length}</p>
            <p className="text-xs text-slate-400">Fases</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">
              {Object.values(phaseStats).reduce((acc, curr) => acc + curr.finished, 0)}
            </p>
            <p className="text-xs text-slate-400">Total Finalizados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">
              {Object.values(phaseStats).reduce((acc, curr) => acc + curr.pending, 0)}
            </p>
            <p className="text-xs text-slate-400">Total Pendentes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">
              {Object.values(phaseStats).reduce((acc, curr) => acc + curr.total, 0)}
            </p>
            <p className="text-xs text-slate-400">Total Jogos</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPredictions = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/30 rounded-lg p-2 px-4 border border-slate-700/50 flex items-center gap-2">
        <Layers size={14} className="text-blue-400" />
        <span className="text-xs text-slate-400">Exibindo dados para:</span>
        <span className="text-xs font-bold text-white">{getCompetitionName()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Target size={16} />
            <span>Placar Exato</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">{predictionStats.byType.exact_score}</p>
          <div className="text-xs text-slate-400 mt-1">
            {Math.round((predictionStats.byType.exact_score / predictionStats.total) * 100)}% dos palpites
          </div>
          <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(predictionStats.byType.exact_score / predictionStats.total) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <CheckCircle size={16} />
            <span>Vencedor Correto</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-400">{predictionStats.byType.correct_winner}</p>
          <div className="text-xs text-slate-400 mt-1">
            {Math.round((predictionStats.byType.correct_winner / predictionStats.total) * 100)}% dos palpites
          </div>
          <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(predictionStats.byType.correct_winner / predictionStats.total) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Activity size={16} />
            <span>Empates Corretos</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-400">{predictionStats.byType.correct_draw}</p>
          <div className="text-xs text-slate-400 mt-1">
            {Math.round((predictionStats.byType.correct_draw / predictionStats.total) * 100)}% dos palpites
          </div>
          <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 transition-all"
              style={{ width: `${(predictionStats.byType.correct_draw / predictionStats.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <PieChart size={16} className="text-purple-400" />
          Distribuição de Palpites
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Placar Exato</span>
                <span className="text-green-400">{predictionStats.byType.exact_score}</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(predictionStats.byType.exact_score / predictionStats.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Vencedor Correto</span>
                <span className="text-blue-400">{predictionStats.byType.correct_winner}</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${(predictionStats.byType.correct_winner / predictionStats.total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">Empates Corretos</span>
                <span className="text-yellow-400">{predictionStats.byType.correct_draw}</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(predictionStats.byType.correct_draw / predictionStats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-32 h-32 rounded-full border-4 border-slate-700/50 flex items-center justify-center mb-2">
              <div>
                <p className="text-3xl font-bold text-blue-400">{predictionStats.accuracy}%</p>
                <p className="text-[10px] text-slate-400">Taxa de Acerto</p>
              </div>
            </div>
            <div className="text-sm text-slate-400">
              <span className="text-green-400">{predictionStats.correct}</span> acertos em{' '}
              <span className="font-bold">{predictionStats.total}</span> palpites
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-4">
      <div className="bg-slate-800/30 rounded-lg p-2 px-4 border border-slate-700/50 flex items-center gap-2">
        <Layers size={14} className="text-blue-400" />
        <span className="text-xs text-slate-400">Exibindo dados para:</span>
        <span className="text-xs font-bold text-white">{getCompetitionName()}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Timer size={16} />
            <span>Taxa de Conclusão</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-3xl font-bold">{performanceStats.completionRate}%</p>
            <span className="text-sm text-slate-400">
              {matchStats.finished} de {matchStats.total} jogos
            </span>
          </div>
          <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${performanceStats.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users size={16} />
            <span>Média por Usuário</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-3xl font-bold">{performanceStats.avgPredictionsPerUser}</p>
            <span className="text-sm text-slate-400">palpites</span>
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {predictionStats.total} palpites / {userStats.total} usuários
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Check size={16} className="text-green-400" />
            <span>Taxa de Acerto</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-green-400">{performanceStats.accuracyRate}%</p>
          <div className="text-xs text-slate-400 mt-1">
            {predictionStats.correct} acertos
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Play size={16} className="text-blue-400" />
            <span>Jogos em Andamento</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-400">
            {filteredMatches.filter(m => m.status === '1H' || m.status === '2H' || m.status === 'IN_PLAY').length}
          </p>
          <div className="text-xs text-slate-400 mt-1">
            Aguardando resultado
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Award size={16} className="text-yellow-400" />
            <span>Fases Completas</span>
          </div>
          <p className="text-2xl font-bold mt-2 text-yellow-400">
            {Object.values(phaseStats).filter(s => s.finished === s.total && s.total > 0).length}
          </p>
          <div className="text-xs text-slate-400 mt-1">
            de {Object.keys(phaseStats).length} fases
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Activity size={16} className="text-purple-400" />
          Resumo de Performance
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-blue-400">{performanceStats.completionRate}%</p>
            <p className="text-[10px] text-slate-400">Conclusão</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">{performanceStats.accuracyRate}%</p>
            <p className="text-[10px] text-slate-400">Acertos</p>
          </div>
          <div>
            <p className="text-xl font-bold text-yellow-400">{performanceStats.avgPredictionsPerUser}</p>
            <p className="text-[10px] text-slate-400">Média/Usuário</p>
          </div>
          <div>
            <p className="text-xl font-bold text-purple-400">{matchStats.total}</p>
            <p className="text-[10px] text-slate-400">Total Jogos</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
            : message.type === 'error'
            ? 'bg-red-500/20 text-red-400 border border-red-500/20'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : 
           message.type === 'error' ? <XCircle size={18} /> : 
           <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={24} />
            Estatísticas do Sistema
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Visão geral completa do sistema e seus dados
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[180px]">
           <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">Geral</option>
              {competitions.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.is_active ? '🟢' : '⚪'} {comp.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 500);
            }}
            disabled={loading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-700/50 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          Carregando estatísticas...
        </div>
      ) : (
        <div className="min-h-[400px]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'phases' && renderPhaseStats()}
          {activeTab === 'predictions' && renderPredictions()}
          {activeTab === 'performance' && renderPerformance()}
        </div>
      )}
    </div>
  );
}