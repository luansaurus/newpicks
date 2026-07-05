'use client';

import { useState } from 'react';
import { 
  Settings, 
  Users, 
  Shield, 
  Trophy, 
  ClipboardList,
  BarChart,
  Calendar,
  Play,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { StatsTab } from './StatsTab';
import { TeamsTab } from './TeamsTab';
import { UsersTab } from './UsersTab';
import { RulesTab } from './RulesTab';
import { CompetitionsTab } from './CompetitionsTab';
import { MatchesCRUD } from './MatchManagerCRUD';

interface SettingsManagerProps {
  matches: any[];
  onUpdate: () => void;
}

export function SettingsManager({ matches, onUpdate }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState('stats');

  const tabs = [
    { id: 'stats', label: 'Estatísticas', icon: BarChart },
    { id: 'matches', label: 'Jogos', icon: Calendar },
    { id: 'teams', label: 'Times', icon: Users },
    { id: 'users', label: 'Usuários', icon: Shield },
    { id: 'rules', label: 'Regras', icon: ClipboardList },
    { id: 'competitions', label: 'Competições', icon: Trophy },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsTab matches={matches} />;
      case 'matches':
        return <MatchesCRUD matches={matches} onMatchUpdate={onUpdate} />;
      case 'teams':
        return <TeamsTab />;
      case 'users':
        return <UsersTab />;
      case 'rules':
        return <RulesTab />;
      case 'competitions':
        return <CompetitionsTab onUpdate={onUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="text-blue-400" size={24} />
          Configurações do Sistema
        </h2>
        <p className="text-sm text-slate-400">
          Gerencie todos os aspectos do sistema
        </p>
      </div>

      {/* Tabs de navegação */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700/50 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Conteúdo */}
      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
}