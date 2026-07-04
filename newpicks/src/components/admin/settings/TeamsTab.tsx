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
  Image as ImageIcon,
  Palette,
  Globe,
  Tag,
  FolderOpen,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  Upload,
  Download
} from 'lucide-react';

type Team = {
  id: number;
  name: string;
  logo_url: string;
  country_code: string | null;
  short_code: string | null;
  type: string | null;
  main_color: string | null;
};

interface TeamsTabProps {
  onUpdate?: () => void;
}

export function TeamsTab({ onUpdate }: TeamsTabProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search filters
  const [filters, setFilters] = useState({
    name: '',
    short_code: '',
    country_code: '',
    type: '',
    main_color: ''
  });

  // Form state
  const [formData, setFormData] = useState<Partial<Team>>({
    name: '',
    logo_url: '',
    country_code: '',
    short_code: '',
    type: '',
    main_color: ''
  });

  // Team types
  const teamTypes = ['Nacional', 'Clube', 'Seleção', 'Outro'];

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, teams]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTeams(data || []);
      setFilteredTeams(data || []);
    } catch (error) {
      console.error('Erro ao carregar times:', error);
      showMessage('error', 'Erro ao carregar times');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...teams];

    if (filters.name.trim()) {
      const term = filters.name.toLowerCase().trim();
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(term)
      );
    }

    if (filters.short_code.trim()) {
      const term = filters.short_code.toLowerCase().trim();
      filtered = filtered.filter(team => 
        team.short_code && team.short_code.toLowerCase().includes(term)
      );
    }

    if (filters.country_code.trim()) {
      const term = filters.country_code.toLowerCase().trim();
      filtered = filtered.filter(team => 
        team.country_code && team.country_code.toLowerCase().includes(term)
      );
    }

    if (filters.type) {
      filtered = filtered.filter(team => 
        team.type === filters.type
      );
    }

    if (filters.main_color.trim()) {
      const term = filters.main_color.toLowerCase().trim();
      filtered = filtered.filter(team => 
        team.main_color && team.main_color.toLowerCase().includes(term)
      );
    }

    setFilteredTeams(filtered);
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      short_code: '',
      country_code: '',
      type: '',
      main_color: ''
    });
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value && value.trim() !== '');
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 8000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      logo_url: '',
      country_code: '',
      short_code: '',
      type: '',
      main_color: ''
    });
    setSelectedTeam(null);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      logo_url: team.logo_url,
      country_code: team.country_code,
      short_code: team.short_code,
      type: team.type,
      main_color: team.main_color
    });
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (selectedTeam) {
      setIsEditing(true);
      setIsCreating(false);
    }
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTeam(null);
  };

  const handleCancel = () => {
    resetForm();
    if (selectedTeam) {
      setFormData({
        name: selectedTeam.name,
        logo_url: selectedTeam.logo_url,
        country_code: selectedTeam.country_code,
        short_code: selectedTeam.short_code,
        type: selectedTeam.type,
        main_color: selectedTeam.main_color
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name || formData.name.trim() === '') {
      showMessage('error', 'O nome do time é obrigatório');
      return false;
    }
    if (!formData.logo_url || formData.logo_url.trim() === '') {
      showMessage('error', 'A URL do logo é obrigatória');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const teamData = {
        name: formData.name!.trim(),
        logo_url: formData.logo_url!.trim(),
        country_code: formData.country_code?.trim() || null,
        short_code: formData.short_code?.trim().toUpperCase() || null,
        type: formData.type?.trim() || null,
        main_color: formData.main_color?.trim() || null
      };

      if (isCreating) {
        const { error } = await supabase
          .from('teams')
          .insert([teamData]);

        if (error) throw error;
        showMessage('success', 'Time criado com sucesso!');
      } else if (isEditing && selectedTeam) {
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', selectedTeam.id);

        if (error) throw error;
        showMessage('success', 'Time atualizado com sucesso!');
      }

      await loadTeams();
      resetForm();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao salvar time:', error);
      showMessage('error', 'Erro ao salvar time');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!confirm(`Tem certeza que deseja excluir o time "${team?.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      showMessage('success', 'Time excluído com sucesso!');
      if (selectedTeam?.id === teamId) {
        resetForm();
      }
      await loadTeams();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao excluir time:', error);
      showMessage('error', 'Erro ao excluir time');
    }
  };

  // Função para baixar o modelo CSV
  const downloadCSVTemplate = () => {
    const headers = ['name', 'logo_url', 'country_code', 'short_code', 'type', 'main_color'];
    
    const exampleRow = [
      'Seleção Brasileira',
      'https://example.com/brasil.png',
      'BR',
      'BRA',
      'Seleção',
      '#FFD700'
    ];
    
    let csvContent = headers.join(',') + '\n';
    csvContent += exampleRow.join(',') + '\n';
    csvContent += ',,,,\n';
    
    const instructions = [
      '\n# INSTRUÇÕES PARA IMPORTAÇÃO:',
      '# 1. Mantenha a ordem das colunas exatamente como está',
      '# 2. Colunas obrigatórias: name, logo_url',
      '# 3. country_code: Código do país (ex: BR, US, ENG) - 2 ou 3 letras',
      '# 4. short_code: Sigla do time (ex: BRA, FLA, PAL)',
      '# 5. type: Nacional, Clube, Seleção ou Outro',
      '# 6. main_color: Cor principal em HEX (ex: #FF0000)',
      '# 7. Não remova o cabeçalho da primeira linha'
    ];
    
    csvContent += instructions.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_times.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage('success', 'Modelo CSV baixado com sucesso!');
  };

  // Função para importar CSV com validação de duplicatas
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      
      const dataLines = lines.filter(line => 
        line.trim() !== '' && 
        !line.trim().startsWith('#') &&
        !line.trim().startsWith('INSTRUÇÕES')
      );

      if (dataLines.length < 2) {
        throw new Error('Arquivo vazio ou formato inválido. O arquivo deve ter um cabeçalho e pelo menos uma linha de dados.');
      }

      const headers = dataLines[0].split(',').map(h => h.trim().toLowerCase());
      
      const requiredFields = ['name', 'logo_url'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      
      if (missingFields.length > 0) {
        throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}. Use o modelo disponível para download.`);
      }

      const teamsToImport: any[] = [];
      const errors: string[] = [];

      const existingTeamNames = new Map<string, number>();
      const existingTeamShortCodes = new Map<string, number>();
      
      teams.forEach(team => {
        if (team.name) {
          existingTeamNames.set(team.name.toLowerCase().trim(), team.id);
        }
        if (team.short_code) {
          existingTeamShortCodes.set(team.short_code.toLowerCase().trim(), team.id);
        }
      });

      const csvTeamNames = new Map<string, number>();

      for (let i = 1; i < dataLines.length; i++) {
        const values = dataLines[i].split(',').map(v => v.trim());
        
        if (values.length < headers.length) {
          while (values.length < headers.length) {
            values.push('');
          }
        }

        const teamData: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || '';
          teamData[header] = value === '' ? null : value;
        });

        if (!teamData.name || teamData.name === '') {
          errors.push(`Linha ${i + 1}: Nome do time é obrigatório`);
          continue;
        }

        if (!teamData.logo_url || teamData.logo_url === '') {
          errors.push(`Linha ${i + 1}: URL do logo é obrigatória`);
          continue;
        }

        const normalizedName = teamData.name.toLowerCase().trim();
        if (csvTeamNames.has(normalizedName)) {
          const firstLine = csvTeamNames.get(normalizedName);
          errors.push(`Linha ${i + 1}: Time "${teamData.name}" já foi encontrado na linha ${firstLine}. Remova a duplicata.`);
          continue;
        }
        csvTeamNames.set(normalizedName, i + 1);

        if (existingTeamNames.has(normalizedName)) {
          const existingTeamId = existingTeamNames.get(normalizedName);
          const existingTeam = teams.find(t => t.id === existingTeamId);
          errors.push(`Linha ${i + 1}: Time "${teamData.name}" já existe no banco (ID: ${existingTeamId}). Atualize o existente ou remova do CSV.`);
          continue;
        }

        if (teamData.short_code) {
          const normalizedShortCode = teamData.short_code.toUpperCase().trim();
          if (existingTeamShortCodes.has(normalizedShortCode)) {
            const existingTeamId = existingTeamShortCodes.get(normalizedShortCode);
            const existingTeam = teams.find(t => t.id === existingTeamId);
            errors.push(`Linha ${i + 1}: Sigla "${teamData.short_code}" já está em uso pelo time "${existingTeam?.name}" (ID: ${existingTeamId}).`);
            continue;
          }
        }

        if (teamData.short_code) {
          teamData.short_code = teamData.short_code.toUpperCase();
        }

        if (teamData.country_code) {
          teamData.country_code = teamData.country_code.toUpperCase();
        }

        if (teamData.type && !teamTypes.includes(teamData.type)) {
          errors.push(`Linha ${i + 1}: Tipo "${teamData.type}" inválido. Use: ${teamTypes.join(', ')}`);
          continue;
        }

        teamsToImport.push(teamData);
      }

      if (errors.length > 0) {
        const errorMessage = `Encontramos ${errors.length} erro(s) no arquivo:\n\n${errors.join('\n')}\n\nPor favor, corrija os erros e tente novamente.`;
        throw new Error(errorMessage);
      }

      if (teamsToImport.length === 0) {
        throw new Error('Nenhum dado válido para importar. Verifique se o arquivo tem dados novos.');
      }

      let summaryMessage = `📊 RESUMO DA IMPORTAÇÃO:\n\n`;
      summaryMessage += `✅ Times válidos para importar: ${teamsToImport.length}\n`;
      summaryMessage += `❌ Erros encontrados: ${errors.length}\n\n`;
      summaryMessage += `Times a serem importados:\n${teamsToImport.map((t, idx) => `  ${idx + 1}. ${t.name}${t.short_code ? ` (${t.short_code})` : ''}`).join('\n')}`;
      
      if (!confirm(`${summaryMessage}\n\nDeseja continuar com a importação?`)) {
        setImporting(false);
        return;
      }

      const { data, error } = await supabase
        .from('teams')
        .insert(teamsToImport)
        .select();

      if (error) throw error;

      const successMessage = `✅ Importação concluída com sucesso!\n\n` +
        `📥 Times importados: ${teamsToImport.length}\n` +
        `📊 Total de times no banco: ${teams.length + teamsToImport.length}`;
      
      showMessage('success', successMessage);
      await loadTeams();
      if (onUpdate) onUpdate();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Erro ao importar CSV:', error);
      showMessage('error', `❌ Erro na importação:\n\n${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const renderForm = () => {
    if (!isCreating && !isEditing) return null;

    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-blue-500/30 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-bold flex items-center gap-2">
            {isCreating ? (
              <>
                <Plus size={20} className="text-blue-400" />
                Criar Novo Time
              </>
            ) : (
              <>
                <Edit2 size={20} className="text-yellow-400" />
                Editar Time
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
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">
              Nome do Time *
            </label>
            <input
              type="text"
              placeholder="Ex: Seleção Brasileira"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">
              URL do Logo *
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="https://exemplo.com/logo.png"
                value={formData.logo_url || ''}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
              {formData.logo_url && (
                <div className="w-12 h-12 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                  <img 
                    src={formData.logo_url} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Error&background=1e293b&color=cbd5e1&bold=true';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Sigla
            </label>
            <input
              type="text"
              placeholder="Ex: BRA"
              value={formData.short_code || ''}
              onChange={(e) => setFormData({ ...formData, short_code: e.target.value.toUpperCase() })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none uppercase"
              maxLength={4}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Código do País
            </label>
            <input
              type="text"
              placeholder="Ex: BR"
              value={formData.country_code || ''}
              onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none uppercase"
              maxLength={3}
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Tipo
            </label>
            <select
              value={formData.type || ''}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecione o tipo</option>
              {teamTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Cor Principal
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={formData.main_color || '#000000'}
                onChange={(e) => setFormData({ ...formData, main_color: e.target.value })}
                className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer p-1"
              />
              <input
                type="text"
                placeholder="#000000"
                value={formData.main_color || ''}
                onChange={(e) => setFormData({ ...formData, main_color: e.target.value })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                {isCreating ? 'Criar Time' : 'Atualizar Time'}
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
    );
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
            : message.type === 'error'
            ? 'bg-red-500/20 text-red-400 border border-red-500/20'
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} className="flex-shrink-0 mt-0.5" /> : 
           message.type === 'error' ? <XCircle size={20} className="flex-shrink-0 mt-0.5" /> : 
           <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
          <span className="whitespace-pre-line text-sm">{message.text}</span>
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
                  {filteredTeams.length}
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
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          {/* Botão Importar CSV */}
          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold flex items-center gap-2 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Importar CSV
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
          </div>

          {/* Botão Baixar Modelo */}
          <button
            onClick={downloadCSVTemplate}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Download size={16} />
            Baixar Modelo
          </button>

          <button
            onClick={handleCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus size={16} />
            Novo Time
          </button>
          <button
            onClick={loadTeams}
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
              {filteredTeams.length} {filteredTeams.length === 1 ? 'time encontrado' : 'times encontrados'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Nome do Time
              </label>
              <input
                type="text"
                placeholder="Digite o nome..."
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Sigla
              </label>
              <input
                type="text"
                placeholder="Ex: BRA"
                value={filters.short_code}
                onChange={(e) => setFilters({ ...filters, short_code: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Código do País
              </label>
              <input
                type="text"
                placeholder="Ex: BR"
                value={filters.country_code}
                onChange={(e) => setFilters({ ...filters, country_code: e.target.value.toUpperCase() })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none uppercase"
                maxLength={3}
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos os tipos</option>
                {teamTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Cor Principal
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={filters.main_color || '#000000'}
                  onChange={(e) => setFilters({ ...filters, main_color: e.target.value })}
                  className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer p-1 flex-shrink-0"
                />
                <input
                  type="text"
                  placeholder="#000000"
                  value={filters.main_color || ''}
                  onChange={(e) => setFilters({ ...filters, main_color: e.target.value })}
                  className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
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

      {/* Formulário */}
      {renderForm()}

      {/* Lista de Times */}
      <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold">
              Times Cadastrados
            </h4>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredTeams.length} {filteredTeams.length === 1 ? 'time' : 'times'})
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
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              Carregando times...
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {hasActiveFilters() ? (
                <>
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum time encontrado com os filtros selecionados</p>
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
                  <FolderOpen size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum time cadastrado</p>
                  <p className="text-sm mt-1">Clique em "Novo Time" ou "Importar CSV" para começar</p>
                </>
              )}
            </div>
          ) : (
            filteredTeams.map((team) => {
              const isSelected = selectedTeam?.id === team.id;
              
              return (
                <div 
                  key={team.id} 
                  className={`p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectTeam(team)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                      {team.logo_url ? (
                        <img 
                          src={team.logo_url} 
                          alt={team.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(team.name) + '&background=1e293b&color=cbd5e1&bold=true';
                          }}
                        />
                      ) : (
                        <ImageIcon size={16} className="text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{team.name}</span>
                        {team.short_code && (
                          <span className="text-xs font-mono text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                            {team.short_code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        {team.country_code && (
                          <span className="flex items-center gap-1">
                            <Globe size={12} />
                            {team.country_code}
                          </span>
                        )}
                        {team.type && (
                          <span className="flex items-center gap-1">
                            <Tag size={12} />
                            {team.type}
                          </span>
                        )}
                        {team.main_color && (
                          <span className="flex items-center gap-1">
                            <Palette size={12} />
                            <span 
                              className="w-3 h-3 rounded-full border border-slate-600"
                              style={{ backgroundColor: team.main_color }}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!isCreating && !isEditing && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTeam(team);
                            handleEdit();
                          }}
                          className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                          title="Editar time"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(team.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Excluir time"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}