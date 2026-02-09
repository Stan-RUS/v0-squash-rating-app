export interface RatingSettings {
  starting_rating: number
  k_calibration: number
  k_normal: number
  k_veteran: number
  calibration_matches: number
  veteran_matches: number
  veteran_rating: number
  weight_friendly: number
  weight_ladder: number
  weight_league: number
  weight_tournament_group: number
  weight_tournament_playoffs: number
  weight_final: number
  anti_boost_threshold: number
  anti_boost_strong_wins: number
  anti_boost_strong_loses: number
  inactivity_days: number
  return_k_multiplier: number
  return_matches: number
}

export function getKFactor(
  player: { matches_count: number; rating: number; calibration_matches_count: number },
  settings: RatingSettings
): number {
  if (player.calibration_matches_count < settings.calibration_matches) {
    return settings.k_calibration
  }
  if (
    player.matches_count >= settings.veteran_matches &&
    player.rating >= settings.veteran_rating
  ) {
    return settings.k_veteran
  }
  return settings.k_normal
}

export function getMatchWeight(
  matchType: string,
  settings: RatingSettings
): number {
  const weights: Record<string, number> = {
    friendly: settings.weight_friendly,
    ladder: settings.weight_ladder,
    league: settings.weight_league,
    tournament_group: settings.weight_tournament_group,
    tournament_playoffs: settings.weight_tournament_playoffs,
    final: settings.weight_final,
  }
  return weights[matchType] ?? 1.0
}

export function calculateExpected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  kA: number,
  matchWeight: number,
  antiBoostThreshold: number,
  antiBoostStrongWins: number,
  antiBoostStrongLoses: number
): { deltaA: number; deltaB: number } {
  const expectedA = calculateExpected(ratingA, ratingB)
  const actualA = scoreA > scoreB ? 1 : 0

  let rawDeltaA = kA * (actualA - expectedA) * matchWeight

  // Anti-boost: if strong player (higher rated by threshold) beats weak
  const ratingDiff = Math.abs(ratingA - ratingB)
  if (ratingDiff >= antiBoostThreshold) {
    if (ratingA > ratingB && actualA === 1) {
      rawDeltaA *= antiBoostStrongWins
    } else if (ratingA > ratingB && actualA === 0) {
      rawDeltaA *= antiBoostStrongLoses
    } else if (ratingA < ratingB && actualA === 0) {
      rawDeltaA *= antiBoostStrongWins
    } else if (ratingA < ratingB && actualA === 1) {
      rawDeltaA *= antiBoostStrongLoses
    }
  }

  const deltaA = Math.round(rawDeltaA)
  const deltaB = -deltaA

  return { deltaA, deltaB }
}

export const MATCH_TYPE_LABELS: Record<string, string> = {
  friendly: "Товарищеский",
  ladder: "Лестница",
  league: "Лига",
  tournament_group: "Турнир (группа)",
  tournament_playoffs: "Турнир (плей-офф)",
  final: "Финал",
}

export const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждён",
  rejected: "Отклонён",
  disputed: "Спор",
  voided: "Аннулирован",
}
