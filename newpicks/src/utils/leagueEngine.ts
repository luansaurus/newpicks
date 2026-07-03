// utils/leagueEngine.ts

export function calculateGuessPoints(
  homeScore: number,
  awayScore: number,
  homeGuess: number,
  awayGuess: number,
  rules: any,
  isPlayoff: boolean = false,
  homePenalty?: number,
  awayPenalty?: number,
  penaltyWinnerGuess?: 'home' | 'away' | null
): { pts: number; color: 'GREEN' | 'BLUE' | 'YELLOW' | 'RED' } {
  let pts = 0;
  let color: 'GREEN' | 'BLUE' | 'YELLOW' | 'RED' = 'RED';

  // Verifica se o placar foi exato
  if (homeScore === homeGuess && awayScore === awayGuess) {
    pts += rules.rule_exact_score || 5;
    color = 'GREEN';
  } 
  // Verifica se acertou o vencedor e o saldo (ou empate)
  else if (homeScore - awayScore === homeGuess - awayGuess) {
    pts += rules.rule_goal_diff || 3;
    color = 'BLUE';
  } 
  // Verifica se acertou apenas o vencedor
  else if (
    (homeScore > awayScore && homeGuess > awayGuess) ||
    (homeScore < awayScore && homeGuess < awayGuess) ||
    (homeScore === awayScore && homeGuess === awayGuess)
  ) {
    pts += rules.rule_winner || 2;
    color = 'YELLOW';
  }

  // Bônus por acertar o vencedor dos pênaltis (apenas em caso de empate)
  if (
    homeScore === awayScore && 
    isPlayoff && 
    penaltyWinnerGuess &&
    homePenalty !== undefined && 
    awayPenalty !== undefined
  ) {
    const actualWinner = homePenalty > awayPenalty ? 'home' : 'away';
    if (penaltyWinnerGuess === actualWinner) {
      pts += rules.penalty_winner_points || 1;
      // Se acertou o vencedor dos pênaltis, sobe a cor para GREEN se ainda não for
      if (color === 'YELLOW' || color === 'BLUE') {
        color = 'GREEN';
      }
    }
  }

  // Multiplicador para fases eliminatórias (aplica-se a todos os pontos)
  if (isPlayoff && rules.playoff_multiplier && rules.playoff_multiplier > 1) {
    pts = Math.round(pts * rules.playoff_multiplier);
  }

  return { pts, color };
}

export function isPlayoffPhase(phase: string): boolean {
  const playoffPhases = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];
  return playoffPhases.includes(phase);
}

export const GLOBAL_LEAGUE_RULES = {
  rule_exact_score: 5,
  rule_goal_diff: 3,
  rule_winner: 2,
  playoff_multiplier: 2.0,
  penalty_winner_points: 1
};