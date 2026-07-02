export interface LeagueRules {
  id: string | null;
  rule_exact_score: number;
  rule_goal_diff: number;
  rule_winner: number;
  playoff_multiplier: number;
}

export const GLOBAL_LEAGUE_RULES: LeagueRules = {
  id: null,
  rule_exact_score: 5,
  rule_goal_diff: 3,
  rule_winner: 2,
  playoff_multiplier: 2.0
};

// Verifica se a fase é mata-mata (não é grupo)
export const isPlayoffPhase = (phase: string) => {
  if (!phase) return false;
  return !phase.toLowerCase().includes('group');
};

export function calculateGuessPoints(
  homeScore: number, 
  awayScore: number, 
  homeGuess: number, 
  awayGuess: number, 
  leagueRules: LeagueRules, 
  isPlayoff: boolean,
  homePenalties?: number,
  awayPenalties?: number
): { pts: number, color: 'GREEN' | 'BLUE' | 'YELLOW' | 'RED' } {
  
  // Define o vencedor real (considerando pênaltis para o desempate, se houver)
  let actualHomeScore = homeScore;
  let actualAwayScore = awayScore;

  if (homeScore === awayScore && homePenalties !== undefined && awayPenalties !== undefined) {
     actualHomeScore = homeScore + (homePenalties > awayPenalties ? 1 : 0);
     actualAwayScore = awayScore + (awayPenalties > homePenalties ? 1 : 0);
  }

  // 1. Mapeia as regras ativas
  const availableTiers = [];
  if (leagueRules.rule_exact_score > 0) availableTiers.push({ id: 'EXACT', pts: leagueRules.rule_exact_score, color: 'GRAY' });
  if (leagueRules.rule_goal_diff > 0) availableTiers.push({ id: 'DIFF', pts: leagueRules.rule_goal_diff, color: 'GRAY' });
  if (leagueRules.rule_winner > 0) availableTiers.push({ id: 'WINNER', pts: leagueRules.rule_winner, color: 'GRAY' });

  // 2. Ordena para definir as cores dinâmicas (Maior = Verde)
  availableTiers.sort((a, b) => b.pts - a.pts);
  const palette: ('GREEN' | 'BLUE' | 'YELLOW')[] = ['GREEN', 'BLUE', 'YELLOW'];
  availableTiers.forEach((tier, index) => {
    tier.color = palette[index] || 'GRAY';
  });

  // 3. Descobre a qualificação do palpite
  let hitTier = null;
  if (homeScore === homeGuess && awayScore === awayGuess) {
    hitTier = 'EXACT';
  } else if ((homeScore - awayScore) === (homeGuess - awayGuess)) {
    hitTier = 'DIFF';
  } else if (Math.sign(actualHomeScore - actualAwayScore) === Math.sign(homeGuess - awayGuess)) {
    hitTier = 'WINNER';
  }

  if (!hitTier) return { pts: 0, color: 'RED' };
  
  const tierData = availableTiers.find(t => t.id === hitTier);
  if (!tierData) return { pts: 0, color: 'RED' }; // Regra desativada na liga

  // 4. Aplica Multiplicador (Se existir e for mata-mata)
  let finalPts = tierData.pts;
  if (isPlayoff && leagueRules.playoff_multiplier > 1) {
    finalPts *= leagueRules.playoff_multiplier;
  }

  return { pts: finalPts, color: tierData.color as any };
}