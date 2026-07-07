import { Clock, Radio, Award, X, Lock, Trophy } from 'lucide-react';

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
  homePenalties?: number;
  awayPenalties?: number;
  onClick?: () => void;
  guessHome?: string;
  guessAway?: string;
  penaltyWinnerGuess?: 'home' | 'away' | null;
  showPenaltySelector?: boolean;
  onGuessChange?: (side: 'home' | 'away' | 'penaltyWinner', value: string) => void;
  userGuess?: { 
    home_guess: number; 
    away_guess: number;
    penalty_winner_guess?: 'home' | 'away' | null;
  } | null;
  points?: number;
  pointColor?: 'GREEN' | 'BLUE' | 'YELLOW' | 'RED' | null;
  isLocked?: boolean;
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
  penaltyWinnerGuess,
  showPenaltySelector = false,
  onGuessChange,
  userGuess,
  points,
  pointColor = 'RED',
  isLocked = false
}: MatchCardProps) {
  
  // Verifica se o jogo está bloqueado por tempo (15 minutos antes)
  const isLockedByTime = new Date(matchDate).getTime() - new Date().getTime() < 15 * 60 * 1000;
  const locked = isLocked || isLockedByTime;

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

  const getSafeLogo = (team: Team | null) => {
    if (!team || !team.logo_url || team.logo_url.trim() === '') return fallbackLogo;
    return team.logo_url;
  };

  const getSafeCode = (team: Team | null) => {
    if (!team) return 'TBA';
    if (team.short_code && team.short_code.trim() !== '') return team.short_code;
    if (team.name && team.name.trim() !== '') return team.name.substring(0, 3).toUpperCase();
    return 'TBA';
  };

  const displayHome = guessHome ?? (userGuess?.home_guess?.toString() || '');
  const displayAway = guessAway ?? (userGuess?.away_guess?.toString() || '');
  const displayPenaltyWinner = penaltyWinnerGuess ?? userGuess?.penalty_winner_guess ?? null;

  // --- LÓGICA DE CORES ---
  let cardBorderColor = 'border-2 border-border';
  let cardBgColor = 'bg-card';
  let pointsBadgeColor = 'text-slate-400 bg-slate-800';
  let shadowColor = '';
  let cardExtraClass = '';

  // 1. JOGO EM ANDAMENTO (IN_PLAY) - Roxo/Índigo
  if (status === 'IN_PLAY') {
    cardBorderColor = 'border-2 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.15)]';
    cardBgColor = 'bg-indigo-500/5';
    shadowColor = 'shadow-indigo-500/5';
    cardExtraClass = 'animate-pulse-slow';
  }
  // 2. JOGO BLOQUEADO (15 min antes)
  else if (status === 'SCHEDULED' && locked) {
    cardBorderColor = 'border-2 border-slate-600/40 shadow-[0_0_10px_rgba(100,116,139,0.05)]';
    cardBgColor = 'bg-slate-800/30';
    shadowColor = 'shadow-slate-600/5';
    cardExtraClass = 'opacity-80';
  }
  // 3. JOGO FINALIZADO
  else if (status === 'FINISHED' && points !== undefined && points !== null) {
    if (points > 0) {
      // Acertou algo - cores positivas
      if (pointColor === 'GREEN') {
        cardBorderColor = 'border-2 border-green-500/60 shadow-[0_0_15px_rgba(34,197,94,0.15)]';
        cardBgColor = 'bg-green-500/10';
        pointsBadgeColor = 'text-green-400 bg-green-500/20 border-green-500/30';
        shadowColor = 'shadow-green-500/10';
      } else if (pointColor === 'BLUE') {
        cardBorderColor = 'border-2 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
        cardBgColor = 'bg-blue-500/10';
        pointsBadgeColor = 'text-blue-400 bg-blue-500/20 border-blue-500/30';
        shadowColor = 'shadow-blue-500/10';
      } else if (pointColor === 'YELLOW') {
        cardBorderColor = 'border-2 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.15)]';
        cardBgColor = 'bg-yellow-500/10';
        pointsBadgeColor = 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
        shadowColor = 'shadow-yellow-500/10';
      } else {
        // RED - Errou o palpite (mas ganhou pontos parciais)
        cardBorderColor = 'border-2 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
        cardBgColor = 'bg-red-500/10';
        pointsBadgeColor = 'text-red-400 bg-red-500/20 border-red-500/30';
        shadowColor = 'shadow-red-500/10';
      }
    } else if (points === 0) {
      // RED - Errou completamente (0 pontos)
      cardBorderColor = 'border-2 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
      cardBgColor = 'bg-red-500/10';
      pointsBadgeColor = 'text-red-400 bg-red-500/20 border-red-500/30';
      shadowColor = 'shadow-red-500/10';
    }
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
      } ${shadowColor} ${cardExtraClass}`}
    >
      <div className="flex justify-center mb-4">
        {renderStatusBadge()}
      </div>

      <div className="flex items-center justify-between">
        
        {/* TIME DA CASA */}
        <div className={`flex flex-col items-center flex-1 transition-all duration-500 ${homeOpacityClass}`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2">
            <img 
              src={getSafeLogo(homeTeam)} 
              alt={homeTeam?.name || 'A Definir'} 
              className="max-w-full max-h-full object-contain drop-shadow-lg"
              onError={(e) => { e.currentTarget.src = fallbackLogo; }}
            />
          </div>
          <span className={`mt-2 font-bold text-sm sm:text-base uppercase tracking-wide text-center transition-colors ${homeTextClass}`}>
            {getSafeCode(homeTeam)}
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

              {homePenalties !== undefined && awayPenalties !== undefined && homeScore === awayScore && (
                <div className="text-[10px] sm:text-xs font-bold text-slate-300 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50 mb-1">
                  ({homePenalties}) Pênaltis ({awayPenalties})
                </div>
              )}
              
              {userGuess && (
                <div className="flex flex-col items-center gap-1 mt-1 w-full">
                  <span className="text-[10px] sm:text-xs text-slate-300 font-medium bg-slate-950/60 px-3 py-1 rounded-md border border-slate-800 backdrop-blur-sm shadow-sm">
                    Palpite: <strong className="text-white">{userGuess.home_guess} : {userGuess.away_guess}</strong>
                    <br />
                    {userGuess.penalty_winner_guess && (
                      <span className="ml-1 text-xs">
                        <Trophy size={12} className="inline-block mr-1" />
                        {userGuess.penalty_winner_guess === 'home' 
                          ? `${homeTeam?.short_code || 'Casa'} nos pênaltis` 
                          : `${awayTeam?.short_code || 'Fora'} nos pênaltis`}
                      </span>
                    )}
                  </span>
                  
                  {points !== undefined && points > 0 ? (
                    <div className={`flex items-center gap-1.5 font-bold text-[10px] sm:text-xs mt-1 px-3 py-1 rounded-md border w-full justify-center shadow-sm backdrop-blur-sm ${pointsBadgeColor}`}>
                      <Award size={14} /> 
                      <span>+{points} pts</span>
                    </div>
                  ) : points === 0 && (
                    <div className="flex items-center gap-1.5 font-bold text-[10px] sm:text-xs mt-1 px-3 py-1 rounded-md border w-full justify-center shadow-sm backdrop-blur-sm text-red-400 bg-red-500/20 border-red-500/30">
                      <X size={14} /> 
                      <span>0 pts</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          ) : status === 'SCHEDULED' && locked ? (
            // JOGO BLOQUEADO - 15 minutos antes
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 sm:gap-4 opacity-60">
                <span className="text-4xl sm:text-5xl font-display font-bold text-slate-500">-</span>
                <span className="text-xl sm:text-2xl font-display text-slate-600 font-bold">:</span>
                <span className="text-4xl sm:text-5xl font-display font-bold text-slate-500">-</span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-1.5">
                <Lock size={12} className="text-slate-500" />
                Palpites bloqueados
              </div>
              {userGuess && (
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 mt-1">
                  Seu palpite: <strong className="text-white">{userGuess.home_guess} - {userGuess.away_guess}</strong>
                  {userGuess.penalty_winner_guess && (
                    <span className="ml-1 text-xs">
                      {userGuess.penalty_winner_guess === 'home' 
                        ? `🏆 ${homeTeam?.short_code || 'Casa'}` 
                        : `🏆 ${awayTeam?.short_code || 'Fora'}`}
                    </span>
                  )}
                </span>
              )}
            </div>

          ) : status === 'SCHEDULED' && !locked ? (
            // JOGO DISPONÍVEL PARA PALPITES
            <div className="flex flex-col items-center gap-3">
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

              {/* Seletor de vencedor nos pênaltis - aparece APENAS se showPenaltySelector for true */}
              {showPenaltySelector && (
                <div className="w-full pt-2 border-t border-border/50 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider whitespace-nowrap">
                      Pênaltis:
                    </span>
                    <div className="flex gap-1.5 flex-1">
                      <button
                        onClick={() => onGuessChange?.('penaltyWinner', 'home')}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          displayPenaltyWinner === 'home'
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background/30 border-border hover:bg-background/50 text-slate-400'
                        } border`}
                      >
                        {homeTeam?.short_code || 'Casa'}
                      </button>
                      <button
                        onClick={() => onGuessChange?.('penaltyWinner', 'away')}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all ${
                          displayPenaltyWinner === 'away'
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-background/30 border-border hover:bg-background/50 text-slate-400'
                        } border`}
                      >
                        {awayTeam?.short_code || 'Fora'}
                      </button>
                      {displayPenaltyWinner && (
                        <button
                          onClick={() => onGuessChange?.('penaltyWinner', '')}
                          className="py-1 px-2 rounded-lg text-[10px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          ) : (
            // IN_PLAY - mostra placar ao vivo com destaque
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-4xl sm:text-5xl font-display font-bold text-white drop-shadow-md">
                  {homeScore ?? 0}
                </span>
                <span className="text-xl sm:text-2xl font-display text-slate-500 font-bold">:</span>
                <span className="text-4xl sm:text-5xl font-display font-bold text-white drop-shadow-md">
                  {awayScore ?? 0}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider animate-pulse">
                <Radio size={10} className="animate-pulse" />
                AO VIVO
              </div>
              
              {userGuess && (
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 mt-1">
                  Seu palpite: <strong className="text-white">{userGuess.home_guess} - {userGuess.away_guess}</strong>
                  {userGuess.penalty_winner_guess && (
                    <span className="ml-1 text-xs">
                      {userGuess.penalty_winner_guess === 'home' 
                        ? `🏆 ${homeTeam?.short_code || 'Casa'}` 
                        : `🏆 ${awayTeam?.short_code || 'Fora'}`}
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
          
        </div>

        {/* TIME VISITANTE */}
        <div className={`flex flex-col items-center flex-1 transition-all duration-500 ${awayOpacityClass}`}>
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2">
            <img 
              src={getSafeLogo(awayTeam)} 
              alt={awayTeam?.name || 'A Definir'} 
              className="max-w-full max-h-full object-contain drop-shadow-lg"
              onError={(e) => { e.currentTarget.src = fallbackLogo; }}
            />
          </div>
          <span className={`mt-2 font-bold text-sm sm:text-base uppercase tracking-wide text-center transition-colors ${awayTextClass}`}>
            {getSafeCode(awayTeam)}
          </span>
        </div>
        
      </div>
    </div>
  );
}