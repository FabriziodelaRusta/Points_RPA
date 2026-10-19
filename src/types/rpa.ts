export interface RandoRecord {
  id: string;
  dateStr: string;
  parsedDate: Date;
  randoName: string; // 2nd field
  rawNom: string; // 3rd field
  rawPrenom?: string; // 4th field if separate
  fullMemberName: string;
  sourceFile: string;
  weekNumber: number;
  weekYear: number;
  weekKey: string;
  rawLine: string;
  km: number; // distance in km
  isSpecialActivity?: boolean;
  specialType?: 'FR' | 'VOYAGE' | 'SEJOUR';
  tripName?: string; // Nom extrait du voyage/séjour (ex: col 5 après 'Voyage :')
  rawCol5?: string; // Champ 5 brut du fichier CSV
}

export interface DistinctTripGroup {
  tripType: 'FR' | 'VOYAGE' | 'SEJOUR';
  tripName: string; // Ex: "Corse", "Cantal" (nom brut nettoyé pour affichage)
  tripKey: string; // Clé normalisée pour regrouper (ex: "corse")
  count: number; // Nombre d'entrées / étapes pour ce voyage/séjour (ex: 10)
  km: number; // Total km parcourus sur ce voyage/séjour
  records: RandoRecord[];
  weeklyKm: Record<string, number>;
}

export interface MemberSpecialSummary {
  frCount: number;
  frKm: number;
  frRecords: RandoRecord[];
  frTrips?: DistinctTripGroup[];
  voyageCount: number;
  voyageKm: number;
  voyageRecords: RandoRecord[];
  voyageTrips: DistinctTripGroup[];
  sejourCount: number;
  sejourKm: number;
  sejourRecords: RandoRecord[];
  sejourTrips: DistinctTripGroup[];
}

export interface WeekInfo {
  weekKey: string;
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  startFormatted: string;
  endFormatted: string;
  colLetter: string; // LibreOffice Calc column letter (e.g., E, F, G...)
  headerLabel: string;
}

export interface MemberSummary {
  memberName: string;
  totalRandos: number; // total participations across season
  activeWeeksCount: number; // count of 'x' (points)
  totalKm: number; // total km traveled
  participationsByWeek: Record<string, RandoRecord[]>;
  records: RandoRecord[];
  specials?: MemberSpecialSummary;
}

export interface SeasonInfo {
  selectedYear: number;
  seasonStartDate: Date;
  seasonEndDate: Date;
  isAfterNov1: boolean;
  currentYear: number;
  previousYear: number;
  expectedFiles: string[];
  ruleExplanation: string;
  referenceDate: Date;
}
