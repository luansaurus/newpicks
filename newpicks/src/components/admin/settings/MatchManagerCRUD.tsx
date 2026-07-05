'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase/client';
import { 
  Plus,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  X,
  Calendar,
  Clock,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
  Upload,
  Download,
  FileSpreadsheet,
  Tag,
  Hash,
  FileText,
  AlertTriangle
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
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty: number | null;
  away_penalty: number | null;
  status: string;
  phase: string;
  match_time: string;
  competition_id?: number;
};

interface MatchesCRUDProps {
  matches: Match[];
  onMatchUpdate: () => void;
}

// Fases pré-definidas
const PHASE_OPTIONS = [
  { label: 'Fase de Grupos', value: 'groups' },
  { label: '16 avos de Final', value: 'round_of_32' },
  { label: 'Oitavas de Final', value: 'round_of_16' },
  { label: 'Quartas de Final', value: 'quarter_final' },
  { label: 'Semifinal', value: 'semi_final' },
  { label: 'Disputa de 3º Lugar', value: 'third_place' },
  { label: 'Final', value: 'final' },
];

// Mapeamento de status
const STATUS_MAP: Record<string, string> = {
  'agendado': 'SCHEDULED',
  'schedule': 'SCHEDULED',
  'scheduled': 'SCHEDULED',
  'ao vivo': 'IN_PLAY',
  'live': 'IN_PLAY',
  'in_play': 'IN_PLAY',
  'finalizado': 'FINISHED',
  'finished': 'FINISHED',
  'ft': 'FINISHED',
};

export function MatchesCRUD({ matches, onMatchUpdate }: MatchesCRUDProps) {
  const [filteredMatches, setFilteredMatches] = useState<Match[]>(matches);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    home_team: '',
    away_team: '',
    competition_id: '',
    phase: '',
    status: ''
  });

  // Estado para criação de nova fase
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [newPhaseLabel, setNewPhaseLabel] = useState('');
  const [newPhaseValue, setNewPhaseValue] = useState('');

  // Estado para busca de times
  const [teamSearch, setTeamSearch] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [selectedHomeTeam, setSelectedHomeTeam] = useState<Team | null>(null);
  const [selectedAwayTeam, setSelectedAwayTeam] = useState<Team | null>(null);
  const [teamSearchType, setTeamSearchType] = useState<'home' | 'away'>('home');

  // Estado para importação CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; details: string[] } | null>(null);

  // Form state
  const [formData, setFormData] = useState<any>({
    home_team_id: '',
    away_team_id: '',
    home_score: '',
    away_score: '',
    home_penalty: '',
    away_penalty: '',
    status: 'SCHEDULED',
    phase: 'groups',
    match_time: '',
    competition_id: ''
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTeams();
    loadCompetitions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, matches]);

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, short_code, logo_url')
        .order('name');
      if (!error && data) setTeams(data);
    } catch (error) {
      console.error('Erro ao carregar times:', error);
    }
  };

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

  const applyFilters = () => {
    let filtered = [...matches];

    if (filters.home_team.trim()) {
      const term = filters.home_team.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.home_team?.toLowerCase().includes(term)
      );
    }

    if (filters.away_team.trim()) {
      const term = filters.away_team.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.away_team?.toLowerCase().includes(term)
      );
    }

    if (filters.competition_id) {
      filtered = filtered.filter(m => m.competition_id === parseInt(filters.competition_id));
    }

    if (filters.phase) {
      filtered = filtered.filter(m => m.phase === filters.phase);
    }

    if (filters.status) {
      filtered = filtered.filter(m => m.status === filters.status);
    }

    setFilteredMatches(filtered);
  };

  const clearFilters = () => {
    setFilters({
      home_team: '',
      away_team: '',
      competition_id: '',
      phase: '',
      status: ''
    });
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value && value.trim() !== '');
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setEditingMatch(null);
    setSelectedHomeTeam(null);
    setSelectedAwayTeam(null);
    const now = new Date();
    const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0);
    setFormData({
      home_team_id: '',
      away_team_id: '',
      home_score: '',
      away_score: '',
      home_penalty: '',
      away_penalty: '',
      status: 'SCHEDULED',
      phase: 'groups',
      match_time: defaultDate.toISOString().slice(0, 16),
      competition_id: ''
    });
  };

  const handleEdit = (match: Match) => {
    setIsEditing(true);
    setIsCreating(false);
    setEditingMatch(match);
    const homeTeam = teams.find(t => t.id === match.home_team_id);
    const awayTeam = teams.find(t => t.id === match.away_team_id);
    setSelectedHomeTeam(homeTeam || null);
    setSelectedAwayTeam(awayTeam || null);
    setFormData({
      home_team_id: match.home_team_id || '',
      away_team_id: match.away_team_id || '',
      home_score: match.home_score?.toString() || '',
      away_score: match.away_score?.toString() || '',
      home_penalty: match.home_penalty?.toString() || '',
      away_penalty: match.away_penalty?.toString() || '',
      status: match.status || 'SCHEDULED',
      phase: match.phase || 'groups',
      match_time: match.match_time ? new Date(match.match_time).toISOString().slice(0, 16) : '',
      competition_id: match.competition_id?.toString() || ''
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setEditingMatch(null);
    setSelectedHomeTeam(null);
    setSelectedAwayTeam(null);
    setFormData({
      home_team_id: '',
      away_team_id: '',
      home_score: '',
      away_score: '',
      home_penalty: '',
      away_penalty: '',
      status: 'SCHEDULED',
      phase: 'groups',
      match_time: '',
      competition_id: ''
    });
  };

  const handleTeamSearch = (type: 'home' | 'away', value: string) => {
    setTeamSearchType(type);
    setTeamSearch(value);
    setShowTeamDropdown(true);
  };

  const handleSelectTeam = (team: Team) => {
    if (teamSearchType === 'home') {
      setSelectedHomeTeam(team);
      setFormData({ ...formData, home_team_id: team.id });
    } else {
      setSelectedAwayTeam(team);
      setFormData({ ...formData, away_team_id: team.id });
    }
    setTeamSearch('');
    setShowTeamDropdown(false);
  };

  const handleSave = async () => {
    if (!formData.home_team_id || !formData.away_team_id) {
      showMessage('error', 'Selecione os times');
      return;
    }
    if (formData.home_team_id === formData.away_team_id) {
      showMessage('error', 'Os times não podem ser iguais');
      return;
    }
    if (!formData.match_time) {
      showMessage('error', 'Selecione a data e hora');
      return;
    }

    setLoading(true);
    try {
      const homeTeam = teams.find(t => t.id === parseInt(formData.home_team_id));
      const awayTeam = teams.find(t => t.id === parseInt(formData.away_team_id));

      const matchData = {
        home_team_id: parseInt(formData.home_team_id),
        away_team_id: parseInt(formData.away_team_id),
        home_team: homeTeam?.name || '',
        away_team: awayTeam?.name || '',
        home_score: formData.home_score ? parseInt(formData.home_score) : null,
        away_score: formData.away_score ? parseInt(formData.away_score) : null,
        home_penalty: formData.home_penalty ? parseInt(formData.home_penalty) : null,
        away_penalty: formData.away_penalty ? parseInt(formData.away_penalty) : null,
        status: formData.status || 'SCHEDULED',
        phase: formData.phase || 'groups',
        match_time: new Date(formData.match_time).toISOString(),
        competition_id: formData.competition_id ? parseInt(formData.competition_id) : null
      };

      if (isEditing && editingMatch) {
        const { error } = await supabase
          .from('matches')
          .update(matchData)
          .eq('id', editingMatch.id);

        if (error) throw error;
        showMessage('success', 'Jogo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('matches')
          .insert([matchData]);

        if (error) throw error;
        showMessage('success', 'Jogo criado com sucesso!');
      }

      setIsCreating(false);
      setIsEditing(false);
      setEditingMatch(null);
      setSelectedHomeTeam(null);
      setSelectedAwayTeam(null);
      onMatchUpdate();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showMessage('error', 'Erro ao salvar jogo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (matchId: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!confirm(`Tem certeza que deseja excluir o jogo "${match?.home_team} vs ${match?.away_team}"?`)) return;

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
      showMessage('success', 'Jogo excluído com sucesso!');
      onMatchUpdate();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showMessage('error', 'Erro ao excluir jogo');
    }
  };

  const handleCreatePhase = async () => {
    if (!newPhaseLabel.trim() || !newPhaseValue.trim()) {
      showMessage('error', 'Preencha todos os campos');
      return;
    }

    if (PHASE_OPTIONS.some(p => p.value === newPhaseValue.trim().toLowerCase())) {
      showMessage('error', 'Esta fase já existe');
      return;
    }

    PHASE_OPTIONS.push({
      label: newPhaseLabel.trim(),
      value: newPhaseValue.trim().toLowerCase()
    });

    showMessage('success', `Fase "${newPhaseLabel}" criada com sucesso!`);
    setShowPhaseModal(false);
    setNewPhaseLabel('');
    setNewPhaseValue('');
  };

  // ========== FUNÇÕES DE IMPORTAÇÃO CSV ==========

  const downloadCSVTemplate = () => {
    const headers = [
      'home_team',
      'away_team',
      'home_score',
      'away_score',
      'home_penalty',
      'away_penalty',
      'status',
      'phase',
      'match_time',
      'competition'
    ];
    
    const sampleData = [
      {
        home_team: 'Flamengo',
        away_team: 'Palmeiras',
        home_score: '2',
        away_score: '1',
        home_penalty: '',
        away_penalty: '',
        status: 'FINISHED',
        phase: 'final',
        match_time: '2024-12-10 20:00:00',
        competition: 'Brasileirão'
      },
      {
        home_team: 'Corinthians',
        away_team: 'Fluminense',
        home_score: '0',
        away_score: '0',
        home_penalty: '4',
        away_penalty: '3',
        status: 'FINISHED',
        phase: 'semi_final',
        match_time: '2024-12-08 18:00:00',
        competition: 'Brasileirão'
      },
      {
        home_team: 'São Paulo',
        away_team: 'Grêmio',
        home_score: '',
        away_score: '',
        home_penalty: '',
        away_penalty: '',
        status: 'SCHEDULED',
        phase: 'groups',
        match_time: '2024-12-15 16:00:00',
        competition: 'Brasileirão'
      }
    ];

    // Criar o CSV
    const headerRow = headers.join(',');
    const dataRows = sampleData.map(row => 
      headers.map(h => row[h as keyof typeof row] || '').join(',')
    );
    const csvContent = [headerRow, ...dataRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_jogos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportResults(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          showMessage('error', 'Arquivo vazio ou formato inválido');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        setCsvHeaders(headers);

        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = values[i] || '';
          });
          return obj;
        });
        
        setCsvData(data);
        showMessage('info', `${data.length} jogos carregados. Verifique os dados e clique em Importar.`);
      } catch (error) {
        console.error('Erro ao ler CSV:', error);
        showMessage('error', 'Erro ao ler o arquivo CSV. Verifique o formato.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImportCSV = async () => {
    if (csvData.length === 0) {
      showMessage('error', 'Nenhum dado para importar');
      return;
    }

    setImporting(true);
    const results = {
      success: 0,
      errors: 0,
      details: [] as string[]
    };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNum = i + 2; // +2 porque linha 1 é o cabeçalho

        try {
          // Valida campos obrigatórios
          if (!row.home_team || !row.away_team) {
            results.errors++;
            results.details.push(`Linha ${rowNum}: Times obrigatórios`);
            continue;
          }

          // Busca os times
          const homeTeam = teams.find(t => 
            t.name.toLowerCase() === row.home_team.toLowerCase() ||
            t.name.toLowerCase().includes(row.home_team.toLowerCase()) ||
            row.home_team.toLowerCase().includes(t.name.toLowerCase())
          );
          
          const awayTeam = teams.find(t => 
            t.name.toLowerCase() === row.away_team.toLowerCase() ||
            t.name.toLowerCase().includes(row.away_team.toLowerCase()) ||
            row.away_team.toLowerCase().includes(t.name.toLowerCase())
          );

          if (!homeTeam) {
            results.errors++;
            results.details.push(`Linha ${rowNum}: Time da casa "${row.home_team}" não encontrado`);
            continue;
          }

          if (!awayTeam) {
            results.errors++;
            results.details.push(`Linha ${rowNum}: Time visitante "${row.away_team}" não encontrado`);
            continue;
          }

          // Busca a competição
          let competitionId = null;
          if (row.competition) {
            const comp = competitions.find(c => 
              c.name.toLowerCase() === row.competition.toLowerCase() ||
              c.name.toLowerCase().includes(row.competition.toLowerCase()) ||
              row.competition.toLowerCase().includes(c.name.toLowerCase())
            );
            if (comp) competitionId = comp.id;
          }

          // Normaliza status
          let status = 'SCHEDULED';
          const statusKey = row.status?.toLowerCase().trim();
          if (statusKey && STATUS_MAP[statusKey]) {
            status = STATUS_MAP[statusKey];
          } else if (statusKey) {
            // Tenta encontrar correspondência parcial
            for (const [key, value] of Object.entries(STATUS_MAP)) {
              if (statusKey.includes(key) || key.includes(statusKey)) {
                status = value;
                break;
              }
            }
          }

          // Normaliza fase
          let phase = 'groups';
          if (row.phase) {
            const phaseMatch = PHASE_OPTIONS.find(p => 
              p.value === row.phase.toLowerCase() ||
              p.label.toLowerCase() === row.phase.toLowerCase() ||
              row.phase.toLowerCase().includes(p.value) ||
              p.label.toLowerCase().includes(row.phase.toLowerCase())
            );
            if (phaseMatch) phase = phaseMatch.value;
          }

          // Valida data
          let matchTime = null;
          if (row.match_time) {
            try {
              const date = new Date(row.match_time);
              if (!isNaN(date.getTime())) {
                matchTime = date.toISOString();
              }
            } catch (e) {
              // Tenta formatar a data manualmente
              try {
                const parts = row.match_time.split(/[-:\s]/);
                if (parts.length >= 3) {
                  const year = parseInt(parts[0]);
                  const month = parseInt(parts[1]) - 1;
                  const day = parseInt(parts[2]);
                  const hours = parseInt(parts[3]) || 0;
                  const minutes = parseInt(parts[4]) || 0;
                  const date = new Date(year, month, day, hours, minutes);
                  if (!isNaN(date.getTime())) {
                    matchTime = date.toISOString();
                  }
                }
              } catch (e2) {
                // Ignora
              }
            }
          }

          const matchData = {
            home_team: homeTeam.name,
            away_team: awayTeam.name,
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
            home_score: row.home_score ? parseInt(row.home_score) : null,
            away_score: row.away_score ? parseInt(row.away_score) : null,
            home_penalty: row.home_penalty ? parseInt(row.home_penalty) : null,
            away_penalty: row.away_penalty ? parseInt(row.away_penalty) : null,
            status: status,
            phase: phase,
            match_time: matchTime,
            competition_id: competitionId
          };

          const { error } = await supabase
            .from('matches')
            .insert([matchData]);

          if (error) {
            results.errors++;
            results.details.push(`Linha ${rowNum}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (error) {
          results.errors++;
          results.details.push(`Linha ${rowNum}: Erro inesperado - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      setImportResults(results);
      
      if (results.errors === 0) {
        showMessage('success', `${results.success} jogos importados com sucesso!`);
      } else if (results.success === 0) {
        showMessage('error', `Nenhum jogo importado. ${results.errors} erros encontrados.`);
      } else {
        showMessage('info', `${results.success} jogos importados, ${results.errors} erros.`);
      }

      if (results.success > 0) {
        setShowImportModal(false);
        setCsvFile(null);
        setCsvData([]);
        onMatchUpdate();
      }
    } catch (error) {
      console.error('Erro na importação:', error);
      showMessage('error', 'Erro ao importar jogos');
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const getTeamName = (teamId: number | null | undefined) => {
    if (!teamId) return 'N/A';
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'N/A';
  };

  const getCompetitionName = (competitionId?: number) => {
    if (!competitionId) return 'N/A';
    const comp = competitions.find(c => c.id === competitionId);
    return comp?.name || 'N/A';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'SCHEDULED': { label: 'Agendado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
      'IN_PLAY': { label: 'Ao Vivo', color: 'bg-red-500/20 text-red-400 border-red-500/20 animate-pulse' },
      'FINISHED': { label: 'Finalizado', color: 'bg-green-500/20 text-green-400 border-green-500/20' },
      'FT': { label: 'Finalizado', color: 'bg-green-500/20 text-green-400 border-green-500/20' },
      'HT': { label: 'Intervalo', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' },
    };
    return statusMap[status] || { label: status || 'N/A', color: 'bg-slate-500/20 text-slate-400 border-slate-500/20' };
  };

  // Filtrar times para o dropdown
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
    (team.short_code && team.short_code.toLowerCase().includes(teamSearch.toLowerCase()))
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

      {/* Barra de Ações */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex gap-2">
            <button
              onClick={() => setSearchExpanded(!searchExpanded)}
              className={`px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors whitespace-nowrap ${
                searchExpanded || hasActiveFilters()
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            >
              <Search size={16} />
              Pesquisar
              {hasActiveFilters() && (
                <span className="ml-1 px-2 py-0.5 bg-blue-500/30 rounded-full text-xs">
                  {filteredMatches.length}
                </span>
              )}
              {searchExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="px-3 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-semibold flex items-center gap-1 transition-colors text-sm"
              >
                <X size={14} />
                Limpar
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            Novo Jogo
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Upload size={16} />
            Importar CSV
          </button>
          <button
            onClick={onMatchUpdate}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Painel de Pesquisa Avançada */}
      {searchExpanded && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-blue-500/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-bold flex items-center gap-2">
              <Filter size={16} className="text-blue-400" />
              Filtros de Pesquisa
            </h5>
            <span className="text-xs text-slate-400">
              {filteredMatches.length} {filteredMatches.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Time da Casa
              </label>
              <input
                type="text"
                placeholder="Digite o nome..."
                value={filters.home_team}
                onChange={(e) => setFilters({ ...filters, home_team: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Time Visitante
              </label>
              <input
                type="text"
                placeholder="Digite o nome..."
                value={filters.away_team}
                onChange={(e) => setFilters({ ...filters, away_team: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Competição
              </label>
              <select
                value={filters.competition_id}
                onChange={(e) => setFilters({ ...filters, competition_id: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todas</option>
                {competitions.map(comp => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Fase
              </label>
              <select
                value={filters.phase}
                onChange={(e) => setFilters({ ...filters, phase: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todas</option>
                {PHASE_OPTIONS.map(phase => (
                  <option key={phase.value} value={phase.value}>{phase.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="SCHEDULED">Agendado</option>
                <option value="IN_PLAY">Ao Vivo</option>
                <option value="FINISHED">Finalizado</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors text-sm"
            >
              Limpar todos
            </button>
          </div>
        </div>
      )}

      {/* Formulário de Criação/Edição */}
      {(isCreating || isEditing) && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-lg font-bold flex items-center gap-2">
              {isCreating ? (
                <>
                  <Plus size={20} className="text-blue-400" />
                  Criar Novo Jogo
                </>
              ) : (
                <>
                  <Edit2 size={20} className="text-yellow-400" />
                  Editar Jogo
                </>
              )}
            </h5>
            <button
              onClick={handleCancel}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Competição */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Competição
              </label>
              <select
                value={formData.competition_id}
                onChange={(e) => setFormData({ ...formData, competition_id: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecione...</option>
                {competitions.map(comp => (
                  <option key={comp.id} value={comp.id}>{comp.name}</option>
                ))}
              </select>
            </div>

            {/* Fase com botão para criar nova */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400 block">
                  Fase
                </label>
                <button
                  onClick={() => setShowPhaseModal(true)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} />
                  Nova Fase
                </button>
              </div>
              <select
                value={formData.phase}
                onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                {PHASE_OPTIONS.map(phase => (
                  <option key={phase.value} value={phase.value}>{phase.label}</option>
                ))}
              </select>
            </div>

            {/* Time da Casa com busca */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Time da Casa *
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar time..."
                  value={teamSearchType === 'home' && showTeamDropdown ? teamSearch : selectedHomeTeam?.name || ''}
                  onFocus={() => {
                    setTeamSearchType('home');
                    setShowTeamDropdown(true);
                    setTeamSearch('');
                  }}
                  onChange={(e) => handleTeamSearch('home', e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
                {showTeamDropdown && teamSearchType === 'home' && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    {filteredTeams.length === 0 ? (
                      <div className="p-3 text-sm text-slate-400">Nenhum time encontrado</div>
                    ) : (
                      filteredTeams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleSelectTeam(team)}
                          className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2 transition-colors"
                        >
                          {team.logo_url && (
                            <img src={team.logo_url} className="w-5 h-5 object-contain" alt="" />
                          )}
                          <span className="text-sm">{team.name}</span>
                          {team.short_code && (
                            <span className="text-xs text-slate-400">({team.short_code})</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Time Visitante com busca */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Time Visitante *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar time..."
                  value={teamSearchType === 'away' && showTeamDropdown ? teamSearch : selectedAwayTeam?.name || ''}
                  onFocus={() => {
                    setTeamSearchType('away');
                    setShowTeamDropdown(true);
                    setTeamSearch('');
                  }}
                  onChange={(e) => handleTeamSearch('away', e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
                {showTeamDropdown && teamSearchType === 'away' && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    {filteredTeams.length === 0 ? (
                      <div className="p-3 text-sm text-slate-400">Nenhum time encontrado</div>
                    ) : (
                      filteredTeams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleSelectTeam(team)}
                          className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2 transition-colors"
                        >
                          {team.logo_url && (
                            <img src={team.logo_url} className="w-5 h-5 object-contain" alt="" />
                          )}
                          <span className="text-sm">{team.name}</span>
                          {team.short_code && (
                            <span className="text-xs text-slate-400">({team.short_code})</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Data e Hora */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Data e Hora *
              </label>
              <input
                type="datetime-local"
                value={formData.match_time}
                onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="SCHEDULED">Agendado</option>
                <option value="IN_PLAY">Ao Vivo</option>
                <option value="FINISHED">Finalizado</option>
              </select>
            </div>

            {/* Placar Casa */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Placar Casa
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.home_score}
                onChange={(e) => setFormData({ ...formData, home_score: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Placar Visitante */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Placar Visitante
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.away_score}
                onChange={(e) => setFormData({ ...formData, away_score: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Pênaltis Casa */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Pênaltis Casa
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.home_penalty}
                onChange={(e) => setFormData({ ...formData, home_penalty: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Pênaltis Visitante */}
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Pênaltis Visitante
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={formData.away_penalty}
                onChange={(e) => setFormData({ ...formData, away_penalty: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {isCreating ? 'Criar Jogo' : 'Atualizar Jogo'}
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de Jogos */}
      <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Calendar size={16} className="text-blue-400" />
              Jogos Cadastrados
            </h4>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredMatches.length} {filteredMatches.length === 1 ? 'jogo' : 'jogos'})
            </span>
            {hasActiveFilters() && (
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                Filtrado
              </span>
            )}
          </div>
          {loading && (
            <Loader2 size={16} className="animate-spin text-slate-400" />
          )}
        </div>
        <div className="divide-y divide-slate-700/30 max-h-[500px] overflow-y-auto scrollbar-thin">
          {filteredMatches.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {hasActiveFilters() ? (
                <>
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum jogo encontrado com os filtros selecionados</p>
                  <p className="text-sm mt-1">Tente ajustar os filtros de pesquisa</p>
                  <button
                    onClick={clearFilters}
                    className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
                  >
                    Limpar filtros
                  </button>
                </>
              ) : (
                <>
                  <Trophy size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum jogo cadastrado</p>
                  <p className="text-sm mt-1">Clique em "Novo Jogo" ou importe um CSV para começar</p>
                </>
              )}
            </div>
          ) : (
            filteredMatches.map((match) => {
              const statusBadge = getStatusBadge(match.status);
              
              return (
                <div key={match.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{getTeamName(match.home_team_id)}</span>
                      <span className="text-xs text-slate-500">vs</span>
                      <span className="font-medium truncate">{getTeamName(match.away_team_id)}</span>
                    </div>
                    {match.status === 'FINISHED' && match.home_score !== null && match.away_score !== null && (
                      <span className="text-sm font-bold text-white flex-shrink-0">
                        {match.home_score} - {match.away_score}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded hidden md:inline">
                      {getCompetitionName(match.competition_id)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden md:inline">
                      {formatDate(match.match_time)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(match)}
                        className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                        title="Editar jogo"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(match.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir jogo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal para criar nova fase */}
      {showPhaseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="font-display font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                <Tag size={20} className="text-blue-400" />
                Criar Nova Fase
              </h2>
              <button
                onClick={() => {
                  setShowPhaseModal(false);
                  setNewPhaseLabel('');
                  setNewPhaseValue('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">
                  Nome de Exibição *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fase de Grupos"
                  value={newPhaseLabel}
                  onChange={(e) => setNewPhaseLabel(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">Como será exibido para os usuários</p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">
                  Nome de Registro *
                </label>
                <input
                  type="text"
                  placeholder="Ex: groups"
                  value={newPhaseValue}
                  onChange={(e) => setNewPhaseValue(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none lowercase"
                />
                <p className="text-[10px] text-slate-500 mt-1">Identificador único (sem espaços)</p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-slate-400">
                  <span className="text-blue-400">ℹ️</span> A nova fase será adicionada à lista de opções disponíveis para todos os jogos.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-border bg-background/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPhaseModal(false);
                  setNewPhaseLabel('');
                  setNewPhaseValue('');
                }}
                className="px-4 py-2 font-bold text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePhase}
                className="px-6 py-2 font-bold text-sm bg-blue-600 hover:bg-blue-700 rounded-lg text-white flex items-center gap-2 transition-colors"
              >
                <Tag size={16} />
                Criar Fase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background/50 flex-shrink-0">
              <h2 className="font-display font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-green-400" />
                Importar Jogos (CSV)
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setCsvFile(null);
                  setCsvData([]);
                  setImportResults(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Instruções */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Instruções
                  </h4>
                  <ul className="text-xs text-slate-300 mt-2 space-y-1 list-disc list-inside">
                    <li>O arquivo deve estar no formato CSV (separado por vírgulas)</li>
                    <li>A primeira linha deve conter os cabeçalhos das colunas</li>
                    <li>Colunas obrigatórias: <strong>home_team</strong> e <strong>away_team</strong></li>
                    <li>Os times devem existir no banco de dados (nomes compatíveis)</li>
                    <li>Clique em <strong>Baixar Template</strong> para ver um exemplo</li>
                  </ul>
                </div>

                {/* Botão baixar template */}
                <div className="flex gap-3">
                  <button
                    onClick={downloadCSVTemplate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm"
                  >
                    <Download size={16} />
                    Baixar Template
                  </button>
                </div>

                {/* Upload do arquivo */}
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csvFileInput"
                  />
                  <label
                    htmlFor="csvFileInput"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload size={32} className="text-slate-500" />
                    <span className="text-sm text-slate-400">
                      {csvFile ? csvFile.name : 'Clique para selecionar um arquivo CSV'}
                    </span>
                    <span className="text-xs text-slate-500">ou arraste e solte</span>
                  </label>
                </div>

                {/* Preview dos dados */}
                {csvData.length > 0 && (
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">
                        {csvData.length} jogos carregados
                      </span>
                      <button
                        onClick={() => setCsvData([])}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto text-xs">
                      <table className="w-full text-left">
                        <thead className="text-slate-400 border-b border-slate-700">
                          <tr>
                            {csvHeaders.map(key => (
                              <th key={key} className="p-1 font-medium">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-slate-300">
                          {csvData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b border-slate-800/50">
                              {csvHeaders.map(key => (
                                <td key={key} className="p-1 truncate max-w-[100px]">{row[key] || ''}</td>
                              ))}
                            </tr>
                          ))}
                          {csvData.length > 5 && (
                            <tr>
                              <td colSpan={csvHeaders.length} className="p-1 text-slate-500 text-center">
                                ... e mais {csvData.length - 5} linhas
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Resultados da importação */}
                {importResults && (
                  <div className={`p-4 rounded-lg border ${
                    importResults.errors === 0 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : importResults.success === 0
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-yellow-500/10 border-yellow-500/20'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold">
                        {importResults.success > 0 && <CheckCircle size={16} className="text-green-400 inline mr-1" />}
                        {importResults.errors > 0 && importResults.success === 0 && <XCircle size={16} className="text-red-400 inline mr-1" />}
                        {importResults.errors > 0 && importResults.success > 0 && <AlertTriangle size={16} className="text-yellow-400 inline mr-1" />}
                        Resultado da Importação
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-400">✅ {importResults.success} importados</span>
                      <span className="text-red-400">❌ {importResults.errors} erros</span>
                    </div>
                    {importResults.details.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-slate-400">
                        {importResults.details.map((detail, i) => (
                          <div key={i} className="py-0.5">{detail}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-border bg-background/50 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setCsvFile(null);
                  setCsvData([]);
                  setImportResults(null);
                }}
                className="px-4 py-2 font-bold text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportCSV}
                disabled={csvData.length === 0 || importing}
                className="px-6 py-2 font-bold text-sm bg-green-600 hover:bg-green-700 rounded-lg text-white flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Importar {csvData.length} jogos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}