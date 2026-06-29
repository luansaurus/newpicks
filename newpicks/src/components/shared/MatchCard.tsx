import { Clock, Radio } from 'lucide-react';
import { useState } from 'react';

export type MatchStatus = 'SCHEDULED' | 'IN_PLAY' | 'FINISHED';

export interface Team {
  id: number;
  name: string;
  short_code: string;
  logo_url: string;
}

export interface MatchCardProps {
  homeTeam: Team | null; // Agora aceita null
  awayTeam: Team | null; // Agora aceita null
  matchDate: Date | string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  onClick?: () => void;
}

export function MatchCard({
  homeTeam,
  awayTeam,
  matchDate,
  status,
  homeScore,
  awayScore,
  onClick,
}: MatchCardProps) {
  const isLocked = new Date(matchDate).getTime() - new Date().getTime() < 15 * 60 * 1000;
  
  const [guessHome, setGuessHome] = useState('');
  const [guessAway, setGuessAway] = useState('');
  
  const formattedTime = new Date(matchDate).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderStatusBadge = () => {
    switch (status) {
      case 'IN_PLAY':
        return (
          <div className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
            <Radio size={14} className="animate-pulse" />
            <span className="animate-pulse">Ao Vivo</span>
          </div>
        );
      case 'FINISHED':
        return (
          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
            <span>Encerrado</span>
          </div>
        );
      case 'SCHEDULED':
      default:
        return (
          <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
            <Clock size={14} />
            <span>{formattedTime}</span>
          </div>
        );
    }
    return (
    <div className="bg-card border border-border p-3 rounded-xl flex items-center justify-between gap-4 hover:border-primary/50 transition-colors">
      {/* Escudos Compactos */}
      <div className="flex items-center gap-2 flex-1">
        <img src={homeTeam?.logo_url} className="w-8 h-8 object-contain" />
        <span className="text-xs font-bold truncate">{homeTeam?.short_code}</span>
      </div>

      {/* Área de Input de Palpite */}
      <div className="flex items-center gap-2">
        {status === 'SCHEDULED' && !isLocked ? (
          <div className="flex items-center gap-1">
            <input 
              type="number" 
              className="w-10 h-8 bg-background border border-border rounded text-center text-sm"
              placeholder="0"
              onChange={(e) => setGuessHome(e.target.value)}
            />
            <span className="text-slate-500">x</span>
            <input 
              type="number" 
              className="w-10 h-8 bg-background border border-border rounded text-center text-sm"
              placeholder="0"
              onChange={(e) => setGuessAway(e.target.value)}
            />
            <button className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Ok</button>
          </div>
        ) : (
          <div className="text-[10px] uppercase text-slate-500 font-bold px-2 py-1 bg-slate-900 rounded">
            {isLocked ? 'Encerrado' : 'Aguardando'}
          </div>
        )}
      </div>

      {/* Time Visitante */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <span className="text-xs font-bold truncate">{awayTeam?.short_code}</span>
        <img src={awayTeam?.logo_url} className="w-8 h-8 object-contain" />
      </div>
    </div>
  );

  };

  // URL genérica caso o time não exista no banco
  const fallbackLogo = "https://ui-avatars.com/api/?name=TBA&background=1e293b&color=cbd5e1&bold=true";

  return (
    <div 
      onClick={onClick}
      className={`relative w-full bg-card border border-border p-4 rounded-2xl transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-primary hover:shadow-[0_0_15px_rgba(var(--color-primary),0.1)] hover:-translate-y-1' : ''
      }`}
    >
      <div className="flex justify-center mb-4">
        {renderStatusBadge()}
      </div>

      <div className="flex items-center justify-between">
        
        {/* Time da Casa (Defensivo) */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2">
            <img 
              src={homeTeam?.logo_url || fallbackLogo} 
              alt={homeTeam?.name || 'A Definir'} 
              className="max-w-full max-h-full object-contain drop-shadow-lg"
            />
          </div>
          <span className="mt-2 font-bold text-sm sm:text-base uppercase text-slate-300 tracking-wide text-center">
            {homeTeam?.short_code || 'TBA'}
          </span>
        </div>

        {/* Placar */}
        <div className="flex flex-col items-center justify-center px-4 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-4xl sm:text-5xl font-display font-bold text-white">
              {status === 'SCHEDULED' ? '-' : (homeScore ?? 0)}
            </span>
            <span className="text-xl font-display text-slate-600 font-bold">X</span>
            <span className="text-4xl sm:text-5xl font-display font-bold text-white">
              {status === 'SCHEDULED' ? '-' : (awayScore ?? 0)}
            </span>
          </div>
        </div>

        {/* Time Visitante (Defensivo) */}
        <div className="flex flex-col items-center flex-1">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2">
            <img 
              src={awayTeam?.logo_url || fallbackLogo} 
              alt={awayTeam?.name || 'A Definir'} 
              className="max-w-full max-h-full object-contain drop-shadow-lg"
            />
          </div>
          <span className="mt-2 font-bold text-sm sm:text-base uppercase text-slate-300 tracking-wide text-center">
            {awayTeam?.short_code || 'TBA'}
          </span>
        </div>
        
      </div>
    </div>
  );
}