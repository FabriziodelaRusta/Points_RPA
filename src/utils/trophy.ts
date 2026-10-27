import { MemberSummary } from '../types/rpa';

export interface SportTrophyStatus {
  eligible: boolean;
  randos: number; // nombre de randos obligatoires (min 10)
  fleches: number; // nombre de flèches-relais ou diagonales
  totalQualifyingSorties: number; // min 20 sorties (randos + flèches)
  qualifyingKm: number; // min 1600 km pour ces sorties
}

/**
 * Règle d'attribution de l'icône coupe sportive (en exposant à côté du nom) :
 * - Au minimum 20 randonnées (hors voyages et séjours)
 * - Dont 10 sont obligatoirement des randonnées
 * - Les 10 autres peuvent être des flèches relais ou diagonales (ou d'autres randos)
 * - Kilométrage cumulé pour ces randos d'au minimum 1600 km
 */
export function checkSportTrophy(member: MemberSummary): SportTrophyStatus {
  const randos = member.totalRandos || 0;
  const fleches = member.specials?.frCount || 0;
  const totalQualifyingSorties = randos + fleches;
  const qualifyingKm =
    Math.round(((member.totalKm || 0) + (member.specials?.frKm || 0)) * 10) / 10;

  const eligible =
    randos >= 10 && totalQualifyingSorties >= 20 && qualifyingKm >= 1600;

  return {
    eligible,
    randos,
    fleches,
    totalQualifyingSorties,
    qualifyingKm,
  };
}
