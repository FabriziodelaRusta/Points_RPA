import { SeasonInfo, WeekInfo } from '../types/rpa';

/**
 * Returns the season rule and expected file names based on the target year and reference date.
 * Club season rule:
 * - Pour la saison YYYY (par exemple 2026), la période s'étend du 01/11/(YYYY - 1) au 31/10/YYYY.
 *   Exemple pour 2026 : du 01/11/2025 au 31/10/2026.
 *   Exemple pour 2025 : du 01/11/2024 au 31/10/2025.
 * - Fichiers concernés :
 *   - Lignes de (YYYY - 1).csv avec date >= 1er novembre (YYYY - 1)
 *   - Lignes de YYYY.csv avec date < 1er novembre YYYY
 */
export function getSeasonInfo(targetYear: number = 2026): SeasonInfo {
  const currentYear = targetYear;
  const previousYear = targetYear - 1;

  // Starts 1st November (targetYear - 1) (00:00:00)
  const seasonStartDate = new Date(previousYear, 10, 1, 0, 0, 0, 0);
  // Ends 1st November targetYear (exclusive, so up to 31/10/targetYear 23:59:59)
  const seasonEndDate = new Date(targetYear, 10, 1, 0, 0, 0, 0);

  const expectedFiles = [`${previousYear}.csv`, `${targetYear}.csv`];

  const ruleExplanation = `Saison ${targetYear} : du 01/11/${previousYear} au 31/10/${targetYear}. Fichier ${previousYear}.csv (lignes ≥ 01/11/${previousYear}) et ${targetYear}.csv (lignes < 01/11/${targetYear}).`;

  return {
    selectedYear: targetYear,
    seasonStartDate,
    seasonEndDate,
    isAfterNov1: false,
    currentYear: targetYear,
    previousYear: targetYear - 1,
    expectedFiles,
    ruleExplanation,
  };
}

/**
 * Checks if a given date falls within the selected season:
 * >= 1er novembre (targetYear - 1) AND < 1er novembre targetYear
 * Example for 2026: >= 01/11/2025 AND < 01/11/2026
 */
export function isDateInSeason(d: Date, targetYear: number): boolean {
  const start = new Date(targetYear - 1, 10, 1, 0, 0, 0, 0).getTime();
  const end = new Date(targetYear, 10, 1, 0, 0, 0, 0).getTime();
  const t = d.getTime();
  return t >= start && t < end;
}

/**
 * Formats a date into DD/MM/YYYY
 */
export function formatDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parses common French and ISO date formats:
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
 * - YYYY-MM-DD
 * - D/M/YYYY
 */
export function parseFrenchOrIsoDate(rawStr: string): Date | null {
  if (!rawStr) return null;
  const clean = rawStr.replace(/^["']+|["']+$/g, '').trim();

  // Try standard ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(y, m, d));
  }

  // Try French format DD/MM/YYYY or DD-MM-YYYY
  const frMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (frMatch) {
    const d = parseInt(frMatch[1], 10);
    const m = parseInt(frMatch[2], 10) - 1;
    const y = parseInt(frMatch[3], 10);
    return new Date(Date.UTC(y, m, d));
  }

  const fallback = new Date(clean);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

/**
 * Calculates Monday (start of week) and Sunday (end of week) for a given date.
 * Weeks strictly start on Monday.
 */
export function getMondayAndSunday(d: Date): { monday: Date; sunday: Date } {
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59);

  return { monday, sunday };
}

/**
 * Computes ISO 8601 week number (starting on Monday)
 */
export function getIsoWeek(d: Date): { weekNumber: number; year: number } {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setDate(target.getDate() - dayNr + 3); // Nearest Thursday
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { weekNumber, year: target.getFullYear() };
}

/**
 * Generates Calc column letters: 0 -> A, 1 -> B, 25 -> Z, 26 -> AA...
 */
export function getCalcColLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Formats a short date: DD/MM
 */
export function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Builds week information object
 */
export function buildWeekInfo(date: Date, colIndex: number): WeekInfo {
  const { monday, sunday } = getMondayAndSunday(date);
  const { weekNumber, year } = getIsoWeek(date);
  const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;
  const startFormatted = formatShortDate(monday);
  const endFormatted = formatShortDate(sunday);

  return {
    weekKey,
    weekNumber,
    year,
    startDate: monday,
    endDate: sunday,
    startFormatted,
    endFormatted,
    colLetter: getCalcColLetter(colIndex),
    headerLabel: `S${weekNumber} (${startFormatted} - ${endFormatted})`,
  };
}

/**
 * Computes total number of calendar weeks spanning the season
 * (from 1st November targetYear - 1 to 31st October targetYear)
 */
export function getSeasonTotalWeeks(targetYear: number): number {
  const start = new Date(targetYear - 1, 10, 1, 0, 0, 0, 0);
  const end = new Date(targetYear, 9, 31, 23, 59, 59, 999);
  const weekKeys = new Set<string>();
  const curr = new Date(start);
  while (curr <= end) {
    const { weekNumber, year } = getIsoWeek(curr);
    weekKeys.add(`${year}-W${String(weekNumber).padStart(2, '0')}`);
    curr.setDate(curr.getDate() + 1);
  }
  return weekKeys.size || 52;
}
