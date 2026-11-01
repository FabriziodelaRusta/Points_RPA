/**
 * ============================================================================
 * SCRIPT GOOGLE APPS SCRIPT - CALCUL DES POINTS RPA ET SYNCHRONISATION
 * Version : v0.2
 * Club : Roue Princière d'Allain (RPA)
 * 
 * FEUILLES CIBLES :
 * 1. "Opérations" :
 *    - Date        : Fin de la période analysée (ex: "31/10/2026")
 *    - Membre      : Nom et prénom du membre
 *    - Points      : Points calculés (1 point par semaine avec au moins 1 rando)
 *    - Description : "Points accumulés pour l'année [YYYY]"
 *    - Maj_auto    : Case à cocher (cochée = TRUE)
 * 
 * 2. "Logs" :
 *    - Date        : Horodatage de l'exécution (JJ/MM/AAAA HH:mm:ss)
 *    - Description : "MAJ des points de l'année [YYYY] avec la liste des fichiers lus : [fichiers] (X membres, Total points : Y) [script automatique]"
 * ============================================================================
 */

const RPA_CONFIG = {
  VERSION: 'v0.2',
  SHEET_OPERATIONS: 'Opérations',
  SHEET_LOGS: 'Logs',
  GITHUB_API_URL: 'https://api.github.com/repos/FabriziodelaRusta/Input_files/contents/participations',
  GITHUB_RAW_BASE: 'https://raw.githubusercontent.com/FabriziodelaRusta/Input_files/main/participations',
  DEFAULT_YEAR: 2026,
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚴 RPA Allain')
    .addItem('Synchroniser les points...', 'menuSynchroniserPoints')
    .addSeparator()
    .addItem('Consulter les derniers logs...', 'menuVoirLogs')
    .addItem('Aide & Règles de calcul (v0.2)', 'menuAide')
    .addToUi();
}

function declencheurQuotidienAuto() {
  const now = new Date();
  const targetYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
  try {
    synchroniserPointsSaison(targetYear);
  } catch (err) {
    ajouterLog(new Date(), 'ERREUR lors de la MAJ des points de l\'année ' + targetYear + ' : ' + (err.message || err));
  }
}

function menuSynchroniserPoints() {
  const ui = SpreadsheetApp.getUi();
  const now = new Date();
  const suggestedYear = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();

  const promptResult = ui.prompt(
    'RPA - Synchronisation des points (v0.2)',
    'Indiquez l\'année de la saison à calculer (ex: ' + suggestedYear + ' pour la période du 01/11/' + (suggestedYear - 1) + ' au 31/10/' + suggestedYear + ') :',
    ui.ButtonSet.OK_CANCEL
  );

  if (promptResult.getSelectedButton() !== ui.Button.OK) return;

  const rawInput = promptResult.getResponseText().trim();
  const targetYear = parseInt(rawInput, 10) || RPA_CONFIG.DEFAULT_YEAR;

  try {
    const summary = synchroniserPointsSaison(targetYear);
    const fichiersTexte = summary.fichiersLus.length > 0 
      ? summary.fichiersLus.map(function(f) { return '  • ' + f; }).join('\n')
      : '  (Aucun fichier)';

    ui.alert(
      'Synchronisation terminée avec succès (v0.2) !',
      'Saison : ' + targetYear + '\n' +
      'Période : 01/11/' + (targetYear - 1) + ' au 31/10/' + targetYear + '\n\n' +
      'Fichiers lus sur GitHub (' + summary.fichiersLus.length + ') :\n' +
      fichiersTexte + '\n\n' +
      'Résultats :\n' +
      '• Membres traités : ' + summary.totalMembres + '\n' +
      '• Total des points cumulés : ' + summary.totalPoints + '\n' +
      '• Entrées mises à jour : ' + summary.misesAJour + '\n' +
      '• Nouvelles entrées créées : ' + summary.creations + '\n\n' +
      'Les feuilles "Opérations" et "Logs" ont été mises à jour.',
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('Erreur lors de la synchronisation', err.toString(), ui.ButtonSet.OK);
  }
}

function menuVoirLogs() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetLogs = ss.getSheetByName(RPA_CONFIG.SHEET_LOGS);

  if (!sheetLogs || sheetLogs.getLastRow() <= 1) {
    ui.alert('Logs RPA', 'Aucun log enregistré pour le moment.', ui.ButtonSet.OK);
    return;
  }

  const lastRow = sheetLogs.getLastRow();
  const startRow = Math.max(2, lastRow - 4);
  const count = lastRow - startRow + 1;
  const values = sheetLogs.getRange(startRow, 1, count, 2).getValues();

  let msg = 'Dernières synchronisations enregistrées :\n\n';
  values.reverse().forEach(function(row) {
    msg += '• [' + row[0] + ']\n  ' + row[1] + '\n\n';
  });

  ui.alert('Logs RPA (Dernières entrées)', msg, ui.ButtonSet.OK);
}

function menuAide() {
  SpreadsheetApp.getUi().alert(
    'Aide RPA - Synchronisation des points (v0.2)',
    'Règles officielles de la Roue Princière d\'Allain :\n\n' +
    '1. Période : du 01/11/(Année-1) au 31/10/(Année).\n' +
    '2. Fichiers GitHub analysés : tous les fichiers CSV contenant l\'année de début ou de fin (incluant participations régulières, non_FFBC, FR_VOY, etc.).\n' +
    '3. Règle des points : 1 point par semaine (Lundi-Dimanche) avec au moins 1 rando (les voyages, séjours et flèches-relais sont exclus des points de randos).\n' +
    '4. Feuille "Opérations" : Date, Membre, Points, Description, Maj_auto (case cochée).\n' +
    '5. Feuille "Logs" : Date et Description avec fichiers lus, total des points et mention [script automatique].',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function listerFichiersSaisonGitHub(targetYear) {
  const startYearStr = String(targetYear - 1);
  const endYearStr = String(targetYear);
  const detectedFiles = [];

  try {
    const response = UrlFetchApp.fetch(RPA_CONFIG.GITHUB_API_URL, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'RPA-Allain-GoogleAppsScript' }
    });

    if (response.getResponseCode() === 200) {
      const items = JSON.parse(response.getContentText('UTF-8'));
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          const name = items[i].name || '';
          const isCsv = name.toLowerCase().endsWith('.csv') || name.toLowerCase().endsWith('.cvs');
          if (isCsv && (name.includes(startYearStr) || name.includes(endYearStr))) {
            detectedFiles.push(name);
          }
        }
      }
    }
  } catch (err) {
    Logger.log('[RPA] Erreur API GitHub : ' + err.toString());
  }

  if (detectedFiles.length === 0) {
    const fallbacks = [
      'RPA_participations_' + (targetYear - 1) + '.csv',
      'RPA_participations_' + targetYear + '.csv',
      'RPA_participations_' + targetYear + '_non_FFBC.csv',
      'RPA_participations_' + (targetYear - 1) + '_non_FFBC.csv',
      'RPA_participations_' + targetYear + '_FR_VOY.csv',
      'RPA_participations_' + targetYear + '_solde.csv'
    ];
    for (let j = 0; j < fallbacks.length; j++) {
      detectedFiles.push(fallbacks[j]);
    }
  }

  const uniqueFiles = [];
  for (let k = 0; k < detectedFiles.length; k++) {
    if (uniqueFiles.indexOf(detectedFiles[k]) === -1) {
      uniqueFiles.push(detectedFiles[k]);
    }
  }

  return uniqueFiles;
}

function detecterSeparateur(texteCsv) {
  const lignes = texteCsv.split(/\r?\n/).filter(function(l) { return l.trim().length > 0; }).slice(0, 5);
  let pointsVirgules = 0;
  let virgules = 0;
  for (let i = 0; i < lignes.length; i++) {
    pointsVirgules += (lignes[i].match(/;/g) || []).length;
    virgules += (lignes[i].match(/,/g) || []).length;
  }
  return (pointsVirgules >= virgules && pointsVirgules > 0) ? ';' : ',';
}

function synchroniserPointsSaison(targetYear) {
  const previousYear = targetYear - 1;
  const dateFinPeriode = '31/10/' + targetYear;
  const descriptionLabel = 'Points accumulés pour l\'année ' + targetYear;

  const filesToFetch = listerFichiersSaisonGitHub(targetYear);
  let allRecords = [];
  const loadedFilesInfo = [];
  const errorsInfo = [];

  for (let i = 0; i < filesToFetch.length; i++) {
    const filename = filesToFetch[i];
    const url = RPA_CONFIG.GITHUB_RAW_BASE + '/' + encodeURIComponent(filename);
    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const statusCode = response.getResponseCode();
      if (statusCode === 200) {
        const content = response.getContentText('UTF-8');
        const parsed = parseRpaCsvContent(content, filename);
        if (parsed.length > 0) {
          allRecords = allRecords.concat(parsed);
          loadedFilesInfo.push(filename + ' (' + parsed.length + ' lignes)');
        }
      } else {
        errorsInfo.push(filename + ' [HTTP ' + statusCode + ']');
      }
    } catch (e) {
      errorsInfo.push(filename + ' [Erreur: ' + e.message + ']');
    }
  }

  if (allRecords.length === 0) {
    const msg = 'Aucun enregistrement trouvé sur GitHub pour la saison ' + targetYear + '.\n\n' +
      'Fichiers testés :\n' + filesToFetch.join(', ') + '\n' +
      (errorsInfo.length > 0 ? 'Détails : ' + errorsInfo.join(', ') : '');
    throw new Error(msg);
  }

  const seasonStart = new Date(Date.UTC(previousYear, 10, 1, 0, 0, 0));
  const seasonEnd = new Date(Date.UTC(targetYear, 10, 1, 0, 0, 0));

  const seasonRecords = allRecords.filter(function(r) {
    if (!r.parsedDate) return false;
    const t = r.parsedDate.getTime();
    return t >= seasonStart.getTime() && t < seasonEnd.getTime();
  });

  if (seasonRecords.length === 0) {
    throw new Error(
      'Fichiers chargés avec succès (' + loadedFilesInfo.join(', ') + '), mais aucune sortie ne correspond à la période du 01/11/' + previousYear + ' au 31/10/' + targetYear + '.'
    );
  }

  const memberPointsMap = {};
  for (let j = 0; j < seasonRecords.length; j++) {
    const rec = seasonRecords[j];
    if (rec.isSpecialActivity) continue;
    const name = rec.fullMemberName;
    if (!name) continue;
    if (!memberPointsMap[name]) memberPointsMap[name] = {};
    memberPointsMap[name][rec.weekKey] = true;
  }

  const memberSummaries = Object.keys(memberPointsMap)
    .sort(function(a, b) { return a.localeCompare(b, 'fr', { sensitivity: 'base' }); })
    .map(function(name) {
      return { memberName: name, points: Object.keys(memberPointsMap[name]).length };
    });

  let totalPointsCumules = 0;
  for (let p = 0; p < memberSummaries.length; p++) {
    totalPointsCumules += memberSummaries[p].points;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RPA_CONFIG.SHEET_OPERATIONS);
  if (!sheet) {
    sheet = ss.insertSheet(RPA_CONFIG.SHEET_OPERATIONS);
    sheet.appendRow(['Date', 'Membre', 'Points', 'Description', 'Maj_auto']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#D1E7DD');
  }

  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 5);
  let colIndex = { date: 1, membre: 2, points: 3, description: 4, majAuto: 5 };

  if (lastRow >= 1) {
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (let c = 0; c < headers.length; c++) {
      const cleanH = String(headers[c] || '').trim().toLowerCase();
      if (cleanH.includes('date')) colIndex.date = c + 1;
      else if (cleanH.includes('membre') || cleanH.includes('nom')) colIndex.membre = c + 1;
      else if (cleanH.includes('point')) colIndex.points = c + 1;
      else if (cleanH.includes('desc')) colIndex.description = c + 1;
      else if (cleanH.includes('maj') || cleanH.includes('auto')) colIndex.majAuto = c + 1;
    }
  }

  let existingData = [];
  if (lastRow > 1) {
    existingData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  }

  let misesAJour = 0;
  let creations = 0;
  const checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();

  for (let m = 0; m < memberSummaries.length; m++) {
    const item = memberSummaries[m];
    const targetMember = item.memberName.trim().toLowerCase();
    let foundRowIndex = -1;

    for (let r = 0; r < existingData.length; r++) {
      const row = existingData[r];
      const rowMember = String(row[colIndex.membre - 1] || '').trim().toLowerCase();
      const rowDesc = String(row[colIndex.description - 1] || '').trim().toLowerCase();

      if (rowMember === targetMember && (rowDesc === descriptionLabel.toLowerCase() || rowDesc.includes(String(targetYear)))) {
        foundRowIndex = r + 2;
        break;
      }
    }

    if (foundRowIndex > 0) {
      sheet.getRange(foundRowIndex, colIndex.date).setValue(dateFinPeriode);
      sheet.getRange(foundRowIndex, colIndex.points).setValue(item.points);
      sheet.getRange(foundRowIndex, colIndex.description).setValue(descriptionLabel);
      const cellMaj = sheet.getRange(foundRowIndex, colIndex.majAuto);
      cellMaj.setDataValidation(checkboxRule);
      cellMaj.setValue(true);
      misesAJour++;
    } else {
      const newRowNumber = sheet.getLastRow() + 1;
      const rowValues = [];
      for (let c = 1; c <= Math.max(5, lastCol); c++) {
        if (c === colIndex.date) rowValues.push(dateFinPeriode);
        else if (c === colIndex.membre) rowValues.push(item.memberName);
        else if (c === colIndex.points) rowValues.push(item.points);
        else if (c === colIndex.description) rowValues.push(descriptionLabel);
        else if (c === colIndex.majAuto) rowValues.push(true);
        else rowValues.push('');
      }
      sheet.appendRow(rowValues);
      const cellMaj = sheet.getRange(newRowNumber, colIndex.majAuto);
      cellMaj.setDataValidation(checkboxRule);
      cellMaj.setValue(true);
      creations++;
    }
  }

  sheet.getRange(2, colIndex.date, Math.max(1, sheet.getLastRow() - 1), 1).setHorizontalAlignment('center');
  sheet.getRange(2, colIndex.points, Math.max(1, sheet.getLastRow() - 1), 1).setHorizontalAlignment('center');
  sheet.getRange(2, colIndex.majAuto, Math.max(1, sheet.getLastRow() - 1), 1).setHorizontalAlignment('center');

  // 7. Écriture dans Logs avec [script automatique] et le total des points
  const logDescription = 'MAJ des points de l\'année ' + targetYear + ' avec la liste des fichiers lus : ' + loadedFilesInfo.join(', ') + ' (' + memberSummaries.length + ' membres traités, Total points : ' + totalPointsCumules + ' : ' + misesAJour + ' m.à.j, ' + creations + ' créations) [script automatique]';
  ajouterLog(new Date(), logDescription);

  return {
    totalMembres: memberSummaries.length,
    totalPoints: totalPointsCumules,
    misesAJour: misesAJour,
    creations: creations,
    saison: targetYear,
    fichiersLus: loadedFilesInfo,
  };
}

function ajouterLog(dateObj, descriptionTexte) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetLogs = ss.getSheetByName(RPA_CONFIG.SHEET_LOGS);

    if (!sheetLogs) {
      sheetLogs = ss.insertSheet(RPA_CONFIG.SHEET_LOGS);
      sheetLogs.appendRow(['Date', 'Description']);
      const headerRange = sheetLogs.getRange(1, 1, 1, 2);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E2E8F0');
      sheetLogs.setColumnWidth(1, 170);
      sheetLogs.setColumnWidth(2, 650);
    }

    const pad = function(n) { return (n < 10 ? '0' : '') + n; };
    const dateFormatted = pad(dateObj.getDate()) + '/' + pad(dateObj.getMonth() + 1) + '/' + dateObj.getFullYear() + ' ' + pad(dateObj.getHours()) + ':' + pad(dateObj.getMinutes()) + ':' + pad(dateObj.getSeconds());

    sheetLogs.appendRow([dateFormatted, descriptionTexte]);
    sheetLogs.getRange(sheetLogs.getLastRow(), 1).setHorizontalAlignment('center');
  } catch (e) {
    Logger.log('Erreur écriture Logs: ' + e.message);
  }
}

function parseCsvLine(line, delimiter) {
  delimiter = delimiter || ';';
  const fields = [];
  let i = 0;
  const len = line.length;
  while (i < len) {
    while (i < len && (line[i] === ' ' || line[i] === '\t')) i++;
    if (i >= len) break;
    if (line[i] === '"') {
      i++;
      let val = '';
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') { val += '"'; i += 2; }
          else { i++; break; }
        } else { val += line[i]; i++; }
      }
      fields.push(val.trim());
      while (i < len && line[i] !== delimiter) i++;
      if (i < len && line[i] === delimiter) { i++; if (i === len) fields.push(''); }
    } else {
      let val = '';
      while (i < len && line[i] !== delimiter) { val += line[i]; i++; }
      fields.push(val.trim());
      if (i < len && line[i] === delimiter) { i++; if (i === len) fields.push(''); }
    }
  }
  return fields;
}

function parseRpaCsvContent(content, filename) {
  if (!content) return [];
  const delimiter = detecterSeparateur(content);
  const lines = content.split(/\r?\n/).filter(function(l) { return l.trim().length > 0; });
  const records = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line) continue;
    const fields = parseCsvLine(line, delimiter);
    if (fields.length === 0) continue;
    if (idx === 0 && (fields[0] || '').toLowerCase().includes('date')) continue;

    const dateStr = fields[0] || '';
    const randoName = fields[1] || '';
    const field3 = fields[2] || '';
    const field4 = fields[3] || '';
    const field5 = fields[4] || '';

    const parsedDate = parseDateFr(dateStr);
    if (!parsedDate) continue;

    let memberName = (field3 || '').trim().replace(/\b\d+(?:[.,]\d+)?\s*(?:km|kms)?\b/gi, '').trim().replace(/^["']+|["']+$/g, '');
    if (!memberName) continue;

    const isSpecial = detectSpecialActivity(filename, randoName, field5, line);
    const weekInfo = getIsoWeekInfo(parsedDate);

    records.push({
      parsedDate: parsedDate,
      fullMemberName: memberName,
      weekKey: weekInfo.year + '-W' + (weekInfo.week < 10 ? '0' : '') + weekInfo.week,
      isSpecialActivity: isSpecial,
    });
  }
  return records;
}

function parseDateFr(rawStr) {
  if (!rawStr) return null;
  const clean = rawStr.replace(/^["']+|["']+$/g, '').trim();

  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    return new Date(Date.UTC(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10)));
  }

  const frMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (frMatch) {
    return new Date(Date.UTC(parseInt(frMatch[3], 10), parseInt(frMatch[2], 10) - 1, parseInt(frMatch[1], 10)));
  }

  return null;
}

function detectSpecialActivity(filename, randoName, field5, fullLine) {
  const fLower = (filename || '').toLowerCase();
  if (fLower.includes('sej') || fLower.includes('voy') || fLower.includes('fr_voy')) return true;
  const combined = (randoName + ' ' + (field5 || '') + ' ' + fullLine).toLowerCase();
  if (/s(?:[eéèêë]|é)?jour/i.test(combined)) return true;
  if (/voyage/i.test(combined)) return true;
  if (/fl[eéèêë]?che(?:s)?(?:\s*-\s*relais)?/i.test(combined)) return true;
  return false;
}

function getIsoWeekInfo(d) {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  const weekNumber = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return { week: weekNumber, year: new Date(firstThursday).getUTCFullYear() };
}
