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
