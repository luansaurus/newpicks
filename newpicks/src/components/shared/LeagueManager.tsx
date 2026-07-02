'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import { useLeague } from '@/context/LeagueContext';
import { Users, Lock, Globe, Plus, Settings, X, Save, Trophy, CheckCircle2, LogIn, Loader2 } from 'lucide-react';

interface LeagueManagerProps {
  competitionId: number;
  currentUserId: string;
}

export function LeagueManager({ competitionId, currentUserId }: LeagueManagerProps) {
  const { themeColor } = useTheme();
  const { activeLeague, selectLeague } = useLeague();
  
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [leagues, setLeagues] = useState<any[]>([]);
  const [myMemberships, setMyMemberships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState<any | null>(null);

  // Usamos strings para os números para evitar o bug do zero preso no input
  const [formData, setFormData] = useState({
    name: '', is_private: false, password: '',
    rule_exact_score: '5' as string | number, enable_exact: true,
    rule_goal_diff: '3' as string | number, enable_diff: true,
    rule_winner: '2' as string | number, enable_winner: true, 
    playoff_multiplier: '2.0' as string | number
  });

  useEffect(() => { fetchLeagues(); }, [competitionId, activeTab]);

  const fetchLeagues = async () => {
    setLoading(true);
    const { data: members } = await supabase.from('league_members').select('league_id').eq('user_id', currentUserId);
    const myLeagueIds = new Set(members?.map(m => m.league_id) || []);
    setMyMemberships(myLeagueIds);

    let query = supabase.from('leagues').select('*').eq('competition_id', competitionId).order('created_at', { ascending: false });

    if (activeTab === 'my') {
      if (myLeagueIds.size > 0) {
        query = query.in('id', Array.from(myLeagueIds));
      } else {
        setLeagues([]); setLoading(false); return; 
      }
    } else {
      query = query.eq('is_private', false);
    }

    const { data } = await query;
    if (data) setLeagues(data);
    setLoading(false);
  };

  const joinLeague = async (leagueId: string) => {
    await supabase.from('league_members').insert([{ league_id: leagueId, user_id: currentUserId }]);
    fetchLeagues();
  };

  const openCreateModal = () => {
    setEditingLeague(null);
    setFormData({ name: '', is_private: false, password: '', rule_exact_score: '5', enable_exact: true, rule_goal_diff: '3', enable_diff: true, rule_winner: '2', enable_winner: true, playoff_multiplier: '2.0' });
    setIsModalOpen(true);
  };

  const openEditModal = (league: any) => {
    setEditingLeague(league);
    setFormData({
      name: league.name, is_private: league.is_private, password: league.password || '',
      rule_exact_score: league.rule_exact_score?.toString() || '5', enable_exact: league.rule_exact_score > 0,
      rule_goal_diff: league.rule_goal_diff?.toString() || '3', enable_diff: league.rule_goal_diff > 0,
      rule_winner: league.rule_winner?.toString() || '2', enable_winner: league.rule_winner > 0,
      playoff_multiplier: league.playoff_multiplier?.toString() || '1.0'
    });
    setIsModalOpen(true);
  };

  const handleSaveLeague = async () => {
    const payload = {
      competition_id: competitionId, owner_id: currentUserId, name: formData.name,
      is_private: formData.is_private, password: formData.is_private ? formData.password : null,
      rule_exact_score: formData.enable_exact ? (Number(formData.rule_exact_score) || 0) : 0,
      rule_goal_diff: formData.enable_diff ? (Number(formData.rule_goal_diff) || 0) : 0,
      rule_winner: formData.enable_winner ? (Number(formData.rule_winner) || 0) : 0,
      playoff_multiplier: Number(formData.playoff_multiplier) || 1.0
    };

    if (editingLeague) {
      const { data } = await supabase.from('leagues').update(payload).eq('id', editingLeague.id).select().single();
      if (data && activeLeague?.id === data.id) selectLeague(data);
    } else {
      const { data: newLeague } = await supabase.from('leagues').insert([payload]).select().single();
      if (newLeague) {
        await supabase.from('league_members').insert([{ league_id: newLeague.id, user_id: currentUserId }]);
        selectLeague(newLeague);
      }
    }
    setIsModalOpen(false);
    setActiveTab('my');
    fetchLeagues();
  };

  const previewColors = (() => {
    const activeRules = [];
    if (formData.enable_exact) activeRules.push(Number(formData.rule_exact_score) || 0);
    if (formData.enable_diff) activeRules.push(Number(formData.rule_goal_diff) || 0);
    if (formData.enable_winner) activeRules.push(Number(formData.rule_winner) || 0);
    const sortedUnique = Array.from(new Set(activeRules)).sort((a, b) => b - a);
    return {
      [sortedUnique[0]]: 'text-green-500 bg-green-500/10 border-green-500/30',
      [sortedUnique[1]]: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
      [sortedUnique[2]]: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    };
  })();

  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-border/50 pb-4">
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('my')} className={`pb-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'my' ? 'border-primary text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`} style={{ borderColor: activeTab === 'my' ? themeColor : '' }}>Minhas Ligas</button>
          <button onClick={() => setActiveTab('public')} className={`pb-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'public' ? 'border-primary text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`} style={{ borderColor: activeTab === 'public' ? themeColor : '' }}>Ligas Públicas</button>
        </div>
        <button onClick={openCreateModal} className="flex items-center justify-center gap-1 text-xs font-bold bg-primary/10 text-primary px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors uppercase" style={{ color: themeColor }}>
          <Plus size={14} /> Criar Liga
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center text-slate-500"><Loader2 className="animate-spin" size={24} /></div>
      ) : leagues.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          {activeTab === 'my' ? 'Você não participa de nenhuma liga. Crie ou entre em uma pública.' : 'Nenhuma liga pública encontrada.'}
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'my' && (
            <div onClick={() => selectLeague(null)} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${!activeLeague ? 'bg-primary/10 border-primary' : 'bg-background/50 border-border hover:border-slate-500'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><Globe size={16} /></div>
                <div><h3 className="font-bold text-sm">Liga Global</h3><span className="text-[10px] uppercase text-slate-500 tracking-wider">Ranking Oficial</span></div>
              </div>
              {!activeLeague && <CheckCircle2 size={20} className="text-primary" />}
            </div>
          )}

          {leagues.map(league => {
            const isMember = myMemberships.has(league.id);
            const isOwner = league.owner_id === currentUserId;
            const isSelected = activeLeague?.id === league.id;

            return (
              <div key={league.id} onClick={() => isMember && selectLeague(league)} className={`flex items-center justify-between p-4 rounded-xl transition-all border ${isMember ? 'cursor-pointer hover:border-slate-500' : ''} ${isSelected ? 'bg-primary/10 border-primary' : 'bg-background/50 border-border'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-slate-400">{league.is_private ? <Lock size={16} /> : <Users size={16} />}</div>
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      {league.name}
                      {activeTab === 'public' && isMember && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase tracking-wider">Participando</span>}
                    </h3>
                    <span className="text-[10px] uppercase text-slate-500 tracking-wider">{isOwner ? 'Dono da Liga' : league.is_private ? 'Liga Privada' : 'Liga Pública'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isMember ? (
                    <>
                      {isSelected && <CheckCircle2 size={20} className="text-primary mr-2" />}
                      {isOwner && (
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(league); }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                          <Settings size={16} />
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => joinLeague(league.id)} className="flex items-center gap-1 text-xs font-bold bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition-colors uppercase">
                      <LogIn size={14} /> Entrar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="font-display font-bold text-lg uppercase tracking-tight">{editingLeague ? 'Editar Liga' : 'Nova Liga'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Nome da Liga</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none" placeholder="Ex: Firma do TI, Família Silva..." />
                </div>
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
                  <div><h4 className="font-bold text-sm">Liga Privada?</h4><p className="text-xs text-slate-500">Exigir senha para entrar</p></div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.is_private} onChange={e => setFormData({...formData, is_private: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {formData.is_private && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Senha da Liga</label>
                    <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:border-primary outline-none" />
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-bold text-sm uppercase tracking-tight text-slate-300 mb-4">Regras de Pontuação</h3>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={formData.enable_exact} onChange={e => setFormData({...formData, enable_exact: e.target.checked})} className="w-5 h-5 accent-primary rounded" />
                  <div className="flex-1"><p className="font-bold text-sm">Cravou o Placar</p></div>
                  <input type="text" disabled={!formData.enable_exact} value={formData.rule_exact_score} onChange={e => setFormData({...formData, rule_exact_score: e.target.value})} className={`w-16 p-2 bg-background border rounded-lg text-center font-bold outline-none ${previewColors[Number(formData.rule_exact_score)] || 'border-border'}`} />
                </div>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={formData.enable_diff} onChange={e => setFormData({...formData, enable_diff: e.target.checked})} className="w-5 h-5 accent-primary rounded" />
                  <div className="flex-1"><p className="font-bold text-sm">Acertou Vencedor + Saldo</p></div>
                  <input type="text" disabled={!formData.enable_diff} value={formData.rule_goal_diff} onChange={e => setFormData({...formData, rule_goal_diff: e.target.value})} className={`w-16 p-2 bg-background border rounded-lg text-center font-bold outline-none ${previewColors[Number(formData.rule_goal_diff)] || 'border-border'}`} />
                </div>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={formData.enable_winner} onChange={e => setFormData({...formData, enable_winner: e.target.checked})} className="w-5 h-5 accent-primary rounded" />
                  <div className="flex-1"><p className="font-bold text-sm">Apenas Vencedor</p></div>
                  <input type="text" disabled={!formData.enable_winner} value={formData.rule_winner} onChange={e => setFormData({...formData, rule_winner: e.target.value})} className={`w-16 p-2 bg-background border rounded-lg text-center font-bold outline-none ${previewColors[Number(formData.rule_winner)] || 'border-border'}`} />
                </div>
                <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <input type="checkbox" checked={Number(formData.playoff_multiplier) > 1} onChange={e => setFormData({...formData, playoff_multiplier: e.target.checked ? '2.0' : '1.0'})} className="w-5 h-5 accent-primary rounded" />
                    <div><h4 className="font-bold text-sm">Multiplicador Mata-Mata</h4><p className="text-[10px] text-slate-500 uppercase">Pontos valem mais</p></div>
                  </div>
                  <input type="text" disabled={Number(formData.playoff_multiplier) <= 1} value={Number(formData.playoff_multiplier) <= 1 ? '' : formData.playoff_multiplier} onChange={e => setFormData({...formData, playoff_multiplier: e.target.value})} className="w-16 p-2 bg-background border border-border rounded-lg text-center font-bold text-primary outline-none disabled:opacity-30" placeholder="1x" />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border bg-background/50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-sm text-slate-400 hover:text-white">Cancelar</button>
              <button onClick={handleSaveLeague} disabled={!formData.name} className="px-6 py-2 font-bold text-sm bg-primary text-slate-900 rounded-lg hover:brightness-110 flex items-center gap-2" style={{ backgroundColor: themeColor }}><Save size={16} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}