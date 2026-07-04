'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { 
  Users, 
  Shield, 
  Trophy, 
  Settings as SettingsIcon,
  Plus,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Users as UsersIcon,
  Award,
  Calendar,
  Clock,
  BarChart3,
  Database,
  Globe,
  Key,
  UserCheck,
  UserX,
  Mail
} from 'lucide-react';

type Team = {
  id: number;
  name: string;
  short_code: string;
  logo_url: string;
  main_color?: string;
};

type User = {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
};

type Competition = {
  id: number;
  name: string;
  slug: string;
  competition_logo?: string;
  theme_primary?: string;
  theme_secondary?: string;
  is_active: boolean;
};

type League = {
  id: number;
  name: string;
  competition_id: number;
  is_active: boolean;
};

interface SettingsManagerProps {
  matches: any[];
  onUpdate?: () => void;
}

export function SettingsManager({ matches, onUpdate }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'teams' | 'users' | 'rules' | 'competitions'>('stats');
  
  // Estados para times
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ name: '', short_code: '', logo_url: '' });
  const [teamLoading, setTeamLoading] = useState(false);
  
  // Estados para usuários
  const [users, setUsers] = useState<User[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    username: '',
    password: '',
    is_admin: false
  });
  const [userFormLoading, setUserFormLoading] = useState(false);
  
  // Estados para competições
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [newCompetition, setNewCompetition] = useState<Partial<Competition>>({ name: '', slug: '', is_active: true });
  
  // Estados para regras
  const [rules, setRules] = useState({
    points_correct_score: 10,
    points_correct_winner: 5,
    points_correct_draw: 3,
    penalty_bonus: 2,
    match_lock_minutes: 15
  });
  const [rulesLoading, setRulesLoading] = useState(false);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Carregar dados
  useEffect(() => {
    loadTeams();
    loadUsers();
    loadCompetitions();
    loadRules();
  }, []);

  // --- FUNÇÕES DE CARREGAMENTO ---
  
  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Erro ao carregar times:', error);
        throw error;
      }
      setTeams(data || []);
    } catch (error) {
      console.error('Erro ao carregar times:', error);
      showMessage('error', 'Erro ao carregar times');
    }
  };

  const loadUsers = async () => {
    setUserLoading(true);
    setUserError(null);
    
    try {
      console.log('🔍 Buscando usuários...');
      
      const result = await supabase
        .from('profiles')
        .select('id, username, is_admin, created_at')
        .order('username');
      
      if (result.error) {
        console.warn('⚠️ Erro na busca de usuários:', result.error);
        
        if (result.error.code === '42501' || 
            result.error.message?.toLowerCase().includes('policy') || 
            result.error.message?.toLowerCase().includes('permission')) {
          
          console.log('🔄 Tentando fallback sem is_admin...');
          
          const fallbackResult = await supabase
            .from('profiles')
            .select('id, username, created_at')
            .order('username');
          
          if (fallbackResult.error) {
            console.error('❌ Erro no fallback:', fallbackResult.error);
            setUserError('Não foi possível carregar usuários');
            setUsers([]);
            return;
          }
          
          setUsers(fallbackResult.data?.map(u => ({ ...u, is_admin: false })) || []);
          showMessage('info', 'Usuários carregados em modo limitado');
          return;
        }
        
        throw result.error;
      }
      
      setUsers(result.data || []);
      console.log('✅ Usuários carregados:', result.data?.length);
    } catch (error) {
      let errorMessage = 'Erro desconhecido';
      if (error && typeof error === 'object') {
        errorMessage = (error as any).message || (error as any).code || JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('❌ Erro ao carregar usuários:', errorMessage);
      setUserError(errorMessage);
      setUsers([]);
      showMessage('error', 'Erro ao carregar usuários');
    } finally {
      setUserLoading(false);
    }
  };

  const loadCompetitions = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCompetitions(data || []);
      
      const { data: leaguesData, error: leaguesError } = await supabase
        .from('leagues')
        .select('*');
      
      if (!leaguesError) {
        setLeagues(leaguesData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar competições:', error);
      showMessage('error', 'Erro ao carregar competições');
    }
  };

  const loadRules = async () => {
    setRulesLoading(true);
    try {
      console.log('🔍 Buscando regras...');
      
      const checkResult = await supabase
        .from('settings')
        .select('id')
        .limit(1);
      
      if (checkResult.error && checkResult.error.code === '42P01') {
        console.log('📋 Tabela settings não existe, usando valores padrão');
        setRules({
          points_correct_score: 10,
          points_correct_winner: 5,
          points_correct_draw: 3,
          penalty_bonus: 2,
          match_lock_minutes: 15
        });
        setRulesLoading(false);
        return;
      }

      const rulesResult = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();
      
      if (rulesResult.error) {
        console.warn('⚠️ Erro ao buscar regras:', rulesResult.error);
        
        if (rulesResult.error.code === '42501' || 
            rulesResult.error.message?.toLowerCase().includes('policy') || 
            rulesResult.error.message?.toLowerCase().includes('permission')) {
          console.log('🔄 Erro de RLS na tabela settings, usando valores padrão');
          setRules({
            points_correct_score: 10,
            points_correct_winner: 5,
            points_correct_draw: 3,
            penalty_bonus: 2,
            match_lock_minutes: 15
          });
          setRulesLoading(false);
          return;
        }
        throw rulesResult.error;
      }
      
      if (rulesResult.data) {
        setRules({
          points_correct_score: rulesResult.data.points_correct_score || 10,
          points_correct_winner: rulesResult.data.points_correct_winner || 5,
          points_correct_draw: rulesResult.data.points_correct_draw || 3,
          penalty_bonus: rulesResult.data.penalty_bonus || 2,
          match_lock_minutes: rulesResult.data.match_lock_minutes || 15
        });
        console.log('✅ Regras carregadas:', rulesResult.data);
      } else {
        console.log('📋 Nenhuma regra encontrada, usando valores padrão');
      }
    } catch (error) {
      let errorMessage = 'Erro desconhecido';
      if (error && typeof error === 'object') {
        errorMessage = (error as any).message || (error as any).code || JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('❌ Erro ao carregar regras:', errorMessage);
      
      setRules({
        points_correct_score: 10,
        points_correct_winner: 5,
        points_correct_draw: 3,
        penalty_bonus: 2,
        match_lock_minutes: 15
      });
    } finally {
      setRulesLoading(false);
    }
  };

  // --- FUNÇÕES DE MENSAGEM ---
  
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // --- FUNÇÕES DE TIMES ---
  
  const handleAddTeam = async () => {
    if (!newTeam.name || !newTeam.short_code) {
      showMessage('error', 'Preencha nome e sigla do time');
      return;
    }
    
    setTeamLoading(true);
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: newTeam.name,
          short_code: newTeam.short_code.toUpperCase(),
          logo_url: newTeam.logo_url || null,
          main_color: newTeam.main_color || null
        }])
        .select();
      
      if (error) throw error;
      
      showMessage('success', 'Time adicionado com sucesso!');
      setNewTeam({ name: '', short_code: '', logo_url: '' });
      await loadTeams();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar time:', error);
      showMessage('error', 'Erro ao adicionar time');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    
    setTeamLoading(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: editingTeam.name,
          short_code: editingTeam.short_code.toUpperCase(),
          logo_url: editingTeam.logo_url,
          main_color: editingTeam.main_color
        })
        .eq('id', editingTeam.id);
      
      if (error) throw error;
      
      showMessage('success', 'Time atualizado com sucesso!');
      setEditingTeam(null);
      await loadTeams();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao atualizar time:', error);
      showMessage('error', 'Erro ao atualizar time');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('Tem certeza que deseja excluir este time?')) return;
    
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      
      showMessage('success', 'Time excluído com sucesso!');
      await loadTeams();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Erro ao excluir time:', error);
      showMessage('error', 'Erro ao excluir time');
    }
  };

  // --- FUNÇÕES DE USUÁRIOS ---
  
  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.username || !newUserData.password) {
      showMessage('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    setUserFormLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUserData.email,
        password: newUserData.password,
        email_confirm: true,
        user_metadata: {
          username: newUserData.username
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

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          username: newUserData.username,
          is_admin: newUserData.is_admin
        }]);

      if (profileError) throw profileError;

      showMessage('success', `Usuário ${newUserData.username} criado com sucesso!`);
      setShowCreateUser(false);
      setNewUserData({ email: '', username: '', password: '', is_admin: false });
      await loadUsers();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      showMessage('error', 'Erro ao criar usuário');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setUserFormLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editingUser.username,
          is_admin: editingUser.is_admin
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      showMessage('success', 'Usuário atualizado com sucesso!');
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      showMessage('error', 'Erro ao atualizar usuário');
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário @${username}? Esta ação não pode ser desfeita.`)) return;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Erro ao deletar usuário do auth:', authError);
        showMessage('error', 'Usuário deletado do perfil, mas houve erro no auth. Entre em contato com o suporte.');
        return;
      }

      showMessage('success', `Usuário @${username} excluído com sucesso!`);
      await loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      showMessage('error', 'Erro ao excluir usuário');
    }
  };

  const handleToggleAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showMessage('error', 'Sessão expirada');
        return;
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (profileError || !currentProfile?.is_admin) {
        showMessage('error', 'Você não tem permissão para alterar admins');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !isAdmin })
        .eq('id', userId);
      
      if (error) {
        if (error.code === '42501') {
          showMessage('error', 'Erro de permissão (RLS)');
          return;
        }
        throw error;
      }
      
      showMessage('success', `Usuário ${!isAdmin ? 'promovido' : 'rebaixado'} com sucesso!`);
      await loadUsers();
    } catch (error) {
      console.error('Erro ao alterar admin:', error);
      showMessage('error', 'Erro ao alterar permissão');
    }
  };

  const handleResetPassword = async (userId: string, username: string) => {
    if (!confirm(`Deseja enviar um email de reset de senha para @${username}?`)) return;

    try {
      const { error } = await supabase.auth.admin.resetPasswordForEmail(
        userId,
        { redirectTo: `${window.location.origin}/reset-password` }
      );

      if (error) throw error;

      showMessage('success', `Email de reset enviado para @${username}`);
    } catch (error) {
      console.error('Erro ao resetar senha:', error);
      showMessage('error', 'Erro ao enviar email de reset');
    }
  };

  // --- FUNÇÕES DE COMPETIÇÕES ---
  
  const handleAddCompetition = async () => {
    if (!newCompetition.name || !newCompetition.slug) {
      showMessage('error', 'Preencha nome e slug da competição');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('competitions')
        .insert([{
          name: newCompetition.name,
          slug: newCompetition.slug.toLowerCase().replace(/\s/g, '-'),
          competition_logo: newCompetition.competition_logo || null,
          theme_primary: newCompetition.theme_primary || '#e11d48',
          theme_secondary: newCompetition.theme_secondary || '#000000',
          is_active: newCompetition.is_active !== undefined ? newCompetition.is_active : true
        }])
        .select();
      
      if (error) throw error;
      
      showMessage('success', 'Competição adicionada com sucesso!');
      setNewCompetition({ name: '', slug: '', is_active: true });
      await loadCompetitions();
    } catch (error) {
      console.error('Erro ao adicionar competição:', error);
      showMessage('error', 'Erro ao adicionar competição');
    }
  };

  // --- FUNÇÕES DE REGRAS ---
  
  const handleSaveRules = async () => {
    try {
      const checkResult = await supabase
        .from('settings')
        .select('id')
        .limit(1);
      
      if (checkResult.error && checkResult.error.code === '42P01') {
        showMessage('error', 'Tabela settings não existe.');
        return;
      }

      const { error } = await supabase
        .from('settings')
        .upsert([{
          id: 1,
          ...rules
        }]);
      
      if (error) {
        if (error.code === '42501') {
          showMessage('error', 'Erro de permissão (RLS)');
          return;
        }
        throw error;
      }
      
      showMessage('success', 'Regras salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar regras:', error);
      showMessage('error', 'Erro ao salvar regras');
    }
  };

  // --- ESTATÍSTICAS ---
  
  const stats = useMemo(() => {
    const totalMatches = matches.length;
    const finishedMatches = matches.filter(m => m.status === 'FT' || m.status === 'FINISHED').length;
    const totalUsers = users.length;
    const totalAdmins = users.filter(u => u.is_admin).length;
    const totalTeams = teams.length;
    const totalCompetitions = competitions.length;
    const totalLeagues = leagues.length;
    
    return {
      totalMatches,
      finishedMatches,
      pendingMatches: totalMatches - finishedMatches,
      totalUsers,
      totalAdmins,
      totalTeams,
      totalCompetitions,
      totalLeagues
    };
  }, [matches, users, teams, competitions, leagues]);

  // --- RENDERIZAÇÃO ---
  
  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Trophy size={16} />
            <span>Total de Jogos</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalMatches}</p>
          <div className="flex gap-2 text-xs mt-1">
            <span className="text-green-400">{stats.finishedMatches} finalizados</span>
            <span className="text-yellow-400">{stats.pendingMatches} pendentes</span>
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users size={16} />
            <span>Usuários</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalUsers}</p>
          <div className="text-xs text-slate-400 mt-1">
            {stats.totalAdmins} administradores
          </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Shield size={16} />
            <span>Times</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalTeams}</p>
        </div>
        
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Globe size={16} />
            <span>Competições</span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalCompetitions}</p>
          <div className="text-xs text-slate-400 mt-1">
            {stats.totalLeagues} ligas
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Database size={16} className="text-slate-400" />
          Informações do Sistema
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between py-1 border-b border-slate-700/30">
            <span className="text-slate-400">Total de Registros</span>
            <span className="font-medium">{stats.totalMatches + stats.totalUsers + stats.totalTeams + stats.totalCompetitions}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-700/30">
            <span className="text-slate-400">Última Sincronização</span>
            <span className="font-medium">{new Date().toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-700/30">
            <span className="text-slate-400">Status da API</span>
            <span className="font-medium text-green-400">Online</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-700/30">
            <span className="text-slate-400">Versão</span>
            <span className="font-medium">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeams = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Plus size={16} className="text-blue-400" />
          Adicionar Novo Time
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Nome do Time"
            value={newTeam.name}
            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Sigla (ex: BRA)"
            value={newTeam.short_code}
            onChange={(e) => setNewTeam({ ...newTeam, short_code: e.target.value.toUpperCase() })}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            maxLength={3}
          />
          <input
            type="text"
            placeholder="URL do Logo"
            value={newTeam.logo_url || ''}
            onChange={(e) => setNewTeam({ ...newTeam, logo_url: e.target.value })}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleAddTeam}
            disabled={teamLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {teamLoading ? 'Adicionando...' : 'Adicionar Time'}
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50">
          <h4 className="text-sm font-bold">Times Cadastrados ({teams.length})</h4>
        </div>
        <div className="divide-y divide-slate-700/30">
          {teams.map((team) => (
            <div key={team.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              {editingTeam?.id === team.id ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={editingTeam.name}
                    onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                    className="p-1.5 rounded bg-slate-900 border border-slate-700 text-white text-sm"
                  />
                  <input
                    type="text"
                    value={editingTeam.short_code}
                    onChange={(e) => setEditingTeam({ ...editingTeam, short_code: e.target.value.toUpperCase() })}
                    className="p-1.5 rounded bg-slate-900 border border-slate-700 text-white text-sm"
                    maxLength={3}
                  />
                  <input
                    type="text"
                    value={editingTeam.logo_url || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, logo_url: e.target.value })}
                    className="p-1.5 rounded bg-slate-900 border border-slate-700 text-white text-sm"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleUpdateTeam}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => setEditingTeam(null)}
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <div className="w-8 h-8 bg-slate-700/30 rounded-full flex items-center justify-center text-xs font-bold">
                        {team.short_code}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">{team.name}</span>
                      <span className="text-xs text-slate-400 ml-2">({team.short_code})</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingTeam(team)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold flex items-center gap-2">
            <UsersIcon size={16} className="text-slate-400" />
            Usuários do Sistema ({users.length})
          </h4>
          {userError && (
            <span className="text-xs text-red-400 ml-2">{userError}</span>
          )}
        </div>
        <button
          onClick={() => setShowCreateUser(!showCreateUser)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <UserPlus size={16} />
          Novo Usuário
        </button>
      </div>

      {showCreateUser && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/30">
          <h5 className="font-bold mb-3 flex items-center gap-2">
            <Plus size={16} className="text-blue-400" />
            Criar Novo Usuário
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Email *</label>
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nome de usuário *</label>
              <input
                type="text"
                placeholder="@username"
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value.replace('@', '') })}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Senha *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUserData.is_admin}
                  onChange={(e) => setNewUserData({ ...newUserData, is_admin: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-300">Usuário administrador</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCreateUser}
              disabled={userFormLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {userFormLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Criar Usuário
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowCreateUser(false);
                setNewUserData({ email: '', username: '', password: '', is_admin: false });
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
          <span className="text-xs text-slate-400">
            {userLoading ? 'Carregando...' : `${users.length} usuários encontrados`}
          </span>
          <button
            onClick={loadUsers}
            disabled={userLoading}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <RefreshCw size={14} className={userLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="divide-y divide-slate-700/30">
          {users.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              {userLoading ? 'Carregando usuários...' : 'Nenhum usuário encontrado'}
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-3 hover:bg-slate-800/30 transition-colors">
                {editingUser?.id === user.id ? (
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block">Nome de usuário</label>
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingUser.is_admin}
                            onChange={(e) => setEditingUser({ ...editingUser, is_admin: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-300">Administrador</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={handleUpdateUser}
                        disabled={userFormLoading}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold transition-colors flex items-center gap-1"
                      >
                        <Save size={14} />
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">@{user.username}</span>
                        {user.is_admin ? (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">Admin</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">Usuário</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        ID: {user.id.substring(0, 8)}... 
                        {user.created_at && ` • Criado em ${new Date(user.created_at).toLocaleDateString('pt-BR')}`}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Editar usuário"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.id, user.username)}
                        className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                        title="Resetar senha"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
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
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Excluir usuário"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Award size={16} className="text-yellow-400" />
          Regras de Pontuação
        </h4>
        {rulesLoading ? (
          <div className="text-center text-slate-400 py-4">Carregando regras...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                <label className="text-xs text-slate-400 block mb-1">Acertar o placar exato</label>
                <input
                  type="number"
                  min="0"
                  value={rules.points_correct_score}
                  onChange={(e) => setRules({ ...rules, points_correct_score: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 mt-1 block">pontos</span>
              </div>
              
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                <label className="text-xs text-slate-400 block mb-1">Acertar o vencedor</label>
                <input
                  type="number"
                  min="0"
                  value={rules.points_correct_winner}
                  onChange={(e) => setRules({ ...rules, points_correct_winner: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 mt-1 block">pontos</span>
              </div>
              
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                <label className="text-xs text-slate-400 block mb-1">Acertar empate</label>
                <input
                  type="number"
                  min="0"
                  value={rules.points_correct_draw}
                  onChange={(e) => setRules({ ...rules, points_correct_draw: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 mt-1 block">pontos</span>
              </div>
              
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                <label className="text-xs text-slate-400 block mb-1">Bônus por pênalti</label>
                <input
                  type="number"
                  min="0"
                  value={rules.penalty_bonus}
                  onChange={(e) => setRules({ ...rules, penalty_bonus: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 mt-1 block">pontos extras</span>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={handleSaveRules}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <Save size={16} />
                Salvar Regras
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderCompetitions = () => (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Plus size={16} className="text-blue-400" />
          Nova Competição
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nome da Competição"
            value={newCompetition.name}
            onChange={(e) => setNewCompetition({ ...newCompetition, name: e.target.value })}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Slug (ex: copa-do-mundo)"
            value={newCompetition.slug}
            onChange={(e) => setNewCompetition({ ...newCompetition, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleAddCompetition}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Adicionar Competição
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800/30 rounded-xl overflow-hidden border border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50">
          <h4 className="text-sm font-bold">Competições ({competitions.length})</h4>
        </div>
        <div className="divide-y divide-slate-700/30">
          {competitions.map((comp) => (
            <div key={comp.id} className="p-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div>
                <span className="font-medium">{comp.name}</span>
                <span className="text-xs text-slate-400 ml-2">({comp.slug})</span>
                {comp.is_active && (
                  <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Ativa</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {leagues.filter(l => l.competition_id === comp.id).length} ligas
                </span>
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('competitions')
                        .update({ is_active: !comp.is_active })
                        .eq('id', comp.id);
                      
                      if (error) throw error;
                      showMessage('success', 'Status atualizado!');
                      await loadCompetitions();
                    } catch (error) {
                      console.error('Erro:', error);
                      showMessage('error', 'Erro ao atualizar status');
                    }
                  }}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    comp.is_active
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400'
                      : 'bg-green-600/20 hover:bg-green-600/30 text-green-400'
                  }`}
                >
                  {comp.is_active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
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

      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="text-slate-400" size={24} />
          Configurações do Sistema
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Gerencie times, usuários, regras e muito mais
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-700/50 pb-2">
        {[
          { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
          { id: 'teams', label: 'Times', icon: Shield },
          { id: 'users', label: 'Usuários', icon: Users },
          { id: 'rules', label: 'Regras', icon: Award },
          { id: 'competitions', label: 'Competições', icon: Globe }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      <div className="min-h-[400px]">
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'teams' && renderTeams()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'rules' && renderRules()}
        {activeTab === 'competitions' && renderCompetitions()}
      </div>
    </div>
  );
}