import { Clock, Radio, Award } from 'lucide-react';

export type MatchStatus = 'SCHEDULED' | 'IN_PLAY' | 'FINISHED';

export interface Team {
  id: number;
  name: string;
  short_code: string;
  logo_url: string;
}

export interface MatchCardProps {
  homeTeam: Team | null;
  awayTeam: Team | null;
  matchDate: Date | string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number; // Novo: Pênaltis do time da casa
  awayPenalties?: number; // Novo: Pênaltis do time visitante
  onClick?: () => void;
  guessHome?: string;
  guessAway?: string;
  onGuessChange?: (side: 'home' | 'away', value: string) => void;
  userGuess?: { home_guess: number; away_guess: number } | null;
  points?: number;
}

export function MatchCard({
  homeTeam,
  awayTeam,
  matchDate,
  status,
  homeScore,
  awayScore,
  homePenalties,
  awayPenalties,
  onClick,
  guessHome,
  guessAway,
  onGuessChange,
  userGuess,
  points
}: MatchCardProps) {
  
  const isLocked = new Date(matchDate).getTime() - new Date().getTime() < 15 * 60 * 1000;

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
  };

  const fallbackLogo = "https://ui-avatars.com/api/?name=TBA&background=1e293b&color=cbd5e1&bold=true";

  const displayHome = guessHome ?? (userGuess?.home_guess?.toString() || '');
  const displayAway = guessAway ?? (userGuess?.away_guess?.toString() || '');

  // --- LÓGICA DE CORES DA PONTUAÇÃO (BORDA E BACKGROUND) ---
  let cardBorderColor = 'border-2 border-border';
  let cardBgColor = 'bg-card';

  if (status === 'FINISHED' && points !== undefined) {
    if (points >= 5) {
      cardBorderColor = 'border-2 border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.15)]';
      cardBgColor = 'bg-green-500/10';
    } else if (points >= 3) {
      cardBorderColor = 'border-2 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
      cardBgColor = 'bg-blue-500/10';
    } else if (points >= 2) {
      cardBorderColor = 'border-2 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)]';
      cardBgColor = 'bg-yellow-500/10';
    } else {
      cardBorderColor = 'border-2 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
      cardBgColor = 'bg-red-500/10';
    }
  }

  let pointsBadgeColor = 'text-slate-400 bg-slate-800';
  if (points !== undefined) {
    if (points >= 5) pointsBadgeColor = 'text-green-400 bg-green-500/20 border-green-500/30';
    else if (points >= 3) pointsBadgeColor = 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    else if (points >= 2) pointsBadgeColor = 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    else pointsBadgeColor = 'text-red-400 bg-red-500/20 border-red-500/30';
  }

  // --- LÓGICA INTELIGENTE PARA APAGAR O TIME PERDEDOR (INCLUINDO PÊNALTIS) ---
  let isHomeLoser = false;
  let isAwayLoser = false;

  if (status === 'FINISHED' && homeScore !== undefined && awayScore !== undefined) {
    if (homeScore < awayScore) {
      isHomeLoser = true;
    } else if (awayScore < homeScore) {
      isAwayLoser = true;
    } else if (homeScore === awayScore && homePenalties !== undefined && awayPenalties !== undefined) {
      // Jogo empatou, decide nos pênaltis!
      if (homePenalties < awayPenalties) {
        isHomeLoser = true;
      } else if (awayPenalties < homePenalties) {
        isAwayLoser = true;
      }
    }
  }

  const homeOpacityClass = isHomeLoser ? 'opacity-40 grayscale-[50%]' : 'opacity-100';
  const homeTextClass = isHomeLoser ? 'text-slate-500' : 'text-slate-200';
  
  const awayOpacityClass = isAwayLoser ? 'opacity-40 grayscale-[50%]' : 'opacity-100';
  const awayTextClass = isAwayLoser ? 'text-slate-500' : 'text-slate-200';

  return (
    <div 
      onClick={onClick}
      className={`relative w-full ${cardBgColor} p-4 rounded-2xl transition-all duration-300 ${cardBorderColor} ${
        onClick ? 'cursor-pointer hover:border-primary hover:shadow-[0_0_15px_rgba(var(--color-primary),0.1)] hover:-translate-y-1' : ''
      }`}
    >
      <div className="flex justify-center mb-4">
        {renderStatusBadge()}
      </div>

      <div className="flex items-center justify-between">
        
        {/* TIME DA CASA */}
        <div className={`flex flex-col items-center flex-1 transition-all duration-500 ${homeOpacityClass}`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2">
            <img 
              src={homeTeam?.logo_url || fallbackLogo} 
              alt={homeTeam?.name || 'A Definir'} 
              className="max-w-full max-h-full object-contain drop-shadow-lg"
            />
          </div>
          <span className={`mt-2 font-bold text-sm sm:text-base uppercase tracking-wide text-center transition-colors ${homeTextClass}`}>
            {homeTeam?.short_code || 'TBA'}
          </span>
        </div>

        {/* ÁREA CENTRAL */}
        <div className="flex flex-col items-center justify-center px-2 sm:px-4 flex-shrink-0 z-10">
          
          {status === 'FINISHED' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-4xl sm:text-5xl font-display font-bold text-white drop-shadow-md">{homeScore ?? 0}</span>
                <span className="text-xl sm:text-2xl font-display text-slate-500 font-bold">:</span>
                <span className="text-4xl sm:text-5xl font-display font-bold text-white drop-shadow-md">{awayScore ?? 0}</span>
              </div>

              {/* PLACAR DE PÊNALTIS (Só aparece se houver dados de pênaltis e for empate) */}
              {homePenalties !== undefined && awayPenalties !== undefined && homeScore === awayScore && (
                <div className="text-[10px] sm:text-xs font-bold text-slate-300 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50 mb-1">
                  ({homePenalties}) Pênaltis ({awayPenalties})
                </div>
              )}
              
              {userGuess && (
                <div className="flex flex-col items-center gap-1 mt-1 w-full">
                  <span className="text-[10px] sm:text-xs text-slate-300 font-medium bg-slate-950/60 px-3 py-1 rounded-md border border-slate-800 backdrop-blur-sm shadow-sm">
                    Palpite: <strong className="text-white">{userGuess.home_guess} : {userGuess.away_guess}</strong>
                  </span>
                  
                  {points !== undefined && (
                    <div className={`flex items-center gap-1.5 font-bold text-[10px] sm:text-xs mt-1 px-3 py-1 rounded-md border w-full justify-center shadow-sm backdrop-blur-sm ${pointsBadgeColor}`}>
                      <Award size={14} /> 
                      <span>{points} pts</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          ) : status === 'SCHEDULED' && !isLocked ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <input 
                  type="number" 
                  min="0"
                  value={displayHome}
                  onChange={(e) => onGuessChange && onGuessChange('home', e.target.value)}
                  className="w-16 sm:w-15 h-15 sm:h-20 bg-background/50 border border-border rounded-xl text-center text-3xl sm:text-4xl font-display font-bold text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="-"
                />
                <span className="text-xl sm:text-2xl font-display text-slate-600 font-bold">:</span>
                <input 
                  type="number" 
                  min="0"
                  value={displayAway}
                  onChange={(e) => onGuessChange && onGuessChange('away', e.target.value)}
                  className="w-16 sm:w-15 h-15 sm:h-20 bg-background/50 border border-border rounded-xl text-center text-3xl sm:text-4xl font-display font-bold text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="-"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-4xl sm:text-5xl font-display font-bold text-white">
                  {status === 'SCHEDULED' ? '-' : (homeScore ?? 0)}
                </span>
                <span className="text-xl sm:text-2xl font-display text-slate-600 font-bold">:</span>
                <span className="text-4xl sm:text-5xl font-display font-bold text-white">
                  {status === 'SCHEDULED' ? '-' : (awayScore ?? 0)}
                </span>
              </div>
              
              {userGuess && (
                <span className="text-[10px] sm:text-xs text-slate-300 font-medium bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 mt-1 backdrop-blur-sm shadow-sm">
                  Seu palpite: <strong className="text-white">{userGuess.home_guess} - {userGuess.away_guess}</strong>
                </span>
              )}
            </div>
          )}
          
        </div>

        {/* TIME VISITANTE */}
        <div className={`flex flex-col items-center flex-1 transition-all duration-500 ${awayOpacityClass}`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2">
            <img 
              src={awayTeam?.logo_url || fallbackLogo} 
              alt={awayTeam?.name || 'A Definir'} 
              className="max-w-full max-h-full object-contain drop-shadow-lg"
            />
          </div>
          <span className={`mt-2 font-bold text-sm sm:text-base uppercase tracking-wide text-center transition-colors ${awayTextClass}`}>
            {awayTeam?.short_code || 'TBA'}
          </span>
        </div>
        
      </div>
    </div>
  );
}