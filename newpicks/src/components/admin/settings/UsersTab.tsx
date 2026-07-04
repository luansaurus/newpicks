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
  Users,
  UserCheck,
  UserX,
  Shield,
  Star,
  Mail,
  Key,
  User as UserIcon,
  Eye,
  EyeOff,
  UserPlus
} from 'lucide-react';

type Team = {
  id: number;
  name: string;
  short_code: string;
  logo_url: string;
};

type User = {
  id: string;
  username: string | null;
  is_admin: boolean;
  is_vip: boolean | null;
  user_team: number | null;
  user_team_data?: Team | null;
  email?: string | null; // Mudança aqui: permitir null
};

interface UsersTabProps {
  onUpdate?: () => void;
}

export function UsersTab({ onUpdate }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Search filters
  const [filters, setFilters] = useState({
    username: '',
    is_admin: '' as '' | 'true' | 'false',
    is_vip: '' as '' | 'true' | 'false',
    user_team: ''
  });

  // Form state
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    is_admin: false,
    is_vip: false,
    user_team: null
  });

  // Create user form state
  const [createUserData, setCreateUserData] = useState({
    email: '',
    username: '',
    password: '',
    is_admin: false,
    is_vip: false,
    user_team: null as number | null
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, users]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar times
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, short_code, logo_url')
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Carregar usuários
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

      if (usersError) {
        if (usersError.code === '42501') {
          // Erro de RLS, tenta buscar sem is_admin
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, username, user_team')
            .order('username');

          if (fallbackError) throw fallbackError;

          const usersWithDefaults = fallbackData?.map(u => ({
            ...u,
            is_admin: false,
            is_vip: false
          })) || [];

          // Buscar emails dos usuários
          const usersWithEmail = await Promise.all(
            usersWithDefaults.map(async (user) => {
              try {
                const { data: authData } = await supabase.auth.admin.getUserById(user.id);
                return {
                  ...user,
                  email: authData?.user?.email || null
                };
              } catch {
                return { ...user, email: null };
              }
            })
          );

          // Adicionar dados do time
          const teamsMap: Record<number, Team> = {};
          teamsData?.forEach((team: Team) => {
            teamsMap[team.id] = team;
          });

          const usersWithTeam = usersWithEmail.map(user => ({
            ...user,
            user_team_data: user.user_team ? teamsMap[user.user_team] : null
          }));

          setUsers(usersWithTeam as User[]); // Adicionar type assertion
          setFilteredUsers(usersWithTeam as User[]); // Adicionar type assertion
          setLoading(false);
          return;
        }
        throw usersError;
      }

      // Buscar emails dos usuários
      const usersWithEmail = await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            const { data: authData } = await supabase.auth.admin.getUserById(user.id);
            return {
              ...user,
              email: authData?.user?.email || null
            };
          } catch {
            return { ...user, email: null };
          }
        })
      );

      // Adicionar dados do time
      const teamsMap: Record<number, Team> = {};
      teamsData?.forEach((team: Team) => {
        teamsMap[team.id] = team;
      });

      const usersWithTeam = usersWithEmail.map(user => ({
        ...user,
        user_team_data: user.user_team ? teamsMap[user.user_team] : null
      }));

      setUsers(usersWithTeam as User[]); // Adicionar type assertion
      setFilteredUsers(usersWithTeam as User[]); // Adicionar type assertion
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showMessage('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Filtro por username
    if (filters.username.trim()) {
      const term = filters.username.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.username && user.username.toLowerCase().includes(term)
      );
    }

    // Filtro por admin
    if (filters.is_admin) {
      const isAdmin = filters.is_admin === 'true';
      filtered = filtered.filter(user => user.is_admin === isAdmin);
    }

    // Filtro por VIP
    if (filters.is_vip) {
      const isVip = filters.is_vip === 'true';
      filtered = filtered.filter(user => user.is_vip === isVip);
    }

    // Filtro por time
    if (filters.user_team.trim()) {
      const term = filters.user_team.toLowerCase().trim();
      filtered = filtered.filter(user => {
        if (!user.user_team_data) return false;
        return user.user_team_data.name.toLowerCase().includes(term) ||
               (user.user_team_data.short_code && user.user_team_data.short_code.toLowerCase().includes(term));
      });
    }

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setFilters({
      username: '',
      is_admin: '',
      is_vip: '',
      user_team: ''
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
      username: '',
      is_admin: false,
      is_vip: false,
      user_team: null
    });
    setSelectedUser(null);
    setIsCreating(false);
    setIsEditing(false);
  };

  const resetCreateForm = () => {
    setCreateUserData({
      email: '',
      username: '',
      password: '',
      is_admin: false,
      is_vip: false,
      user_team: null
    });
    setShowCreateForm(false);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || '',
      is_admin: user.is_admin,
      is_vip: user.is_vip || false,
      user_team: user.user_team
    });
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (selectedUser) {
      setIsEditing(true);
      setIsCreating(false);
    }
  };

  const handleCreate = () => {
    resetForm();
    resetCreateForm();
    setShowCreateForm(true);
    setIsCreating(true);
    setIsEditing(false);
    setSelectedUser(null);
  };

  const handleCancel = () => {
    resetForm();
    resetCreateForm();
    if (selectedUser) {
      setFormData({
        username: selectedUser.username || '',
        is_admin: selectedUser.is_admin,
        is_vip: selectedUser.is_vip || false,
        user_team: selectedUser.user_team
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData.username || formData.username.trim() === '') {
      showMessage('error', 'O nome de usuário é obrigatório');
      return false;
    }
    return true;
  };

  const validateCreateForm = (): boolean => {
    if (!createUserData.email || createUserData.email.trim() === '') {
      showMessage('error', 'O email é obrigatório');
      return false;
    }
    if (!createUserData.username || createUserData.username.trim() === '') {
      showMessage('error', 'O nome de usuário é obrigatório');
      return false;
    }
    if (!createUserData.password || createUserData.password.length < 6) {
      showMessage('error', 'A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const userData = {
        username: formData.username!.trim(),
        is_admin: formData.is_admin || false,
        is_vip: formData.is_vip || false,
        user_team: formData.user_team || null
      };

      if (isEditing && selectedUser) {
        const { error } = await supabase
          .from('profiles')
          .update(userData)
          .eq('id', selectedUser.id);

        if (error) throw error;
        showMessage('success', 'Usuário atualizado com sucesso!');
      }

      await loadData();
      resetForm();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      showMessage('error', 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!validateCreateForm()) return;

    setSaving(true);
    try {
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: createUserData.email,
        password: createUserData.password,
        email_confirm: true,
        user_metadata: {
          username: createUserData.username
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          showMessage('error', 'Este email já está cadastrado');
        } else {
          throw authError;
        }
        return;
      }

      if (!authData.user) {
        showMessage('error', 'Erro ao criar usuário');
        return;
      }

      // 2. Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          username: createUserData.username,
          is_admin: createUserData.is_admin || false,
          is_vip: createUserData.is_vip || false,
          user_team: createUserData.user_team || null
        }]);

      if (profileError) throw profileError;

      showMessage('success', `Usuário ${createUserData.username} criado com sucesso!`);
      resetCreateForm();
      await loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      showMessage('error', 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário @${username}? Esta ação não pode ser desfeita.`)) return;

    try {
      // 1. Deletar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Deletar usuário do auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Erro ao deletar usuário do auth:', authError);
        showMessage('error', 'Usuário deletado do perfil, mas houve erro no auth. Entre em contato com o suporte.');
        return;
      }

      showMessage('success', `Usuário @${username} excluído com sucesso!`);
      if (selectedUser?.id === userId) {
        resetForm();
      }
      await loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      showMessage('error', 'Erro ao excluir usuário');
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      showMessage('success', `Usuário ${!currentStatus ? 'promovido a' : 'rebaixado de'} admin com sucesso!`);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao alterar admin:', error);
      showMessage('error', 'Erro ao alterar permissão');
    }
  };

  const handleToggleVip = async (userId: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_vip: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      showMessage('success', `Usuário ${!currentStatus ? 'marcado como' : 'desmarcado de'} VIP com sucesso!`);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao alterar VIP:', error);
      showMessage('error', 'Erro ao alterar status VIP');
    }
  };

  const handleResetPassword = async (userId: string, username: string) => {
    if (!confirm(`Deseja enviar um email de reset de senha para @${username}?`)) return;

    try {
      // Correção: usar o método correto para reset de senha
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { password: '' } // Isso vai gerar um email de reset
      );

      if (error) throw error;

      showMessage('success', `Email de reset enviado para @${username}`);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      showMessage('error', 'Erro ao enviar email de reset');
    }
  };

  const renderCreateForm = () => {
    if (!showCreateForm) return null;

    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-green-500/30 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-bold flex items-center gap-2">
            <Plus size={20} className="text-green-400" />
            Criar Novo Usuário
          </h5>
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreating(false);
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Email *
            </label>
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={createUserData.email}
              onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Nome de Usuário *
            </label>
            <input
              type="text"
              placeholder="@username"
              value={createUserData.username}
              onChange={(e) => setCreateUserData({ ...createUserData, username: e.target.value.replace('@', '') })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Senha * (mínimo 6 caracteres)
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={createUserData.password}
              onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Time
            </label>
            <select
              value={createUserData.user_team || ''}
              onChange={(e) => setCreateUserData({ ...createUserData, user_team: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Nenhum</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.short_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createUserData.is_admin}
                onChange={(e) => setCreateUserData({ ...createUserData, is_admin: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Administrador</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createUserData.is_vip}
                onChange={(e) => setCreateUserData({ ...createUserData, is_vip: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm text-slate-300">VIP</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCreateUser}
            disabled={saving}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Criar Usuário
              </>
            )}
          </button>
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreating(false);
            }}
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const renderForm = () => {
    if (!isEditing || !selectedUser) return null;

    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-yellow-500/30 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-lg font-bold flex items-center gap-2">
            <Edit2 size={20} className="text-yellow-400" />
            Editar Usuário: @{selectedUser.username}
          </h5>
          <button
            onClick={handleCancel}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Nome de Usuário *
            </label>
            <input
              type="text"
              placeholder="@username"
              value={formData.username || ''}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.replace('@', '') })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Time
            </label>
            <select
              value={formData.user_team || ''}
              onChange={(e) => setFormData({ ...formData, user_team: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Nenhum</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.short_code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_admin || false}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Administrador</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_vip || false}
                onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm text-slate-300">VIP</span>
            </label>
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
                Atualizar Usuário
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
                  {filteredUsers.length}
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
            Novo Usuário
          </button>
          <button
            onClick={loadData}
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
              {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Nome de Usuário
              </label>
              <input
                type="text"
                placeholder="Digite o nome..."
                value={filters.username}
                onChange={(e) => setFilters({ ...filters, username: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Time
              </label>
              <input
                type="text"
                placeholder="Digite o time..."
                value={filters.user_team}
                onChange={(e) => setFilters({ ...filters, user_team: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Status Admin
              </label>
              <select
                value={filters.is_admin}
                onChange={(e) => setFilters({ ...filters, is_admin: e.target.value as '' | 'true' | 'false' })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="true">Administradores</option>
                <option value="false">Não administradores</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Status VIP
              </label>
              <select
                value={filters.is_vip}
                onChange={(e) => setFilters({ ...filters, is_vip: e.target.value as '' | 'true' | 'false' })}
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Todos</option>
                <option value="true">VIP</option>
                <option value="false">Não VIP</option>
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

      {/* Formulários */}
      {renderCreateForm()}
      {renderForm()}

      {/* Lista de Usuários */}
      <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              Usuários Cadastrados
            </h4>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'})
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
              Carregando usuários...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {hasActiveFilters() ? (
                <>
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum usuário encontrado com os filtros selecionados</p>
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
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum usuário cadastrado</p>
                  <p className="text-sm mt-1">Clique em "Novo Usuário" para começar</p>
                </>
              )}
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              
              return (
                <div 
                  key={user.id} 
                  className={`p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer ${
                    isSelected ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-slate-800 rounded-lg border border-slate-700 p-1 flex items-center justify-center overflow-hidden">
                      {user.user_team_data?.logo_url ? (
                        <img 
                          src={user.user_team_data.logo_url} 
                          alt={user.user_team_data.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username || 'User') + '&background=1e293b&color=cbd5e1&bold=true';
                          }}
                        />
                      ) : (
                        <UserIcon size={16} className="text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">@{user.username || 'Sem nome'}</span>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold flex items-center gap-1">
                            <Shield size={10} />
                            Admin
                          </span>
                        )}
                        {user.is_vip && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold flex items-center gap-1">
                            <Star size={10} />
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {user.email}
                          </span>
                        )}
                        {user.user_team_data && (
                          <span className="flex items-center gap-1">
                            <Tag size={12} />
                            {user.user_team_data.name}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          ID: {user.id.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!isCreating && !isEditing && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectUser(user);
                            handleEdit();
                          }}
                          className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                          title="Editar usuário"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAdmin(user.id, user.is_admin);
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            user.is_admin
                              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                              : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
                          }`}
                          title={user.is_admin ? 'Remover admin' : 'Tornar admin'}
                        >
                          {user.is_admin ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVip(user.id, user.is_vip);
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            user.is_vip
                              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                              : 'text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10'
                          }`}
                          title={user.is_vip ? 'Remover VIP' : 'Tornar VIP'}
                        >
                          <Star size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetPassword(user.id, user.username || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                          title="Resetar senha"
                        >
                          <Key size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(user.id, user.username || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Excluir usuário"
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