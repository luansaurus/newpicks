'use client';

import { useState, useEffect } from 'react';
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
  Hash,
  Globe,
  Tag,
  FolderOpen,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trophy,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Paintbrush,
  Calendar
} from 'lucide-react';

type Competition = {
  id: number;
  name: string;
  slug: string;
  theme_primary: string;
  theme_secondary: string;
  theme_final: string | null;
  is_active: boolean;
  competition_logo: string | null;
  start_date: string | null;
  end_date: string | null;
};

interface CompetitionsTabProps {
  onUpdate?: () => void;
}

export function CompetitionsTab({ onUpdate }: CompetitionsTabProps) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [filteredCompetitions, setFilteredCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Search filters
  const [filters, setFilters] = useState({
    name: '',
    slug: '',
    is_active: '' as '' | 'true' | 'false'
  });

  // Form state
  const [formData, setFormData] = useState<Partial<Competition>>({
    name: '',
    slug: '',
    theme_primary: '#e11d48',
    theme_secondary: '#000000',
    theme_final: null,
    is_active: true,
    competition_logo: null,
    start_date: null,
    end_date: null
  });

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, competitions]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCompetitions(data || []);
      setFilteredCompetitions(data || []);
    } catch (error) {
      console.error('Erro ao carregar competições:', error);
      showMessage('error', 'Erro ao carregar competições');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...competitions];

    // Filtro por nome
    if (filters.name.trim()) {
      const term = filters.name.toLowerCase().trim();
      filtered = filtered.filter(comp => 
        comp.name.toLowerCase().includes(term)
      );
    }

    // Filtro por slug
    if (filters.slug.trim()) {
      const term = filters.slug.toLowerCase().trim();
      filtered = filtered.filter(comp => 
        comp.slug.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (filters.is_active) {
      const isActive = filters.is_active === 'true';
      filtered = filtered.filter(comp => comp.is_active === isActive);
    }

    setFilteredCompetitions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      slug: '',
      is_active: ''
    });
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value && value.trim() !== '');
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      theme_primary: '#e11d48',
      theme_secondary: '#000000',
      theme_final: null,
      is_active: true,
      competition_logo: null,
      start_date: null,
      end_date: null
    });
    setSelectedCompetition(null);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleSelectCompetition = (comp: Competition) => {
    setSelectedCompetition(comp);
    setFormData({
      name: comp.name,
      slug: comp.slug,
      theme_primary: comp.theme_primary,
      theme_secondary: comp.theme_secondary,
      theme_final: comp.theme_final,
      is_active: comp.is_active,
      competition_logo: comp.competition_logo,
      start_date: comp.start_date,
      end_date: comp.end_date
    });
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (selectedCompetition) {
      setIsEditing(true);
      setIsCreating(false);
    }
  };

  const handleCreate = () => {
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
    setSelectedCompetition(null);
  };

  const handleCancel = () => {
    resetForm();
    if (selectedCompetition) {
      setFormData({
        name: selectedCompetition.name,
        slug: selectedCompetition.slug,
        theme_primary: selectedCompetition.theme_primary,
        theme_secondary: selectedCompetition.theme_secondary,
        theme_final: selectedCompetition.theme_final,
        is_active: selectedCompetition.is_active,
        competition_logo: selectedCompetition.competition_logo,
        start_date: selectedCompetition.start_date,
        end_date: selectedCompetition.end_date
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const validateForm = (): boolean => {
    if (!formData.name || formData.name.trim() === '') {
      showMessage('error', 'O nome da competição é obrigatório');
      return false;
    }
    if (!formData.slug || formData.slug.trim() === '') {
      showMessage('error', 'O slug é obrigatório');
      return false;
    }
    if (!formData.theme_primary || formData.theme_primary.trim() === '') {
      showMessage('error', 'A cor primária é obrigatória');
      return false;
    }
    if (!formData.theme_secondary || formData.theme_secondary.trim() === '') {
      showMessage('error', 'A cor secundária é obrigatória');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const competitionData = {
        name: formData.name!.trim(),
        slug: formData.slug!.trim().toLowerCase().replace(/\s/g, '-'),
        theme_primary: formData.theme_primary!.trim(),
        theme_secondary: formData.theme_secondary!.trim(),
        theme_final: formData.theme_final?.trim() || null,
        is_active: formData.is_active !== undefined ? formData.is_active : true,
        competition_logo: formData.competition_logo?.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (isCreating) {
        const { error } = await supabase
          .from('competitions')
          .insert([competitionData]);

        if (error) {
          if (error.code === '23505') {
            showMessage('error', 'Já existe uma competição com este slug');
            return;
          }
          throw error;
        }
        showMessage('success', 'Competição criada com sucesso!');
      } else if (isEditing && selectedCompetition) {
        const { error } = await supabase
          .from('competitions')
          .update(competitionData)
          .eq('id', selectedCompetition.id);

        if (error) {
          if (error.code === '23505') {
            showMessage('error', 'Já existe uma competição com este slug');
            return;
          }
          throw error;
        }
        showMessage('success', 'Competição atualizada com sucesso!');
      }

      await loadCompetitions();
      resetForm();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao salvar competição:', error);
      showMessage('error', 'Erro ao salvar competição');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (compId: number) => {
    const comp = competitions.find(c => c.id === compId);
    if (!confirm(`Tem certeza que deseja excluir a competição "${comp?.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', compId);

      if (error) throw error;

      showMessage('success', 'Competição excluída com sucesso!');
      if (selectedCompetition?.id === compId) {
        resetForm();
      }
      await loadCompetitions();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao excluir competição:', error);
      showMessage('error', 'Erro ao excluir competição');
    }
  };

  const handleToggleActive = async (compId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ is_active: !currentStatus })
        .eq('id', compId);

      if (error) throw error;

      showMessage('success', `Competição ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
      await loadCompetitions();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showMessage('error', 'Erro ao alterar status');
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
                Criar Nova Competição
              </>
            ) : (
              <>
                <Edit2 size={20} className="text-yellow-400" />
                Editar Competição
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
          {/* Nome da Competição */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">
              Nome da Competição *
            </label>
            <input
              type="text"
              placeholder="Ex: Copa do Mundo"
              value={formData.name || ''}
              onChange={(e) => {
                const name = e.target.value;
                setFormData({ 
                  ...formData, 
                  name,
                  slug: isCreating ? generateSlug(name) : formData.slug
                });
              }}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">
              Slug * (identificador único para URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: copa-do-mundo"
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none lowercase"
              />
              {isCreating && formData.name && (
                <button
                  onClick={() => setFormData({ ...formData, slug: generateSlug(formData.name || '') })}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  Gerar
                </button>
              )}
            </div>
          </div>

          {/* Datas */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Data de Início
            </label>
            <input
              type="date"
              value={formData.start_date || ''}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Data de Término
            </label>
            <input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Logo da Competição */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">
              URL do Logo
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="https://exemplo.com/logo.png"
                value={formData.competition_logo || ''}
                onChange={(e) => setFormData({ ...formData, competition_logo: e.target.value })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
              {formData.competition_logo && (
                <div className="w-12 h-12 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                  <img 
                    src={formData.competition_logo} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Logo&background=1e293b&color=cbd5e1&bold=true';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cores */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Cor Primária *
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={formData.theme_primary || '#e11d48'}
                onChange={(e) => setFormData({ ...formData, theme_primary: e.target.value })}
                className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer p-1"
              />
              <input
                type="text"
                placeholder="#e11d48"
                value={formData.theme_primary || ''}
                onChange={(e) => setFormData({ ...formData, theme_primary: e.target.value })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Cor Secundária *
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={formData.theme_secondary || '#000000'}
                onChange={(e) => setFormData({ ...formData, theme_secondary: e.target.value })}
                className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer p-1"
              />
              <input
                type="text"
                placeholder="#000000"
                value={formData.theme_secondary || ''}
                onChange={(e) => setFormData({ ...formData, theme_secondary: e.target.value })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Cor Final (opcional) */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">
              Cor Final (opcional)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={formData.theme_final || '#000000'}
                onChange={(e) => setFormData({ ...formData, theme_final: e.target.value })}
                className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer p-1"
              />
              <input
                type="text"
                placeholder="#000000"
                value={formData.theme_final || ''}
                onChange={(e) => setFormData({ ...formData, theme_final: e.target.value })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">
                (opcional - usada apenas na final)
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active !== undefined ? formData.is_active : true}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Competição ativa</span>
              <span className="text-xs text-slate-400">
                (se desativada, não aparecerá para os usuários)
              </span>
            </label>
          </div>
        </div>

        {/* Preview das cores */}
        <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-700/50">
          <h6 className="text-xs text-slate-400 mb-2">Preview das Cores</h6>
          <div className="flex gap-4 items-center">
            <div 
              className="px-4 py-2 rounded-lg text-white font-bold text-sm"
              style={{ backgroundColor: formData.theme_primary || '#e11d48' }}
            >
              Primária
            </div>
            <div 
              className="px-4 py-2 rounded-lg text-white font-bold text-sm"
              style={{ backgroundColor: formData.theme_secondary || '#000000' }}
            >
              Secundária
            </div>
            {formData.theme_final && (
              <div 
                className="px-4 py-2 rounded-lg text-white font-bold text-sm"
                style={{ backgroundColor: formData.theme_final }}
              >
                Final
              </div>
            )}
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
                {isCreating ? 'Criar Competição' : 'Atualizar Competição'}
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
                  {filteredCompetitions.length}
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
            Nova Competição
          </button>
          <button
            onClick={loadCompetitions}
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
              {filteredCompetitions.length} {filteredCompetitions.length === 1 ? 'competição encontrada' : 'competições encontradas'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Nome da Competição
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
                Slug
              </label>
              <input
                type="text"
                placeholder="Ex: copa-do-mundo"
                value={filters.slug}
                onChange={(e) => setFilters({ ...filters, slug: e.target.value.toLowerCase() })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none lowercase"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Status
              </label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters({ ...filters, is_active: e.target.value as '' | 'true' | 'false' })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="true">Ativas</option>
                <option value="false">Inativas</option>
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

      {/* Formulário */}
      {renderForm()}

      {/* Lista de Competições */}
      <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              Competições Cadastradas
            </h4>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredCompetitions.length} {filteredCompetitions.length === 1 ? 'competição' : 'competições'})
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
              Carregando competições...
            </div>
          ) : filteredCompetitions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {hasActiveFilters() ? (
                <>
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma competição encontrada com os filtros selecionados</p>
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
                  <p className="font-medium">Nenhuma competição cadastrada</p>
                  <p className="text-sm mt-1">Clique em "Nova Competição" para começar</p>
                </>
              )}
            </div>
          ) : (
            filteredCompetitions.map((comp) => {
              const isSelected = selectedCompetition?.id === comp.id;
              
              return (
                <div 
                  key={comp.id} 
                  className={`p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectCompetition(comp)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                      {comp.competition_logo ? (
                        <img 
                          src={comp.competition_logo} 
                          alt={comp.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comp.name) + '&background=1e293b&color=cbd5e1&bold=true';
                          }}
                        />
                      ) : (
                        <Trophy size={16} className="text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{comp.name}</span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                          {comp.slug}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Paintbrush size={12} />
                          <span 
                            className="w-3 h-3 rounded-full border border-slate-600"
                            style={{ backgroundColor: comp.theme_primary }}
                          />
                          {comp.theme_primary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Paintbrush size={12} />
                          <span 
                            className="w-3 h-3 rounded-full border border-slate-600"
                            style={{ backgroundColor: comp.theme_secondary }}
                          />
                          {comp.theme_secondary}
                        </span>
                        {comp.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(comp.start_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {comp.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(comp.end_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {comp.is_active ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <Eye size={12} />
                            Ativa
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400">
                            <EyeOff size={12} />
                            Inativa
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
                            handleSelectCompetition(comp);
                            handleEdit();
                          }}
                          className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                          title="Editar competição"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleActive(comp.id, comp.is_active);
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            comp.is_active
                              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                              : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                          }`}
                          title={comp.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {comp.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(comp.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Excluir competição"
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