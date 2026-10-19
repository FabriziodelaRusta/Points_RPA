import { RandoRecord, MemberSummary, WeekInfo, DistinctTripGroup } from '../types/rpa';
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
 * Normalise un texte en retirant les accents et en gérant les éventuels
 * caractères de remplacement liés à un encodage ANSI/Windows-1252 (ex: Séjour, Sjour, Sejour -> sejour)
 */
export function cleanFrenchText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\uFFFD\?]/g, 'e')
    .replace(/["']/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Normalise le nom d'un voyage ou d'un séjour pour le décompte :
 * - Retire les accents
 * - Retire les mentions d'étapes (ex: "- Étape 1", "Jour 2", "J1")
 * - Retire les dates présentes dans le titre (ex: 12/06/2026, 12/06)
 * - Retire les numéros entre parenthèses ex: (1/10), (1)
 * -> Ainsi, si 10 lignes ont des dates différentes mais le même nom de voyage, cela compte pour 1 seul voyage !
 */
export function normalizeTripName(name: string): string {
  let s = cleanFrenchText(name);
  s = s.replace(/[-–—:]?\s*(?:etape|etapes|jour|jours|j)\s*\d+/gi, '');
  s = s.replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, '');
  s = s.replace(/\(\s*(?:etape|jour|j)?\s*\d*(?:\s*\/\s*\d+)?\s*\)/gi, '');
  s = s.replace(/\(\s*\)/g, '');
  s = s.replace(/^[-–—:.,\s]+|[-–—:.,\s]+$/g, '').replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Regroupe les enregistrements d'une personne par voyage ou séjour unique.
 * Règle utilisateur absolue :
 * "s'il y a 10 lignes a des dates differentes mais le meme nom de voyage pour la meme personne : cela fait un seul voyage. pareil pour les sejours"
 */
export function groupRecordsIntoTrips(
  records: RandoRecord[],
  type: 'FR' | 'VOYAGE' | 'SEJOUR'
): DistinctTripGroup[] {
  if (!records || records.length === 0) return [];

  const map = new Map<string, DistinctTripGroup>();

  for (const rec of records) {
    // Nom affiché : provenant de col 5 après 'voyage :' ou 'séjour :'
    const displayTripName =
      rec.tripName ||
      (type === 'VOYAGE' ? 'Voyage' : type === 'SEJOUR' ? 'Séjour' : 'Flèche-Relais');

    // Clé normalisée de déduplication :
    const tripKey =
      normalizeTripName(displayTripName) ||
      normalizeTripName(rec.randoName) ||
      type.toLowerCase();

    if (!map.has(tripKey)) {
      map.set(tripKey, {
        tripType: type,
        tripName: displayTripName,
        tripKey,
        count: 0,
        km: 0,
        records: [],
        weeklyKm: {},
      });
    }

    const group = map.get(tripKey)!;
    group.count += 1; // 1 entrée dans le fichier pour cette étape / sortie
    group.km = Math.round((group.km + rec.km) * 10) / 10;
    group.records.push(rec);

    if (!group.weeklyKm[rec.weekKey]) {
      group.weeklyKm[rec.weekKey] = 0;
    }
    group.weeklyKm[rec.weekKey] = Math.round((group.weeklyKm[rec.weekKey] + rec.km) * 10) / 10;
  }

  return Array.from(map.values());
}

/**
 * Lit un fichier en détectant intelligemment son encodage :
 * 1. Tente UTF-8 strict (échoue si octets non-UTF8 valides)
 * 2. Repli automatique sur Windows-1252 / ISO-8859-1 (standard des exports CSV sous Windows / Vélo-liberté / Excel en France)
 */
export async function readUploadedFileAsText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    const win1252Decoder = new TextDecoder('windows-1252');
    return win1252Decoder.decode(buffer);
  }
}

/**
 * Détecte si un nom de fichier correspond aux fichiers d'activités spéciales :
 * - Fichiers dont le nom contient FR (Flèches-Relais)
 * - Fichiers dont le nom contient VOY (Voyages / Séjours)
 * - Fichiers contenant FL ou SEJ
 */
export function isSpecialActivityFile(filename: string): boolean {
  if (!filename) return false;
  const base = cleanFrenchText(filename.replace(/\.[^/.]+$/, ''));
  return /(?:fr|voy|fl|sej)/i.test(base);
}

/**
 * Détecte si un texte fait référence à un Séjour, en gérant toutes les formes
 * d'accents, encodages ANSI/Windows-1252 (Sjour, S?jour) ou double encodage UTF-8 (SÃ©jour).
 */
export function isSejourText(text: string): boolean {
  if (!text) return false;
  if (/s(?:[eéèêë\uFFFD\?_]|\u00C3\u00A9|\u00E9|\u00C3.|\u00E8)?jour/i.test(text)) return true;
  const c = cleanFrenchText(text);
  return c.includes('sejour') || c.startsWith('sejour') || /\bsej\b/i.test(c);
}

/**
 * Détecte si un texte fait référence à un Voyage.
 */
export function isVoyageText(text: string): boolean {
  if (!text) return false;
  if (/voyage/i.test(text)) return true;
  const c = cleanFrenchText(text);
  return c.includes('voyage') || c.startsWith('voyage') || /\bvoy\b/i.test(c);
}

/**
 * Détecte si un texte fait référence à des Flèches-Relais.
 */
export function isFlecheRelaisText(text: string): boolean {
  if (!text) return false;
  if (/fl[eéèêë\uFFFD\?_]?che/i.test(text) || /relais/i.test(text) || /\bfr\b/i.test(text)) return true;
  const c = cleanFrenchText(text);
  return c.includes('fleche') || c.includes('relais') || /\bfr\b/i.test(c);
}

/**
 * Extrait le type d'activité spéciale (FR, VOYAGE, SEJOUR) et le nom précis de l'activité.
 * Spécification stricte de l'utilisateur :
 * - Les lignes voyage commencent par Voyage
 * - Les lignes séjour commencent par Séjour
 * - Pour les sous-lignes, le nom à mettre à côté du libellé est le nom provenant du fichier (col 5 après voyage :)
 */
export function extractTripDetails(
  fields: string[],
  randoName: string,
  rawLine: string,
  filename: string
): {
  specialType: 'FR' | 'VOYAGE' | 'SEJOUR' | null;
  tripName: string;
} {
  const col5 = (fields[4] || '').trim();
  const col2 = (fields[1] || randoName || '').trim();
  const col1 = (fields[0] || '').trim();
  const line = rawLine || '';
  const cleanFile = cleanFrenchText(filename);

  let specialType: 'FR' | 'VOYAGE' | 'SEJOUR' | null = null;

  // 1. Détection prioritaire par le contenu des colonnes ou de la ligne
  // Détection de Séjour en priorité absolue sur toutes les colonnes et la ligne brute
  if (isSejourText(col5) || isSejourText(col2) || isSejourText(col1) || isSejourText(line)) {
    specialType = 'SEJOUR';
  } else if (isVoyageText(col5) || isVoyageText(col2) || isVoyageText(col1) || isVoyageText(line)) {
    specialType = 'VOYAGE';
  } else if (isFlecheRelaisText(col5) || isFlecheRelaisText(col2) || isFlecheRelaisText(line)) {
    specialType = 'FR';
  } else if (cleanFile.includes('sej')) {
    specialType = 'SEJOUR';
  } else if (cleanFile.includes('voy')) {
    specialType = 'VOYAGE';
  } else if (cleanFile.includes('fr') || cleanFile.includes('fl')) {
    specialType = 'FR';
  } else if (isSpecialActivityFile(filename)) {
    specialType = 'FR';
  }

  // 2. Extraction du nom de l'activité (spécifiquement demandé : col 5 après 'voyage :' ou 'séjour :')
  let tripName = '';
  const candidate = col5 || col2;

  // Cherche le nom situé après 'voyage :', 'séjour :' ou 'flèche :'
  const prefixMatch = candidate.match(
    /(?:voyage|s(?:[eéèêë\uFFFD\?_]|\u00C3\u00A9|\u00E9|\u00C3.|\u00E8)?jour|fl[eéèêë\uFFFD\?_]?che(?:s)?(?:\s*-\s*relais)?)\s*[:\-–—]\s*(.+)/i
  );

  if (prefixMatch && prefixMatch[1].trim()) {
    tripName = prefixMatch[1].trim();
  } else if (col5 && !isVoyageText(col5) && !isSejourText(col5) && !isFlecheRelaisText(col5)) {
    // La colonne 5 contient directement le nom (ex: "Corse", "Cantal")
    tripName = col5;
  } else if (col5) {
    tripName = col5
      .replace(
        /^(?:voyage|s(?:[eéèêë\uFFFD\?_]|\u00C3\u00A9|\u00E9|\u00C3.|\u00E8)?jour|fl[eéèêë\uFFFD\?_]?che(?:s)?(?:\s*-\s*relais)?)\s*[:\-–—\s]*/i,
        ''
      )
      .trim();
  } else if (col2) {
    tripName = col2
      .replace(
        /^(?:voyage|s(?:[eéèêë\uFFFD\?_]|\u00C3\u00A9|\u00E9|\u00C3.|\u00E8)?jour|fl[eéèêë\uFFFD\?_]?che(?:s)?(?:\s*-\s*relais)?)\s*[:\-–—\s]*/i,
        ''
      )
      .trim();
  }

  // Nettoie les guillemets résiduels
  tripName = tripName.replace(/^["']+|["']+$/g, '').trim();

  // Nettoyage des suffixes d'étapes éventuels pour que le nom principal apparaisse clairement
  const cleanDisplayName = tripName
    .replace(/[-–—:]?\s*(?:etape|etapes|jour|jours|j)\s*\d+/gi, '')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, '')
    .replace(/\(\s*(?:etape|jour|j)?\s*\d*(?:\s*\/\s*\d+)?\s*\)/gi, '')
    .replace(/^[-–—:.,\s]+|[-–—:.,\s]+$/g, '')
    .trim();

  const finalTripName = cleanDisplayName || tripName || (specialType === 'VOYAGE' ? 'Voyage' : specialType === 'SEJOUR' ? 'Séjour' : 'Flèche-Relais');

  return { specialType, tripName: finalTripName };
}

export function classifySpecialRecord(
  filename: string,
  randoName: string,
  rawLine?: string
): 'FR' | 'VOYAGE' | 'SEJOUR' | null {
  return extractTripDetails([rawLine || '', randoName], randoName, rawLine || '', filename).specialType;
}

/**
 * Parses raw CSV content according to user specifications:
 * - Séparateur : ;
 * - Champ 1 : Date
 * - Champ 2 : Randonnée / Destination
 * - Champ 3 : Nom et prénom (+ valeur numérique km extraite)
 * - Champ 4 : Distance ou info complémentaire
 * - Champ 5 : Voyage / Séjour (ex: Voyage : Corse)
 */
export function parseRpaCsv(content: string, filename: string): RandoRecord[] {
  if (!content || !content.trim()) return [];

  const rawLines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const records: RandoRecord[] = [];
  const delimiter = detectDelimiter(content);

  const isSpecial = isSpecialActivityFile(filename);

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
    const field5 = (fields[4] || '').trim();

    const { km, memberName } = extractKmAndMemberName(field3, field4, randoName);
    const cleanMemberName = memberName || 'Membre inconnu';

    const { weekNumber, year: weekYear } = getIsoWeek(parsedDate);
    const weekKey = `${weekYear}-W${String(weekNumber).padStart(2, '0')}`;

    const { specialType, tripName } = extractTripDetails(fields, randoName, line, filename);
    const isRecordSpecial = isSpecial || specialType !== null;

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
      isSpecialActivity: isRecordSpecial,
      specialType: specialType || undefined,
      tripName: tripName || undefined,
      rawCol5: field5 || undefined,
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
    ? allRecords.filter((rec) => {
        if (isDateInSeason(rec.parsedDate, targetYear)) return true;
        // Si c'est un fichier FR / VOY de l'année sélectionnée
        if (rec.isSpecialActivity && rec.parsedDate.getFullYear() === targetYear) return true;
        return false;
      })
    : allRecords;

  // Tri chronologique sur le 1er champ (Date), puis alphabétique sur le 3e champ (Nom)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const timeDiff = a.parsedDate.getTime() - b.parsedDate.getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.fullMemberName.localeCompare(b.fullMemberName, 'fr', { sensitivity: 'base' });
  });

  // Pour les colonnes hebdomadaires (Feuille Calc RPA - Sans flèches/relais/voyages),
  // on utilise prioritairement les sorties régulières si présentes
  const regularRecords = sortedRecords.filter((rec) => !rec.isSpecialActivity);
  const recordsForWeeks = regularRecords.length > 0 ? regularRecords : sortedRecords;

  // Extraction de toutes les semaines uniques présentes
  const weekMap = new Map<string, { date: Date; weekNumber: number; year: number }>();

  for (const record of recordsForWeeks) {
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
        specials: {
          frCount: 0,
          frKm: 0,
          frRecords: [],
          frTrips: [],
          voyageCount: 0,
          voyageKm: 0,
          voyageRecords: [],
          voyageTrips: [],
          sejourCount: 0,
          sejourKm: 0,
          sejourRecords: [],
          sejourTrips: [],
        },
      });
    }

    const summary = memberMap.get(name)!;
    summary.records.push(rec);

    if (rec.isSpecialActivity) {
      if (!summary.specials) {
        summary.specials = {
          frCount: 0,
          frKm: 0,
          frRecords: [],
          frTrips: [],
          voyageCount: 0,
          voyageKm: 0,
          voyageRecords: [],
          voyageTrips: [],
          sejourCount: 0,
          sejourKm: 0,
          sejourRecords: [],
          sejourTrips: [],
        };
      }
      if (rec.specialType === 'FR') {
        summary.specials.frRecords.push(rec);
      } else if (rec.specialType === 'VOYAGE') {
        summary.specials.voyageRecords.push(rec);
      } else if (rec.specialType === 'SEJOUR') {
        summary.specials.sejourRecords.push(rec);
      }
    } else {
      // Sortie de calendrier régulier
      summary.totalRandos += 1; // Total des randonnées dans la saison
      summary.totalKm += rec.km; // Somme des km
      if (!summary.participationsByWeek[rec.weekKey]) {
        summary.participationsByWeek[rec.weekKey] = [];
      }
      summary.participationsByWeek[rec.weekKey].push(rec);
    }
  }

  // Calcul du nombre de semaines avec 'x' (points), regroupement des voyages/séjours et arrondi des km
  for (const summary of memberMap.values()) {
    summary.activeWeeksCount = Object.keys(summary.participationsByWeek).length;
    summary.totalKm = Math.round(summary.totalKm * 10) / 10;
    if (summary.specials) {
      // 1. Voyages : dédupliqués par nom pour la personne.
      // "s'il y a 10 lignes a des dates differentes mais le meme nom de voyage pour la meme personne : cela fait un seul voyage"
      summary.specials.voyageTrips = groupRecordsIntoTrips(summary.specials.voyageRecords, 'VOYAGE');
      summary.specials.voyageCount = summary.specials.voyageTrips.length;
      summary.specials.voyageKm = Math.round(
        summary.specials.voyageRecords.reduce((sum, r) => sum + r.km, 0) * 10
      ) / 10;

      // 2. Séjours : dédupliqués par nom pour la personne.
      summary.specials.sejourTrips = groupRecordsIntoTrips(summary.specials.sejourRecords, 'SEJOUR');
      summary.specials.sejourCount = summary.specials.sejourTrips.length;
      summary.specials.sejourKm = Math.round(
        summary.specials.sejourRecords.reduce((sum, r) => sum + r.km, 0) * 10
      ) / 10;

      // 3. Flèches - Relais :
      summary.specials.frTrips = groupRecordsIntoTrips(summary.specials.frRecords, 'FR');
      // Pour les flèches-relais, total des randos/entrées et total des km :
      summary.specials.frCount = summary.specials.frRecords.length;
      summary.specials.frKm = Math.round(
        summary.specials.frRecords.reduce((sum, r) => sum + r.km, 0) * 10
      ) / 10;
    }
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
