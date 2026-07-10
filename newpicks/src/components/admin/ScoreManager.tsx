'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  Save,
  RefreshCw,
  Edit2,
  Lock,
  Trophy,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';

type Team = {
  id: number;
  name: string;
  short_code: string;
  logo_url: string;
};

type Competition = {
  id: number;
  name: string;
  is_active: boolean;
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
  competition_id?: number;
};

type ScoreInputs = {
  [key: number]: {
    home_score: string;
    away_score: string;
    home_penalty: string;
    away_penalty: string;
  };
};

interface ScoreManagerProps {
  matches: Match[];
  onMatchUpdate: () => void;
}

export function ScoreManager({ matches, onMatchUpdate }: ScoreManagerProps) {
  const [scoreInputs, setScoreInputs] = useState<ScoreInputs>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');
  const [selectedCompetition, setSelectedCompetition] = useState<number | 'all'>('all');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [showCompetitionFilter, setShowCompetitionFilter] = useState(false);
  
  const todayRef = useRef<HTMLDivElement>(null);

  // Fallback logo
  const fallbackLogo = "https://ui-avatars.com/api/?name=TBA&background=1e293b&color=cbd5e1&bold=true";

  // Carregar competições
  useEffect(() => {
    const loadCompetitions = async () => {
      try {
        const { data, error } = await supabase
          .from('competitions')
          .select('id, name, is_active')
          .order('name');
        if (!error && data) setCompetitions(data);
      } catch (error) {
        console.error('Erro ao carregar competições:', error);
      }
    };
    loadCompetitions();
  }, []);

  // Função para pegar logo seguro
  const getSafeLogo = (team: Team | null | undefined) => {
    if (!team || !team.logo_url || team.logo_url.trim() === '') return fallbackLogo;
    return team.logo_url;
  };

  // Função para pegar código seguro
  const getSafeCode = (team: Team | null | undefined) => {
    if (!team) return 'TBA';
    if (team.short_code && team.short_code.trim() !== '') return team.short_code;
    if (team.name && team.name.trim() !== '') return team.name.substring(0, 3).toUpperCase();
    return 'TBA';
  };

  // Inicializa os inputs quando os matches mudam
  useEffect(() => {
    const initialInputs: ScoreInputs = {};
    matches.forEach(m => {
      initialInputs[m.id] = {
        home_score: m.home_score?.toString() ?? '',
        away_score: m.away_score?.toString() ?? '',
        home_penalty: m.home_penalty?.toString() ?? '',
        away_penalty: m.away_penalty?.toString() ?? '',
      };
    });
    setScoreInputs(initialInputs);

    // Expande jogos de hoje automaticamente
    const today = new Date().toISOString().split('T')[0];
    const todayMatches = matches.filter(m => m.match_time.startsWith(today));
    
    if (todayMatches.length > 0) {
      const phases = new Set(todayMatches.map(m => m.phase));
      setExpandedPhases(phases);
      
      // Expande as datas de hoje
      const todayDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      setExpandedDates(new Set([todayDate]));
      
      // Scroll para hoje após renderizar
      setTimeout(() => {
        if (todayRef.current) {
          todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [matches]);

  // Filtrar matches por competição
  const filteredMatches = useMemo(() => {
    if (selectedCompetition === 'all') return matches;
    return matches.filter(m => m.competition_id === selectedCompetition);
  }, [matches, selectedCompetition]);

  // Agrupa jogos por fase (usando matches filtrados)
  const matchesByPhase = useMemo(() => {
    const groups: { [phase: string]: Match[] } = {};
    
    const phaseOrder = ['groups', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
    
    // Inicializa todas as fases com arrays vazios
    phaseOrder.forEach(phase => {
      groups[phase] = [];
    });

    // Adiciona os jogos às fases correspondentes
    filteredMatches.forEach(match => {
      const phase = match.phase || 'groups';
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(match);
    });

    // Remove fases vazias
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) delete groups[key];
    });

    return groups;
  }, [filteredMatches]);

  // Filtra jogos de hoje para a aba "today" (usando matches filtrados)
  const todayMatches = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredMatches.filter(m => m.match_time.startsWith(today));
  }, [filteredMatches]);

  // Agrupa jogos por data
  const getMatchesByDate = (phaseMatches: Match[]) => {
    const groups: { [date: string]: Match[] } = {};
    
    phaseMatches.forEach(match => {
      const date = new Date(match.match_time);
      const dateKey = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(match);
    });

    return Object.keys(groups)
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - 
               new Date(yearB, monthB - 1, dayB).getTime();
      })
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {} as { [date: string]: Match[] });
  };

  const isToday = (dateStr: string) => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return dateStr === todayStr;
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phase)) {
        newSet.delete(phase);
      } else {
        newSet.add(phase);
      }
      return newSet;
    });
  };

  const toggleDate = (dateKey: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const updateScore = (
    matchId: number,
    field: 'home_score' | 'away_score' | 'home_penalty' | 'away_penalty',
    value: string
  ) => {
    setScoreInputs(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const handleSaveScore = async (matchId: number) => {
    const inputs = scoreInputs[matchId];
    if (!inputs) return;

    if (inputs.home_score === '' || inputs.away_score === '') {
      setMessage({ type: 'error', text: 'Preencha ambos os placares' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const homeScore = parseInt(inputs.home_score);
    const awayScore = parseInt(inputs.away_score);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      setMessage({ type: 'error', text: 'Placares inválidos' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // Verifica se precisa de pênaltis (apenas fases eliminatórias)
    const match = matches.find(m => m.id === matchId);
    const isKnockout = match && match.phase !== 'groups' && match.phase !== 'group_stage';

    setSavingId(matchId);

    try {
      const payload: any = {
        home_score: homeScore,
        away_score: awayScore,
        status: 'FT'
      };

      // Só adiciona pênaltis se for fase eliminatória E empate
      if (isKnockout && homeScore === awayScore) {
        const homePenalty = parseInt(inputs.home_penalty);
        const awayPenalty = parseInt(inputs.away_penalty);
        
        if (isNaN(homePenalty) || isNaN(awayPenalty)) {
          setMessage({ type: 'error', text: 'Preencha os pênaltis para jogos empatados' });
          setSavingId(null);
          setTimeout(() => setMessage(null), 3000);
          return;
        }
        
        payload.home_penalty = homePenalty;
        payload.away_penalty = awayPenalty;
      } else {
        payload.home_penalty = null;
        payload.away_penalty = null;
      }

      const { error } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', matchId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Placar salvo com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
      
      setEditingId(null);
      onMatchUpdate();
    } catch (error) {
      console.error('Erro ao salvar placar:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar placar' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

  const handleEditFinished = (matchId: number) => {
    setEditingId(matchId);
  };

  const phaseNames: { [key: string]: string } = {
    'groups': 'Fase de Grupos',
    'round_of_32': '16-Avos de Final',
    'round_of_16': 'Oitavas de Final',
    'quarter_final': 'Quartas de Final',
    'semi_final': 'Semifinal',
    'third_place': 'Disputa de 3º Lugar',
    'final': 'Final'
  };

  const phaseIcons: { [key: string]: string } = {
    'groups': '📋',
    'round_of_32': '🏹',
    'round_of_16': '⚔️',
    'quarter_final': '🛡️',
    'semi_final': '⚽',
    'third_place': '🥉',
    'final': '🏆'
  };

  const phaseOrder = ['groups', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

  // Função para renderizar cada card de jogo
  function renderMatchCard(match: Match) {
    const isFinished = match.status === 'FT';
    const isEditing = editingId === match.id;
    const inputs = scoreInputs[match.id];
    const isKnockout = match.phase !== 'groups' && match.phase !== 'group_stage';
    const isDraw = inputs?.home_score && 
                   inputs?.away_score && 
                   inputs.home_score === inputs.away_score &&
                   inputs.home_score !== '';

    const isEditable = !isFinished || isEditing;

    // Pega os times completos
    const homeTeam = match.home_team_data;
    const awayTeam = match.away_team_data;

    return (
      <div 
        key={match.id} 
        className={`bg-slate-800/50 p-3 rounded-lg border transition-all ${
          isFinished 
            ? 'border-green-500/20' 
            : 'border-slate-700/50'
        } ${isEditing ? 'border-yellow-500/50 ring-2 ring-yellow-500/20' : ''}`}
      >
        {/* Info do jogo */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>
              {new Date(match.match_time).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          {isFinished && !isEditing && (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle size={12} />
              FT
            </span>
          )}
          {isEditing && (
            <span className="text-yellow-500 flex items-center gap-1">
              <Edit2 size={12} />
              Editando
            </span>
          )}
        </div>

        {/* Times com logos */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center p-1">
              <img 
                src={getSafeLogo(homeTeam)} 
                alt={homeTeam?.name || match.home_team}
                className="max-w-full max-h-full object-contain drop-shadow-lg"
                onError={(e) => { 
                  (e.target as HTMLImageElement).src = fallbackLogo;
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-300 block mt-1">
              {getSafeCode(homeTeam)}
            </span>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="number"
              min="0"
              value={inputs?.home_score ?? ''}
              onChange={(e) => updateScore(match.id, 'home_score', e.target.value)}
              className="w-10 h-10 text-center rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:bg-slate-800"
              disabled={!isEditable}
            />
            <span className="text-slate-500 font-bold">×</span>
            <input
              type="number"
              min="0"
              value={inputs?.away_score ?? ''}
              onChange={(e) => updateScore(match.id, 'away_score', e.target.value)}
              className="w-10 h-10 text-center rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:bg-slate-800"
              disabled={!isEditable}
            />
          </div>

          <div className="flex-1 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center p-1">
              <img 
                src={getSafeLogo(awayTeam)} 
                alt={awayTeam?.name || match.away_team}
                className="max-w-full max-h-full object-contain drop-shadow-lg"
                onError={(e) => { 
                  (e.target as HTMLImageElement).src = fallbackLogo;
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-300 block mt-1">
              {getSafeCode(awayTeam)}
            </span>
          </div>
        </div>

        {/* Pênaltis */}
        {isKnockout && isDraw && (
          <div className="flex items-center justify-center gap-2 bg-slate-900/50 px-2 py-1 rounded-lg mb-2 border border-yellow-500/30">
            <span className="text-xs text-yellow-500 font-bold">PÊN:</span>
            <input
              type="number"
              min="0"
              value={inputs?.home_penalty ?? ''}
              onChange={(e) => updateScore(match.id, 'home_penalty', e.target.value)}
              className="w-10 h-8 text-center rounded bg-slate-800 border border-yellow-600/50 text-white font-bold text-base focus:border-yellow-500 focus:outline-none disabled:opacity-50 disabled:bg-slate-800"
              disabled={!isEditable}
            />
            <span className="text-slate-500 font-bold">×</span>
            <input
              type="number"
              min="0"
              value={inputs?.away_penalty ?? ''}
              onChange={(e) => updateScore(match.id, 'away_penalty', e.target.value)}
              className="w-10 h-8 text-center rounded bg-slate-800 border border-yellow-600/50 text-white font-bold text-base focus:border-yellow-500 focus:outline-none disabled:opacity-50 disabled:bg-slate-800"
              disabled={!isEditable}
            />
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-1 mt-2">
          {isFinished && !isEditing && (
            <button
              onClick={() => handleEditFinished(match.id)}
              className="flex-1 px-2 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <Edit2 size={12} />
              Editar
            </button>
          )}

          {isEditing && (
            <button
              onClick={() => setEditingId(null)}
              className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <Lock size={12} />
              Cancelar
            </button>
          )}

          {(isEditable || isEditing) && (
            <button
              onClick={() => handleSaveScore(match.id)}
              disabled={savingId === match.id || !inputs?.home_score || !inputs?.away_score}
              className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingId === match.id ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={12} />
                  Salvar
                </>
              )}
            </button>
          )}

          {isFinished && !isEditing && (
            <span className="flex-1 text-green-400 text-xs font-semibold flex items-center justify-center gap-1">
              <CheckCircle size={12} />
              Finalizado
            </span>
          )}
        </div>
      </div>
    );
  }

  // Obter nome da competição selecionada
  const getCompetitionName = () => {
    if (selectedCompetition === 'all') return 'Todas as competições';
    const comp = competitions.find(c => c.id === selectedCompetition);
    return comp?.name || 'Todas as competições';
  };

  return (
    <div className="space-y-6">
      {/* Mensagem de feedback */}
      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
            : 'bg-red-500/20 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filtro por Competição */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Filtrar por:</span>
        </div>
        
        <div className="relative flex-1 min-w-[200px]">
          <button
            onClick={() => setShowCompetitionFilter(!showCompetitionFilter)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm flex items-center justify-between hover:border-slate-500 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-blue-400" />
              <span>{getCompetitionName()}</span>
            </div>
            {showCompetitionFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {showCompetitionFilter && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCompetition('all');
                  setShowCompetitionFilter(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-white/5 transition-colors ${
                  selectedCompetition === 'all' ? 'bg-blue-500/20 text-blue-400' : 'text-white'
                }`}
              >
                Todas as competições
              </button>
              {competitions.map(comp => (
                <button
                  key={comp.id}
                  onClick={() => {
                    setSelectedCompetition(comp.id);
                    setShowCompetitionFilter(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-white/5 transition-colors ${
                    selectedCompetition === comp.id ? 'bg-blue-500/20 text-blue-400' : 'text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {comp.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-sm text-slate-400">
          {filteredMatches.length} {filteredMatches.length === 1 ? 'jogo' : 'jogos'}
        </div>

        {selectedCompetition !== 'all' && (
          <button
            onClick={() => {
              setSelectedCompetition('all');
              setShowCompetitionFilter(false);
            }}
            className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
          >
            <XCircle size={14} />
          </button>
        )}
      </div>

      {/* Tabs: Hoje | Todas as fases */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'today'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            Hoje
            {todayMatches.length > 0 && (
              <span className="px-2 py-0.5 bg-slate-700/50 rounded-full text-xs">
                {todayMatches.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trophy size={16} />
            Todas as Fases
          </div>
        </button>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Total de Jogos</p>
          <p className="text-xl font-bold">{filteredMatches.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Finalizados</p>
          <p className="text-xl font-bold text-green-400">
            {filteredMatches.filter(m => m.status === 'FT').length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Pendentes</p>
          <p className="text-xl font-bold text-yellow-400">
            {filteredMatches.filter(m => m.status !== 'FT').length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Hoje</p>
          <p className="text-xl font-bold text-blue-400">{todayMatches.length}</p>
        </div>
      </div>

      {/* Conteúdo */}
      <div>
        {activeTab === 'today' ? (
          // Aba "Hoje"
          <div ref={todayRef} className="space-y-4">
            {todayMatches.length === 0 ? (
              <div className="text-center text-slate-400 py-10">
                <Calendar size={40} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold">Nenhum jogo hoje</p>
                <p className="text-sm">Volte mais tarde para acompanhar os jogos</p>
              </div>
            ) : (
              <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
                <div className="bg-blue-600/20 p-3 border-b border-slate-700/50">
                  <h3 className="font-bold flex items-center gap-2">
                    <Calendar size={18} className="text-blue-400" />
                    Jogos de Hoje
                    <span className="text-sm text-slate-400 font-normal">
                      ({todayMatches.length} jogos)
                    </span>
                    {selectedCompetition !== 'all' && (
                      <span className="text-xs text-blue-400 font-normal ml-2">
                        • {getCompetitionName()}
                      </span>
                    )}
                  </h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {todayMatches.map(match => renderMatchCard(match))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Aba "Todas as fases"
          <div className="space-y-4">
            {phaseOrder.map(phase => {
              const phaseMatches = matchesByPhase[phase] || [];
              if (phaseMatches.length === 0) return null;

              const isPhaseExpanded = expandedPhases.has(phase);
              const totalMatches = phaseMatches.length;
              const finishedMatches = phaseMatches.filter(m => m.status === 'FT').length;

              return (
                <div key={phase} className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
                  <div
                    onClick={() => togglePhase(phase)}
                    className="bg-slate-800/50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{phaseIcons[phase] || '📋'}</span>
                      <div>
                        <span className="font-bold text-lg">{phaseNames[phase] || phase}</span>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{totalMatches} jogos</span>
                          <span>•</span>
                          <span className="text-green-400">{finishedMatches} finalizados</span>
                          <span>•</span>
                          <span className="text-yellow-400">{totalMatches - finishedMatches} pendentes</span>
                          {selectedCompetition !== 'all' && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">{getCompetitionName()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {isPhaseExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {isPhaseExpanded && (
                    <div className="divide-y divide-slate-700/30">
                      {Object.entries(getMatchesByDate(phaseMatches)).map(([dateKey, dateMatches]) => {
                        const isDateExpanded = expandedDates.has(dateKey);
                        const isTodayDate = isToday(dateKey);

                        return (
                          <div key={dateKey}>
                            <div
                              onClick={() => toggleDate(dateKey)}
                              className="p-3 bg-slate-900/30 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                <span className="font-medium">{dateKey}</span>
                                {isTodayDate && (
                                  <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs font-bold">
                                    HOJE
                                  </span>
                                )}
                                <span className="text-xs text-slate-400">
                                  ({dateMatches.length} jogo{dateMatches.length > 1 ? 's' : ''})
                                </span>
                              </div>
                              <span className="text-slate-400 text-xs">
                                {isDateExpanded ? '▼' : '▶'}
                              </span>
                            </div>

                            {isDateExpanded && (
                              <div className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {dateMatches.map(match => renderMatchCard(match))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}