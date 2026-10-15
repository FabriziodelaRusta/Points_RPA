import * as XLSX from 'xlsx';
import { MemberSummary, WeekInfo } from '../types/rpa';

/**
 * Builds the 2D matrix matching the LibreOffice Calc layout:
 * - Col 1: Nom et Prénom
 * - Col 2: Total points
 * - Col 3: Total randos
 * - Col 4: Total km
 * - Col 5..N: Semaine X (Dates)
 * - Row values: 'x' or empty
 * - Last row: Totaux
 */
export function buildSpreadsheetData(members: MemberSummary[], weeks: WeekInfo[]) {
  const headerRow: string[] = [
    'Nom et Prénom du membre',
    'Total points',
    'Total randos',
    'Total km',
  ];
  weeks.forEach((w) => {
    headerRow.push(`Semaine ${w.weekNumber} (${w.startFormatted} au ${w.endFormatted})`);
  });

  const rows: (string | number)[][] = [headerRow];

  // Each member row
  members.forEach((m) => {
    const row: (string | number)[] = [
      m.memberName,
      m.activeWeeksCount, // Total points (x)
      m.totalRandos, // Total randos
      m.totalKm, // Total km
    ];
    weeks.forEach((w) => {
      const participations = m.participationsByWeek[w.weekKey];
      if (participations && participations.length > 0) {
        row.push('x');
      } else {
        row.push('');
      }
    });
    rows.push(row);
  });

  // Summary rows at the bottom
  const totalPoints = members.reduce((sum, m) => sum + m.activeWeeksCount, 0);
  const totalRandos = members.reduce((sum, m) => sum + m.totalRandos, 0);
  const totalKm = Math.round(members.reduce((sum, m) => sum + m.totalKm, 0) * 10) / 10;

  // 1. Ligne dédiée pour les totaux des colonnes Total (Points, Randos, Km)
  const totalColumnsRow: (string | number)[] = [
    'TOTAL DES COLONNES (Points, Randos, Km)',
    totalPoints,
    totalRandos,
    totalKm,
  ];
  weeks.forEach(() => {
    totalColumnsRow.push('-');
  });
  rows.push(totalColumnsRow);

  // 2. Ligne dédiée pour les participants par semaine
  const weeklyParticipantsRow: (string | number)[] = [
    'TOTAL PARTICIPANTS PAR SEMAINE',
    '',
    '',
    '',
  ];
  weeks.forEach((w) => {
    const countThisWeek = members.filter(
      (m) => m.participationsByWeek[w.weekKey] && m.participationsByWeek[w.weekKey].length > 0
    ).length;
    weeklyParticipantsRow.push(countThisWeek);
  });
  rows.push(weeklyParticipantsRow);

  return rows;
}

/**
 * Downloads as LibreOffice Calc (.ods)
 */
export function exportToOds(members: MemberSummary[], weeks: WeekInfo[], filename = 'RPA_Calcul_Points.ods') {
  const data = buildSpreadsheetData(members, weeks);
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Points RPA');

  XLSX.writeFile(workbook, filename, { bookType: 'ods' });
}

/**
 * Downloads as Excel / LibreOffice (.xlsx)
 */
export function exportToXlsx(members: MemberSummary[], weeks: WeekInfo[], filename = 'RPA_Calcul_Points.xlsx') {
  const data = buildSpreadsheetData(members, weeks);
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Points RPA');

  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
}

/**
 * Downloads as French CSV (semicolon separated)
 */
export function exportToCsv(members: MemberSummary[], weeks: WeekInfo[], filename = 'RPA_Calcul_Points.csv') {
  const data = buildSpreadsheetData(members, weeks);
  const csvContent = data.map((row) => row.map((val) => `"${val}"`).join(';')).join('\r\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
