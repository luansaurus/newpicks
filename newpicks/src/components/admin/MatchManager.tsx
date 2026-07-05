'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { 
  Trophy, 
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Edit2,
  Lock,
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

interface MatchManagerProps {
  matches: Match[];
  onMatchUpdate: () => void;
}

// Mapeamento dos jogos do mata-mata com IDs do banco
const BRACKET_MAP: Record<string, { home: string; away: string; phase: string; matchId?: number }> = {
  // 16 AVOS (sem IDs específicos no momento)
  'W74': { home: '1E', away: '3ABCDF', phase: 'round_of_32' },
  'W77': { home: '1I', away: '3CDFGH', phase: 'round_of_32' },
  'W73': { home: '2A', away: '2B', phase: 'round_of_32' },
  'W75': { home: '1F', away: '2C', phase: 'round_of_32' },
  'W83': { home: '2K', away: '2L', phase: 'round_of_32' },
  'W84': { home: '1H', away: '2J', phase: 'round_of_32' },
  'W81': { home: '1D', away: '3BEFIJ', phase: 'round_of_32' },
  'W82': { home: '1G', away: '3AEHIJ', phase: 'round_of_32' },
  'W76': { home: '1C', away: '2F', phase: 'round_of_32' },
  'W78': { home: '2E', away: '2I', phase: 'round_of_32' },
  'W79': { home: '1A', away: '3CEFHI', phase: 'round_of_32' },
  'W80': { home: '1L', away: '3EHIJK', phase: 'round_of_32' },
  'W86': { home: '1J', away: '2H', phase: 'round_of_32' },
  'W88': { home: '2D', away: '2G', phase: 'round_of_32' },
  'W85': { home: '1B', away: '3EFGIJ', phase: 'round_of_32' },
  'W87': { home: '1K', away: '3DEIJL', phase: 'round_of_32' },

  // OITAVAS - Com IDs do banco
  'W89': { home: 'W74', away: 'W77', phase: 'round_of_16', matchId: 132 },
  'W90': { home: 'W73', away: 'W75', phase: 'round_of_16', matchId: 131 },
  'W93': { home: 'W83', away: 'W84', phase: 'round_of_16', matchId: 136 },
  'W94': { home: 'W81', away: 'W82', phase: 'round_of_16', matchId: 135 },
  'W91': { home: 'W76', away: 'W78', phase: 'round_of_16', matchId: 133 },
  'W92': { home: 'W79', away: 'W80', phase: 'round_of_16', matchId: 134 },
  'W95': { home: 'W86', away: 'W88', phase: 'round_of_16', matchId: 138 },
  'W96': { home: 'W85', away: 'W87', phase: 'round_of_16', matchId: 137 },

  // QUARTAS - Com IDs do banco
  'W97': { home: 'W89', away: 'W90', phase: 'quarter_final', matchId: 127 },
  'W98': { home: 'W93', away: 'W94', phase: 'quarter_final', matchId: 129 },
  'W99': { home: 'W91', away: 'W92', phase: 'quarter_final', matchId: 128 },
  'W100': { home: 'W95', away: 'W96', phase: 'quarter_final', matchId: 130 },

  // SEMIS - Com IDs do banco
  'W101': { home: 'W97', away: 'W98', phase: 'semi_final', matchId: 155 },
  'W102': { home: 'W99', away: 'W100', phase: 'semi_final', matchId: 156 },

  // FINAL - Com ID do banco
  'W103': { home: 'W101', away: 'W102', phase: 'final', matchId: 126 },

  // TERCEIRO LUGAR - Com ID do banco
  'RU101': { home: 'Perdedor W101', away: '', phase: 'third', matchId: 157 },
  'RU102': { home: 'Perdedor W102', away: '', phase: 'third', matchId: 157 },
};

// Nomes das fases em português
const PHASE_NAMES: Record<string, string> = {
  'round_of_32': '16-Avos de Final',
  'round_of_16': 'Oitavas de Final',
  'quarter_final': 'Quartas de Final',
  'semi_final': 'Semifinal',
  'final': 'Final 🏆',
  'third': 'Disputa de 3º Lugar'
};

const PHASE_ORDER = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final', 'third'];

export function MatchManager({ matches, onMatchUpdate }: MatchManagerProps) {
  const [saving, setSaving] = useState(false);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['round_of_16', 'quarter_final', 'semi_final', 'final']));
  const [selectedCompetition, setSelectedCompetition] = useState<number | 'all'>('all');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [showCompetitionFilter, setShowCompetitionFilter] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);

  // Fallback logo
  const fallbackLogo = "https://ui-avatars.com/api/?name=TBA&background=1e293b&color=cbd5e1&bold=true";

  // Carregar competições - CORRIGIDO: useEffect em vez de useState
  useEffect(() => {
    const loadCompetitions = async () => {
      setLoadingCompetitions(true);
      try {
        const { data, error } = await supabase
          .from('competitions')
          .select('id, name, is_active')
          .order('name');
        if (!error && data) setCompetitions(data);
      } catch (error) {
        console.error('Erro ao carregar competições:', error);
      } finally {
        setLoadingCompetitions(false);
      }
    };
    loadCompetitions();
  }, []);

  // Filtrar matches por competição
  const filteredMatches = useMemo(() => {
    if (selectedCompetition === 'all') return matches;
    return matches.filter(m => m.competition_id === selectedCompetition);
  }, [matches, selectedCompetition]);

  // Mapa de times por nome (usando matches filtrados)
  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    filteredMatches.forEach(m => {
      if (m.home_team_data) map[m.home_team_data.name] = m.home_team_data;
      if (m.away_team_data) map[m.away_team_data.name] = m.away_team_data;
    });
    return map;
  }, [filteredMatches]);

  // Mapa de matches por ID (usando matches filtrados)
  const matchesById = useMemo(() => {
    const map: Record<number, Match> = {};
    filteredMatches.forEach(m => {
      map[m.id] = m;
    });
    return map;
  }, [filteredMatches]);

  // Filtra os matches do mata-mata (usando matches filtrados)
  const bracketMatches = useMemo(() => {
    return filteredMatches.filter(m => 
      m.phase && PHASE_ORDER.includes(m.phase)
    );
  }, [filteredMatches]);

  // Função para pegar o time pelo nome
  const getTeamByName = (teamName: string): Team | null => {
    if (!teamName) return null;
    return teamsMap[teamName] || null;
  };

  // Função para pegar logo seguro
  const getSafeLogo = (teamName: string) => {
    if (!teamName) return fallbackLogo;
    if (teamName.startsWith('W') || teamName.startsWith('RU')) return fallbackLogo;
    
    const team = getTeamByName(teamName);
    if (team?.logo_url) {
      return team.logo_url;
    }
    return fallbackLogo;
  };

  // Função para pegar código seguro
  const getSafeCode = (teamName: string) => {
    if (!teamName) return 'TBA';
    if (teamName.startsWith('W') || teamName.startsWith('RU')) return teamName;
    
    const team = getTeamByName(teamName);
    if (team?.short_code) return team.short_code;
    if (team?.name) return team.name.substring(0, 3).toUpperCase();
    return teamName.substring(0, 3).toUpperCase();
  };

  // Verifica se é placeholder
  const isPlaceholder = (team: string) => {
    return team?.startsWith('W') || team?.startsWith('RU') || team === 'TBD' || team === 'A DEFINIR';
  };

  // Verifica se finalizou
  const isMatchFinished = (match: Match) => {
    return match?.status === 'FT' || match?.status === 'FINISHED';
  };

  // Função para encontrar o match pelo código W usando o ID do banco
  const findMatchByCode = (code: string): Match | null => {
    const matchData = BRACKET_MAP[code];
    if (!matchData) return null;

    if (matchData.matchId) {
      return matchesById[matchData.matchId] || null;
    }

    const match = filteredMatches.find(m => {
      if (m.home_team === code || m.away_team === code) return true;
      if (m.home_team?.includes(code) || m.away_team?.includes(code)) return true;
      return false;
    });

    return match || null;
  };

  // Função para obter os times que jogaram um determinado match
  const getTeamsFromMatch = (match: Match | null): string[] => {
    if (!match) return [];
    
    const teams: string[] = [];
    if (match.home_team && !isPlaceholder(match.home_team)) {
      teams.push(match.home_team);
    }
    if (match.away_team && !isPlaceholder(match.away_team)) {
      teams.push(match.away_team);
    }
    return teams;
  };

  // Função para obter os times possíveis para um placeholder
  const getPossibleTeams = (placeholder: string): string[] => {
    if (!placeholder) return [];
    if (!placeholder.startsWith('W') && !placeholder.startsWith('RU')) {
      return [placeholder];
    }

    if (placeholder.startsWith('W')) {
      const match = findMatchByCode(placeholder);
      if (match) {
        const teams = getTeamsFromMatch(match);
        if (teams.length > 0) {
          return teams;
        }
      }
      
      const matchData = BRACKET_MAP[placeholder];
      if (!matchData) return [];

      const homeMatch = findMatchByCode(matchData.home);
      const awayMatch = findMatchByCode(matchData.away);
      
      const homeTeams = homeMatch ? getTeamsFromMatch(homeMatch) : [];
      const awayTeams = awayMatch ? getTeamsFromMatch(awayMatch) : [];
      
      const allTeams = [...homeTeams, ...awayTeams];
      if (allTeams.length > 0) {
        return allTeams;
      }
    }

    if (placeholder.startsWith('RU')) {
      const matchCode = placeholder.replace('RU', 'W');
      const match = findMatchByCode(matchCode);
      
      if (match && isMatchFinished(match)) {
        const homeScore = match.home_score || 0;
        const awayScore = match.away_score || 0;
        
        if (homeScore > awayScore) {
          return match.away_team && !isPlaceholder(match.away_team) ? [match.away_team] : [];
        }
        if (awayScore > homeScore) {
          return match.home_team && !isPlaceholder(match.home_team) ? [match.home_team] : [];
        }
        if (match.home_penalty !== null && match.away_penalty !== null) {
          const loser = match.home_penalty > match.away_penalty ? match.away_team : match.home_team;
          return loser && !isPlaceholder(loser) ? [loser] : [];
        }
      }
      return [];
    }

    return [];
  };

  // Salva o chaveamento
  const handleSaveBracket = async () => {
    setSaving(true);
    setMessage({ type: 'info', text: 'Salvando chaveamento...' });

    try {
      const bracketMatchesList = filteredMatches.filter(m => 
        m.phase && ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final', 'third'].includes(m.phase)
      );

      let updatedCount = 0;

      for (const match of bracketMatchesList) {
        if (isMatchFinished(match)) continue;

        const code = Object.keys(BRACKET_MAP).find(key => {
          const data = BRACKET_MAP[key];
          return data.home === match.home_team || data.away === match.away_team;
        });

        if (!code) continue;

        const matchData = BRACKET_MAP[code];
        if (!matchData) continue;

        const homeTeam = resolveTeam(matchData.home);
        const awayTeam = resolveTeam(matchData.away);

        if (homeTeam !== match.home_team || awayTeam !== match.away_team) {
          const { error } = await supabase
            .from('matches')
            .update({
              home_team: homeTeam,
              away_team: awayTeam
            })
            .eq('id', match.id);

          if (error) throw error;
          updatedCount++;
        }
      }

      setMessage({ type: 'success', text: `✅ Chaveamento salvo! ${updatedCount} jogos atualizados.` });
      setTimeout(() => setMessage(null), 3000);
      onMatchUpdate();
    } catch (error) {
      console.error('Erro ao salvar chaveamento:', error);
      setMessage({ type: 'error', text: '❌ Erro ao salvar chaveamento' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Função para resolver um time
  const resolveTeam = (teamName: string): string => {
    if (!teamName) return 'TBD';
    if (!teamName.startsWith('W') && !teamName.startsWith('RU')) return teamName;

    const possible = getPossibleTeams(teamName);
    if (possible.length === 1) return possible[0];
    return teamName;
  };

  // Atualiza manualmente um jogo
  const handleManualUpdate = async (matchId: number, homeTeam: string, awayTeam: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_team: homeTeam,
          away_team: awayTeam
        })
        .eq('id', matchId);

      if (error) throw error;

      setMessage({ type: 'success', text: '✅ Jogo atualizado com sucesso!' });
      setTimeout(() => setMessage(null), 3000);
      setEditingMatch(null);
      onMatchUpdate();
    } catch (error) {
      console.error('Erro ao atualizar jogo:', error);
      setMessage({ type: 'error', text: '❌ Erro ao atualizar jogo' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Alterna expansão de fase
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

  // Obter nome da competição selecionada
  const getCompetitionName = () => {
    if (selectedCompetition === 'all') return 'Todas as competições';
    const comp = competitions.find(c => c.id === selectedCompetition);
    return comp?.name || 'Todas as competições';
  };

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
          {bracketMatches.length} {bracketMatches.length === 1 ? 'jogo' : 'jogos'} no mata-mata
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-500" size={24} />
            Chaveamento do Mata-Mata
            {selectedCompetition !== 'all' && (
              <span className="text-sm font-normal text-blue-400">
                • {getCompetitionName()}
              </span>
            )}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Times em <span className="text-yellow-400">amarelo</span> são placeholders. 
            Abaixo de cada placeholder, os times possíveis para aquela vaga.
          </p>
        </div>
        
        <button
          onClick={handleSaveBracket}
          disabled={saving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} />
              Salvar Chaveamento
            </>
          )}
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Total Mata-Mata</p>
          <p className="text-xl font-bold">{bracketMatches.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Finalizados</p>
          <p className="text-xl font-bold text-green-400">
            {bracketMatches.filter(m => isMatchFinished(m)).length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Pendentes</p>
          <p className="text-xl font-bold text-yellow-400">
            {bracketMatches.filter(m => !isMatchFinished(m)).length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
          <p className="text-slate-400 text-xs">Placeholders</p>
          <p className="text-xl font-bold text-blue-400">
            {bracketMatches.filter(m => 
              isPlaceholder(m.home_team) || isPlaceholder(m.away_team)
            ).length}
          </p>
        </div>
      </div>

      {/* Lista de jogos por fase */}
      <div className="space-y-4">
        {PHASE_ORDER.map(phase => {
          const phaseMatches = filteredMatches.filter(m => m.phase === phase);
          if (phaseMatches.length === 0) return null;

          const isExpanded = expandedPhases.has(phase);
          const finishedCount = phaseMatches.filter(m => isMatchFinished(m)).length;

          return (
            <div key={phase} className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
              {/* Cabeçalho da fase */}
              <div
                onClick={() => togglePhase(phase)}
                className="bg-slate-800/50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trophy size={20} className="text-slate-400" />
                  <div>
                    <span className="font-bold text-lg">{PHASE_NAMES[phase] || phase}</span>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{phaseMatches.length} jogos</span>
                      <span>•</span>
                      <span className="text-green-400">{finishedCount} finalizados</span>
                      <span>•</span>
                      <span className="text-yellow-400">{phaseMatches.length - finishedCount} pendentes</span>
                      {selectedCompetition !== 'all' && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400">{getCompetitionName()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-slate-400 text-xs">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>

              {/* Lista de jogos da fase */}
              {isExpanded && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {phaseMatches.map((match) => {
                      const code = Object.keys(BRACKET_MAP).find(key => {
                        const data = BRACKET_MAP[key];
                        return data.home === match.home_team || data.away === match.away_team;
                      }) || `ID:${match.id}`;

                      const matchConfig = BRACKET_MAP[code];
                      const isFinished = isMatchFinished(match);
                      const isEditing = editingMatch === match.id;
                      const isHomePlaceholder = isPlaceholder(match.home_team);
                      const isAwayPlaceholder = isPlaceholder(match.away_team);
                      
                      const possibleHomeTeams = isHomePlaceholder ? getPossibleTeams(match.home_team) : [match.home_team];
                      const possibleAwayTeams = isAwayPlaceholder ? getPossibleTeams(match.away_team) : [match.away_team];

                      const homeTeam = isHomePlaceholder && possibleHomeTeams.length === 1 ? possibleHomeTeams[0] : match.home_team;
                      const awayTeam = isAwayPlaceholder && possibleAwayTeams.length === 1 ? possibleAwayTeams[0] : match.away_team;

                      const homeLogo = getSafeLogo(homeTeam);
                      const awayLogo = getSafeLogo(awayTeam);
                      const homeCode = getSafeCode(homeTeam);
                      const awayCode = getSafeCode(awayTeam);

                      return (
                        <div 
                          key={match.id} 
                          className={`bg-slate-800/50 p-4 rounded-lg border-2 transition-all ${
                            isFinished 
                              ? 'border-green-500/30' 
                              : 'border-slate-700/50'
                          } ${isEditing ? 'border-yellow-500/50 ring-2 ring-yellow-500/20' : ''}`}
                        >
                          {/* Código e descrição */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs text-slate-500 font-mono">
                              {code}
                              {matchConfig && (
                                <span className="ml-2 text-[10px] text-slate-600">
                                  ({matchConfig.home} vs {matchConfig.away})
                                </span>
                              )}
                              {matchConfig?.matchId && (
                                <span className="ml-2 text-[10px] text-slate-500">
                                  ID: {matchConfig.matchId}
                                </span>
                              )}
                            </div>
                            {isFinished && (
                              <span className="text-green-400 text-xs font-semibold flex items-center gap-1">
                                <CheckCircle size={14} />
                                Finalizado
                              </span>
                            )}
                          </div>

                          {/* Times */}
                          <div className="flex items-center gap-4">
                            {/* Casa */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-12 h-12 flex items-center justify-center">
                                  <img 
                                    src={homeLogo} 
                                    alt={homeTeam}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => { 
                                      (e.target as HTMLImageElement).src = fallbackLogo;
                                    }}
                                  />
                                </div>
                                {isEditing && isHomePlaceholder ? (
                                  <select
                                    value={match.home_team}
                                    onChange={(e) => {
                                      handleManualUpdate(match.id, e.target.value, match.away_team);
                                    }}
                                    className="flex-1 p-1 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                                  >
                                    <option value={match.home_team}>{match.home_team}</option>
                                    {possibleHomeTeams.map(team => (
                                      <option key={team} value={team}>{team}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-xs font-bold truncate ${
                                    isHomePlaceholder ? 'text-yellow-400' : 'text-slate-300'
                                  }`}>
                                    {isHomePlaceholder ? (
                                      <>
                                        {homeCode}
                                        {possibleHomeTeams.length > 1 && !isEditing && (
                                          <span className="block text-[8px] text-slate-500 font-normal">
                                            Possíveis: {possibleHomeTeams.join(' ou ')}
                                          </span>
                                        )}
                                        {possibleHomeTeams.length === 1 && !isEditing && (
                                          <span className="block text-[8px] text-green-500 font-normal">
                                            {possibleHomeTeams[0]}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      homeCode
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* VS ou Placar */}
                            <div className="flex-shrink-0">
                              {isFinished ? (
                                <div className="text-center">
                                  <div className="text-lg font-bold text-white">
                                    {match.home_score ?? 0} - {match.away_score ?? 0}
                                  </div>
                                  {match.home_penalty !== null && match.away_penalty !== null && (
                                    <div className="text-[10px] text-yellow-500">
                                      PÊN: {match.home_penalty} - {match.away_penalty}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500 font-bold">VS</div>
                              )}
                            </div>

                            {/* Fora */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 justify-center">
                                {isEditing && isAwayPlaceholder ? (
                                  <select
                                    value={match.away_team}
                                    onChange={(e) => {
                                      handleManualUpdate(match.id, match.home_team, e.target.value);
                                    }}
                                    className="flex-1 p-1 text-xs rounded bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                                  >
                                    <option value={match.away_team}>{match.away_team}</option>
                                    {possibleAwayTeams.map(team => (
                                      <option key={team} value={team}>{team}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`text-xs font-bold truncate ${
                                    isAwayPlaceholder ? 'text-yellow-400' : 'text-slate-300'
                                  }`}>
                                    {isAwayPlaceholder ? (
                                      <>
                                        {awayCode}
                                        {possibleAwayTeams.length > 1 && !isEditing && (
                                          <span className="block text-[8px] text-slate-500 font-normal">
                                            Possíveis: {possibleAwayTeams.join(' ou ')}
                                          </span>
                                        )}
                                        {possibleAwayTeams.length === 1 && !isEditing && (
                                          <span className="block text-[8px] text-green-500 font-normal">
                                            {possibleAwayTeams[0]}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      awayCode
                                    )}
                                  </span>
                                )}
                                <div className="w-12 h-12 flex items-center justify-center">
                                  <img 
                                    src={awayLogo} 
                                    alt={awayTeam}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => { 
                                      (e.target as HTMLImageElement).src = fallbackLogo;
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Botões */}
                          <div className="flex gap-2 mt-3">
                            {!isFinished && !isEditing && (
                              <button
                                onClick={() => setEditingMatch(match.id)}
                                className="flex-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                              >
                                <Edit2 size={14} />
                                Editar
                              </button>
                            )}
                            {isEditing && (
                              <>
                                <button
                                  onClick={() => setEditingMatch(null)}
                                  className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                  <Lock size={14} />
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
          <Shield size={16} className="text-slate-400" />
          Legenda        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500/30 rounded border border-yellow-500/50"></div>
            <span className="text-slate-400">Placeholder - mostra times possíveis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500/30 rounded border border-green-500/50"></div>
            <span className="text-slate-400">Jogo finalizado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600/30 rounded border border-blue-600/50"></div>
            <span className="text-slate-400">Em edição</span>
          </div>
        </div>
      </div>
    </div>
  );
}