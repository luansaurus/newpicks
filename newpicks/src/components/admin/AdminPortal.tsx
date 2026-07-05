'use client';

import { useState } from 'react';
import { 
  Trophy, 
  Settings, 
  RefreshCw,
  Shield,
  Eye,
  Award,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';

type PortalType = 'score' | 'matches' | 'settings' | null;

interface AdminPortalProps {
  scoreManager: React.ReactNode;
  matchManager: React.ReactNode;
  settingsManager: React.ReactNode;
  onSync?: () => Promise<{ sucesso: boolean; mensagem?: string; jogosProcessados?: number; erro?: string } | void>;
  syncLoading?: boolean;
}

export function AdminPortal({ 
  scoreManager, 
  matchManager,
  settingsManager,
  onSync, 
  syncLoading = false 
}: AdminPortalProps) {
  const [activePortal, setActivePortal] = useState<PortalType>('score');
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync || isSyncing) return;

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const result = await onSync();
      
      if (result && typeof result === 'object') {
        if (result.sucesso) {
          const msg = result.jogosProcessados !== undefined 
            ? `✅ ${result.mensagem || 'Sincronizado!'} (${result.jogosProcessados} jogos atualizados)`
            : `✅ ${result.mensagem || 'Sincronizado com sucesso!'}`;
          setSyncMessage({ type: 'success', text: msg });
        } else {
          setSyncMessage({ 
            type: 'error', 
            text: `❌ ${result.erro || result.mensagem || 'Erro na sincronização'}` 
          });
        }
      } else {
        setSyncMessage({ type: 'success', text: '✅ Sincronização concluída!' });
      }
    } catch (error: any) {
      setSyncMessage({ 
        type: 'error', 
        text: `❌ Erro: ${error.message || 'Falha na sincronização'}` 
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const portals = [
    {
      id: 'score',
      label: 'Placares',
      icon: Trophy,
      description: 'Gerenciar placares dos jogos',
      color: 'blue'
    },
    {
      id: 'matches',
      label: 'Jogos',
      icon: Calendar,
      description: 'Gerenciar jogos (CRUD + CSV)',
      color: 'purple'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      description: 'Configurações do sistema',
      color: 'gray'
    }
  ];

  const getColorClasses = (portalId: string, isActive: boolean) => {
    const colors: Record<string, { border: string; bg: string; text: string }> = {
      score: {
        border: isActive ? 'border-blue-500' : 'border-slate-700/50',
        bg: isActive ? 'bg-blue-500/10' : 'bg-slate-800/30',
        text: isActive ? 'text-blue-400' : 'text-slate-400'
      },
      matches: {
        border: isActive ? 'border-purple-500' : 'border-slate-700/50',
        bg: isActive ? 'bg-purple-500/10' : 'bg-slate-800/30',
        text: isActive ? 'text-purple-400' : 'text-slate-400'
      },
      settings: {
        border: isActive ? 'border-gray-500' : 'border-slate-700/50',
        bg: isActive ? 'bg-gray-500/10' : 'bg-slate-800/30',
        text: isActive ? 'text-gray-400' : 'text-slate-400'
      }
    };
    return colors[portalId] || colors.score;
  };

  const openPortal = (portalId: PortalType) => {
    if (activePortal === portalId) return;
    setActivePortal(portalId);
    setSyncMessage(null);
  };

  const closePortal = () => {
    setActivePortal(null);
    setSyncMessage(null);
  };

  const renderContent = () => {
    switch (activePortal) {
      case 'score':
        return scoreManager;
      case 'matches':
        return matchManager;
      case 'settings':
        return settingsManager;
      default:
        return null;
    }
  };

  const isLoading = syncLoading || isSyncing;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Shield className="text-blue-500" size={28} />
              Painel Administrativo
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {activePortal 
                ? `Gerenciando: ${portals.find(p => p.id === activePortal)?.label || ''}`
                : 'Selecione um portal para começar'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {syncMessage && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                syncMessage.type === 'success' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                  : syncMessage.type === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
              }`}>
                {syncMessage.type === 'success' && <CheckCircle size={16} />}
                {syncMessage.type === 'error' && <XCircle size={16} />}
                {syncMessage.type === 'info' && <AlertCircle size={16} />}
                <span>{syncMessage.text}</span>
              </div>
            )}
            
            <div className="flex gap-2">
              {onSync && (
                <button
                  onClick={handleSync}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 ${
                    syncMessage?.type === 'success' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : syncMessage?.type === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? 'Sincronizando...' : 'Sincronizar API'}
                </button>
              )}
              
              {activePortal && (
                <button
                  onClick={closePortal}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                >
                  <X size={16} />
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Portais - Grid de cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {portals.map((portal) => {
            const Icon = portal.icon;
            const isActive = activePortal === portal.id;
            const colors = getColorClasses(portal.id, isActive);
            
            return (
              <button
                key={portal.id}
                onClick={() => openPortal(portal.id as PortalType)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? `${colors.border} ${colors.bg} shadow-lg shadow-${portal.color}-500/20 scale-105`
                    : `${colors.border} ${colors.bg} hover:bg-slate-800/50 hover:border-slate-600`
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isActive ? `bg-${portal.color}-500/20 ${colors.text}` : 'bg-slate-700/30 text-slate-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{portal.label}</h3>
                    <p className="text-xs text-slate-400">{portal.description}</p>
                  </div>
                  {isActive && (
                    <div className="text-xs text-blue-400 flex items-center gap-1">
                      <Eye size={12} />
                      <span className="hidden sm:inline">Aberto</span>
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Conteúdo do portal ativo */}
        {activePortal ? (
          <div className="bg-slate-900/30 rounded-xl border border-slate-700/50 p-4 sm:p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            {renderContent()}
          </div>
        ) : (
          <div className="bg-slate-900/30 rounded-xl border border-slate-700/50 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Shield size={48} className="text-slate-600" />
              <div>
                <h2 className="text-xl font-bold text-slate-300">Nenhum portal selecionado</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Escolha um dos portais acima para começar a gerenciar
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}