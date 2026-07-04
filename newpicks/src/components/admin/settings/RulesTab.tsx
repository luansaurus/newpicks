'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';
import { 
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Trophy,
  Globe,
  ToggleLeft,
  ToggleRight,
  Info,
  Plus
} from 'lucide-react';

type Competition = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

type Rules = {
  id: number;
  points_correct_score: number;
  points_correct_winner: number;
  points_correct_draw: number;
  penalty_bonus: number;
  match_lock_minutes: number;
  playoff_multiplier: number;
  competition_id: number;
};

export function RulesTab() {
  const [rules, setRules] = useState<Rules>({
    id: 1,
    points_correct_score: 10,
    points_correct_winner: 5,
    points_correct_draw: 3,
    penalty_bonus: 2,
    match_lock_minutes: 15,
    playoff_multiplier: 1.5,
    competition_id: 1
  });
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [playoffMultiplierEnabled, setPlayoffMultiplierEnabled] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar competições
      const { data: compsData, error: compsError } = await supabase
        .from('competitions')
        .select('id, name, slug, is_active')
        .order('name');

      if (compsError) throw compsError;
      setCompetitions(compsData || []);

      // Carregar regras
      const { data: rulesData, error: rulesError } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (rulesError) {
        if (rulesError.code === '42P01') {
          // Tabela não existe, usar valores padrão
          setRules({
            id: 1,
            points_correct_score: 10,
            points_correct_winner: 5,
            points_correct_draw: 3,
            penalty_bonus: 2,
            match_lock_minutes: 15,
            playoff_multiplier: 1.5,
            competition_id: compsData?.[0]?.id || 1
          });
          setPlayoffMultiplierEnabled(true);
          return;
        }
        throw rulesError;
      }

      if (rulesData) {
        setRules({
          id: rulesData.id || 1,
          points_correct_score: rulesData.points_correct_score || 10,
          points_correct_winner: rulesData.points_correct_winner || 5,
          points_correct_draw: rulesData.points_correct_draw || 3,
          penalty_bonus: rulesData.penalty_bonus || 2,
          match_lock_minutes: rulesData.match_lock_minutes || 15,
          playoff_multiplier: rulesData.playoff_multiplier || 1.5,
          competition_id: rulesData.competition_id || compsData?.[0]?.id || 1
        });
        setPlayoffMultiplierEnabled(rulesData.playoff_multiplier > 0);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showMessage('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSaveRules = async () => {
    setSaving(true);
    try {
      // Verifica se a tabela settings existe
      const { error: checkError } = await supabase
        .from('settings')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        showMessage('error', 'Tabela settings não existe. Execute a migration.');
        return;
      }

      // Preparar dados para salvar
      const dataToSave = {
        id: 1,
        points_correct_score: rules.points_correct_score,
        points_correct_winner: rules.points_correct_winner,
        points_correct_draw: rules.points_correct_draw,
        penalty_bonus: rules.penalty_bonus,
        match_lock_minutes: rules.match_lock_minutes,
        playoff_multiplier: playoffMultiplierEnabled ? rules.playoff_multiplier : 0,
        competition_id: rules.competition_id,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('settings')
        .upsert([dataToSave]);

      if (error) {
        if (error.code === '42501') {
          showMessage('error', 'Erro de permissão (RLS). Contate o administrador.');
          return;
        }
        throw error;
      }

      showMessage('success', 'Regras salvas com sucesso!');
      await loadData(); // Recarregar para garantir consistência
    } catch (error) {
      console.error('Erro ao salvar regras:', error);
      showMessage('error', 'Erro ao salvar regras');
    } finally {
      setSaving(false);
    }
  };

  const togglePlayoffMultiplier = () => {
    const newState = !playoffMultiplierEnabled;
    setPlayoffMultiplierEnabled(newState);
    if (!newState) {
      // Se desabilitado, zera o multiplicador
      setRules({ ...rules, playoff_multiplier: 0 });
    } else {
      // Se habilitado, restaura o valor padrão
      setRules({ ...rules, playoff_multiplier: 1.5 });
    }
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

      {loading ? (
        <div className="text-center text-slate-400 py-8">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
          Carregando configurações...
        </div>
      ) : (
        <>
          {/* Configuração da Competição */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Globe size={16} className="text-blue-400" />
              Competição Ativa
            </h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={rules.competition_id}
                onChange={(e) => setRules({ ...rules, competition_id: parseInt(e.target.value) })}
                className="flex-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                {competitions.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} {!comp.is_active && '(Inativa)'}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-400 self-center">
                As regras serão aplicadas a esta competição
              </span>
            </div>
          </div>

          {/* Regras de Pontuação */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Award size={16} className="text-yellow-400" />
              Regras de Pontuação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                <label className="text-xs text-slate-400 block mb-1">
                  Acertar o placar exato
                </label>
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
                <label className="text-xs text-slate-400 block mb-1">
                  Acertar o vencedor
                </label>
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
                <label className="text-xs text-slate-400 block mb-1">
                  Acertar empate
                </label>
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
                <label className="text-xs text-slate-400 block mb-1">
                  Bônus por pênalti
                </label>
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
          </div>

          {/* Configurações de Playoffs */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-purple-400" />
              Configurações de Playoffs
            </h4>
            
            <div className="space-y-3">
              {/* Toggle Multiplicador */}
              <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayoffMultiplier}
                    className="text-2xl transition-colors"
                  >
                    {playoffMultiplierEnabled ? (
                      <ToggleRight className="text-blue-500" size={28} />
                    ) : (
                      <ToggleLeft className="text-slate-400" size={28} />
                    )}
                  </button>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      Multiplicador de Playoffs
                      <Info size={14} className="text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-400">
                      {playoffMultiplierEnabled 
                        ? 'Multiplica a pontuação dos palpites em jogos de mata-mata' 
                        : 'Desabilitado - pontuação normal em todos os jogos'}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${playoffMultiplierEnabled ? 'text-blue-400' : 'text-slate-500'}`}>
                  {playoffMultiplierEnabled ? `${rules.playoff_multiplier}x` : '0x'}
                </span>
              </div>

              {/* Input do Multiplicador */}
              {playoffMultiplierEnabled && (
                <div className="pl-12">
                  <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                    <label className="text-xs text-slate-400 block mb-1">
                      Valor do Multiplicador
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0.5"
                        max="5"
                        step="0.1"
                        value={rules.playoff_multiplier}
                        onChange={(e) => setRules({ ...rules, playoff_multiplier: parseFloat(e.target.value) || 0 })}
                        className="w-32 p-2 rounded bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-sm text-slate-400">
                        A pontuação será multiplicada por {rules.playoff_multiplier}x
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Configurações Gerais */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Award size={16} className="text-slate-400" />
              Configurações Gerais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/50">
                <label className="text-xs text-slate-400 block mb-1">
                  Minutos para bloquear palpites
                </label>
                <input
                  type="number"
                  min="0"
                  value={rules.match_lock_minutes}
                  onChange={(e) => setRules({ ...rules, match_lock_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white font-bold text-lg focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 mt-1 block">minutos antes do jogo</span>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveRules}
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
                  Salvar Regras
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}