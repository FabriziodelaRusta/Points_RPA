import { RandoRecord, MemberSummary, WeekInfo } from '../types/rpa';
import {
  parseFrenchOrIsoDate,
  getIsoWeek,
  getMondayAndSunday,
  formatShortDate,
  getCalcColLetter,
  isDateInSeason,
} from './dateAndWeek';

/**
 * Detects the delimiter with ';' as the primary standard
 */
export function detectDelimiter(csvText: string): string {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  let semicolons = 0;
  let commas = 0;

  for (const line of lines) {
    semicolons += (line.match(/;/g) || []).length;
    commas += (line.match(/,/g) || []).length;
  }

  if (semicolons > 0 || commas === 0) return ';';
  return ',';
}

/**
 * Découpe une ligne CSV selon la spécification exacte :
 * - Séparateur de champs : ';'
 * - Valeur de chaque champ entourée de guillemets doubles (")
 * - Les apostrophes simples (') sont du texte normal (ex: d'Allain, l'Étang) et ne délimitent JAMAIS les champs
 * - Gestion des guillemets échappés ("") selon la norme CSV standard
 */
export function parseCsvLine(line: string, delimiter: string = ';'): string[] {
  const fields: string[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    // Ignorer les éventuels espaces blancs avant le champ
    while (i < len && (line[i] === ' ' || line[i] === '\t')) {
      i++;
    }

    if (i >= len) {
      break;
    }

    if (line[i] === '"') {
      // Champ entouré de guillemets doubles (")
      i++; // Sauter le guillemet ouvrant
      let val = '';
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') {
            // Guillemet échappé ("") -> insérer un seul guillemet
            val += '"';
            i += 2;
          } else {
            // Guillemet fermant
            i++;
            break;
          }
        } else {
          val += line[i];
          i++;
        }
      }
      fields.push(val.trim());

      // Avancer jusqu'au prochain séparateur ou fin de ligne
      while (i < len && line[i] !== delimiter) {
        i++;
      }
      if (i < len && line[i] === delimiter) {
        i++; // Sauter le délimiteur ';'
        // Si le séparateur termine la ligne, ajouter un champ vide final
        if (i === len) {
          fields.push('');
        }
      }
    } else {
      // Champ sans guillemets (sécurité de repli)
      let val = '';
      while (i < len && line[i] !== delimiter) {
        val += line[i];
        i++;
      }
      fields.push(val.trim());

      if (i < len && line[i] === delimiter) {
        i++; // Sauter le délimiteur ';'
        if (i === len) {
          fields.push('');
        }
      }
    }
  }

  return fields;
}

/**
 * Checks if a row looks like a header
 */
function isHeaderRow(fields: string[]): boolean {
  if (fields.length === 0) return false;
  const first = fields[0].toLowerCase();
  if (first.includes('date') || first.includes('jour') || first.includes('date rando')) {
    return true;
  }
  const parsed = parseFrenchOrIsoDate(fields[0]);
  return parsed === null && /[a-zA-Z]/.test(fields[0]);
}

/**
 * Extracts distance in km from Champ 3 (as explicitly requested:
 * "pour les km on doit extraire la valeur numerique du champ 3")
 * with intelligent fallback to Champ 4 or title if Champ 3 has no number.
 */
export function extractKmAndMemberName(
  field3Raw: string = '',
  field4Raw: string = '',
  randoTitle: string = ''
): { km: number; memberName: string } {
  const raw3 = (field3Raw || '').trim();
  const raw4 = (field4Raw || '').trim();

  let km = 0;
  let memberName = raw3;

  // 1. Extraire la valeur numérique des km (priorité champ 3, puis champ 4)
  const matchNum3 = raw3.match(/(\d+(?:[.,]\d+)?)/);
  if (matchNum3) {
    const val = parseFloat(matchNum3[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      km = val;
    }
  }

  if (km === 0 && raw4) {
    const matchNum4 = raw4.match(/(\d+(?:[.,]\d+)?)/);
    if (matchNum4) {
      const val = parseFloat(matchNum4[1].replace(',', '.'));
      if (!isNaN(val) && val > 0) {
        km = val;
      }
    }
  }

  // 2. Déterminer le nom du membre
  // Si le champ 3 contenait uniquement un nombre (km), le nom peut être dans le champ 4
  if (raw3 && /^\d+(?:[.,]\d+)?(?:\s*km)?$/i.test(raw3)) {
    memberName = raw4;
  } else if (!raw3 && raw4) {
    memberName = raw4;
  }

  // Si champ 3 contient à la fois du texte et un nombre (ex: "LECLERC Sabine 65 km")
  if (matchNum3 && memberName === raw3) {
    const stripped = raw3.replace(matchNum3[0], '').replace(/\bkm\b/i, '').replace(/["'()]/g, '').trim();
    if (stripped.length >= 2) {
      memberName = stripped;
    }
  }

  // 3. Repli : si km toujours 0, chercher dans le titre de la rando
  if (km === 0 && randoTitle) {
    const matchTitle = randoTitle.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kms)\b/i);
    if (matchTitle) {
      const val = parseFloat(matchTitle[1].replace(',', '.'));
      if (!isNaN(val) && val > 0) {
        km = val;
      }
    }
  }

  const cleanName = memberName.replace(/["']/g, '').replace(/\s+/g, ' ').trim() || 'Membre inconnu';
  return { km, memberName: cleanName };
}

/**
 * Parses raw CSV content according to user specifications:
 * - Séparateur : ;
 * - Champ 1 : Date
 * - Champ 2 : Randonnée / Destination
 * - Champ 3 : Nom et prénom (+ valeur numérique km extraite)
 * - Champ 4 : Distance ou info complémentaire
 */
export function parseRpaCsv(content: string, filename: string): RandoRecord[] {
  if (!content || !content.trim()) return [];

  const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const records: RandoRecord[] = [];
  const delimiter = detectDelimiter(content);

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx].trim();
    if (!line) continue;

    const fields = parseCsvLine(line, delimiter);
    if (fields.length === 0) continue;

    if (idx === 0 && isHeaderRow(fields)) {
      continue;
    }

    const dateStr = fields[0] || '';
    const parsedDate = parseFrenchOrIsoDate(dateStr);
    if (!parsedDate) continue;

    const randoName = (fields[1] || 'Rando').trim();
    const field3 = fields[2] || '';
    const field4 = fields[3] || '';

    const { km, memberName } = extractKmAndMemberName(field3, field4, randoName);
    const cleanMemberName = memberName || 'Membre inconnu';

    const { weekNumber, year: weekYear } = getIsoWeek(parsedDate);
    const weekKey = `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;

    records.push({
      id: `${filename}-${idx}-${dateStr}-${cleanMemberName}`,
      dateStr,
      parsedDate,
      randoName,
      rawNom: field3,
      fullMemberName: cleanMemberName,
      sourceFile: filename,
      weekNumber,
      weekYear,
      weekKey,
      rawLine: line,
      km,
    });
  }

  return records;
}

/**
 * Groups and sorts records according to user specifications:
 * - Filtrage strict de la saison (si targetYear est défini) :
 *   Pour l'année YYYY :
 *   - Lignes de l'année précédente >= 1er novembre (YYYY - 1)
 *   - Lignes de l'année courante < 1er novembre YYYY
 * - Regrouper les lignes par noms
 * - Trier par date (1er champ) et par nom (3e champ)
 */
export function processAllRecords(allRecords: RandoRecord[], targetYear?: number) {
  // Filtrage selon la saison demandée par l'utilisateur
  const filteredRecords = targetYear
    ? allRecords.filter((rec) => isDateInSeason(rec.parsedDate, targetYear))
    : allRecords;

  // Tri chronologique sur le 1er champ (Date), puis alphabétique sur le 3e champ (Nom)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.fullMemberName.localeCompare(b.fullMemberName, 'fr', { sensitivity: 'base' });
  });

  // Extraction de toutes les semaines uniques présentes dans les données filtrées
  const weekMap = new Map<string, { date: Date; weekNumber: number; year: number }>();

  for (const record of sortedRecords) {
    if (!weekMap.has(record.weekKey)) {
      weekMap.set(record.weekKey, {
        date: record.parsedDate,
        weekNumber: record.weekNumber,
        year: record.weekYear,
      });
    }
  }

  // Tri chronologique des semaines
  const sortedWeekKeys = Array.from(weekMap.keys()).sort((a, b) => {
    const itemA = weekMap.get(a)!;
    const itemB = weekMap.get(b)!;
    return itemA.date.getTime() - itemB.date.getTime();
  });

  // Construction des colonnes de semaines (Col E, F, G...)
  const weeks: WeekInfo[] = sortedWeekKeys.map((key, index) => {
    const { date, weekNumber, year } = weekMap.get(key)!;
    const { monday, sunday } = getMondayAndSunday(date);
    const startFormatted = formatShortDate(monday);
    const endFormatted = formatShortDate(sunday);

    return {
      weekKey: key,
      weekNumber,
      year,
      startDate: monday,
      endDate: sunday,
      startFormatted,
      endFormatted,
      colLetter: getCalcColLetter(index + 4), // Col E..N
      headerLabel: `S${weekNumber} (${startFormatted} - ${endFormatted})`,
    };
  });

  // Regroupement des lignes par noms
  const memberMap = new Map<string, MemberSummary>();

  for (const rec of sortedRecords) {
    const name = rec.fullMemberName;
    if (!memberMap.has(name)) {
      memberMap.set(name, {
        memberName: name,
        totalRandos: 0,
        activeWeeksCount: 0,
        totalKm: 0,
        participationsByWeek: {},
        records: [],
      });
    }

    const summary = memberMap.get(name)!;
    summary.totalRandos += 1; // Total des randonnées dans la saison
    summary.totalKm += rec.km; // Somme des km
    summary.records.push(rec);

    if (!summary.participationsByWeek[rec.weekKey]) {
      summary.participationsByWeek[rec.weekKey] = [];
    }
    summary.participationsByWeek[rec.weekKey].push(rec);
  }

  // Calcul du nombre de semaines avec 'x' (points) et arrondi des km
  for (const summary of memberMap.values()) {
    summary.activeWeeksCount = Object.keys(summary.participationsByWeek).length;
    summary.totalKm = Math.round(summary.totalKm * 10) / 10;
  }

  // Tri alphabétique des membres
  const members: MemberSummary[] = Array.from(memberMap.values()).sort((a, b) =>
    a.memberName.localeCompare(b.memberName, 'fr', { sensitivity: 'base' })
  );

  return {
    sortedRecords,
    weeks,
    members,
    totalBeforeFilter: allRecords.length,
    totalAfterFilter: sortedRecords.length,
    excludedCount: allRecords.length - sortedRecords.length,
  };
}
