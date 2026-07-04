'use client';

import { useState } from 'react';
import { 
  Settings as SettingsIcon,
  BarChart3,
  Shield,
  Users,
  Award,
  Globe
} from 'lucide-react';
import { StatsTab } from './StatsTab';
import { TeamsTab } from './TeamsTab';
import { UsersTab } from './UsersTab';
import { RulesTab } from './RulesTab';
import { CompetitionsTab } from './CompetitionsTab';

type TabType = 'stats' | 'teams' | 'users' | 'rules' | 'competitions';

interface SettingsManagerProps {
  matches: any[];
  onUpdate?: () => void;
}

const TABS = [
  { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
  { id: 'teams', label: 'Times', icon: Shield },
  { id: 'users', label: 'Usuários', icon: Users },
  { id: 'rules', label: 'Regras', icon: Award },
  { id: 'competitions', label: 'Competições', icon: Globe }
] as const;

export function SettingsManager({ matches, onUpdate }: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsTab matches={matches} />;
      case 'teams':
        return <TeamsTab onUpdate={onUpdate} />;
      case 'users':
        return <UsersTab onUpdate={onUpdate} />;
      case 'rules':
        return <RulesTab />;
      case 'competitions':
        return <CompetitionsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
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
        {TABS.map((tab) => {
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

      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
}