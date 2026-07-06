import { TrendingUp, ChevronUp, ChevronDown, Minus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';

export interface UserStats {
  totalPoints: number;
  todayPoints: number;
  lastDayPoints: number;
  exactScores: number;
  rank: number;
  movement: number; 
}

interface UserPerformanceProps {
  stats: UserStats;
  themeColor?: string;
}

export function UserPerformance({ stats, themeColor: propThemeColor }: UserPerformanceProps) {
  const { themeColor: contextThemeColor } = useTheme();
  const themeColor = propThemeColor || contextThemeColor || 'var(--color-primary)';

  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-display font-bold uppercase tracking-tight flex items-center gap-2">
          <TrendingUp size={18} style={{ color: themeColor }} /> Meu Desempenho
        </h2>
        <Link 
          href="/performance" 
          className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: themeColor }}
        >
          Ver detalhes
          <ArrowRight size={14} />
        </Link>
      </div>
      
      {/* CARD DE POSIÇÃO NO RANKING */}
      <div className="flex items-center justify-between bg-background/50 p-4 rounded-xl border border-border/50 mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">Posição Atual</span>
          <span className="text-3xl sm:text-4xl font-display font-bold" style={{ color: themeColor }}>
            {stats.rank > 0 ? `${stats.rank}º` : '-'}
          </span>
        </div>
        <div className={`flex flex-col items-end ${stats.movement > 0 ? 'text-green-500' : stats.movement < 0 ? 'text-red-500' : 'text-slate-500'}`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Movimento</span>
          <div className="flex items-center gap-0.5 font-bold text-lg sm:text-xl">
            {stats.movement > 0 ? <ChevronUp size={20} /> : stats.movement < 0 ? <ChevronDown size={20} /> : <Minus size={18} className="opacity-50" />}
            {stats.movement !== 0 && Math.abs(stats.movement)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-border/50">
          <span className="text-slate-400 text-sm">Pontuação Total</span>
          <span className="font-bold text-lg font-display">{stats.totalPoints} pts</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-border/50">
          <span className="text-slate-400 text-sm">Feitos Hoje</span>
          <span className="font-bold text-lg font-display text-green-400">+{stats.todayPoints} pts</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-border/50">
          <span className="text-slate-400 text-sm">Última Rodada</span>
          <span className="font-bold text-lg font-display">+{stats.lastDayPoints} pts</span>
        </div>
        <div className="flex justify-between items-center pb-1">
          <span className="text-slate-400 text-sm">Placares Cravados</span>
          <span className="font-bold text-lg font-display text-yellow-500">{stats.exactScores}</span>
        </div>
      </div>
    </div>
  );
}