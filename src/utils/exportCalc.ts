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
    const hasFr = Boolean(m.specials && m.specials.frCount > 0);
    const voyageTrips = m.specials?.voyageTrips || [];
    const sejourTrips = m.specials?.sejourTrips || [];
    const hasMultipleRows = hasFr || voyageTrips.length > 0 || sejourTrips.length > 0;

    const grandTotalKm = Math.round(
      (m.totalKm +
        (m.specials?.frKm || 0) +
        (m.specials?.voyageKm || 0) +
        (m.specials?.sejourKm || 0)) * 10
    ) / 10;

    const row: (string | number)[] = [
      m.memberName,
      m.activeWeeksCount, // Total points (x)
      m.totalRandos, // Total randos
      hasMultipleRows ? grandTotalKm : m.totalKm, // Total km (grand total si sous-lignes)
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

    // Sous-ligne Randos si plusieurs lignes à afficher
    if (hasMultipleRows) {
      const randosRow: (string | number)[] = [
        '  ↳ Randos',
        '',
        m.totalRandos,
        m.totalKm,
      ];
      weeks.forEach((w) => {
        const weeklyRandos = m.participationsByWeek[w.weekKey] || [];
        if (weeklyRandos.length > 0) {
          const weekKm = Math.round(weeklyRandos.reduce((s, p) => s + p.km, 0) * 10) / 10;
          randosRow.push(weekKm > 0 ? `${weekKm}km` : 'x');
        } else {
          randosRow.push('');
        }
      });
      rows.push(randosRow);
    }

    // Sub-rows if special activities exist
    if (m.specials) {
      if (m.specials.frCount > 0) {
        const frRow: (string | number)[] = [
          '  ↳ Flèches - Relais et autres',
          '',
          m.specials.frCount,
          m.specials.frKm,
        ];
        weeks.forEach((w) => {
          const frs = m.specials!.frRecords.filter((r) => r.weekKey === w.weekKey);
          frRow.push(frs.length > 0 ? `FR (${frs.reduce((s, r) => s + r.km, 0)}km)` : '');
        });
        rows.push(frRow);
      }
      if (m.specials.voyageTrips && m.specials.voyageTrips.length > 0) {
        m.specials.voyageTrips.forEach((vt) => {
          const voyRow: (string | number)[] = [
            `  ↳ Voyage : ${vt.tripName}`,
            '',
            vt.count,
            vt.km,
          ];
          weeks.forEach((w) => {
            const km = vt.weeklyKm[w.weekKey];
            voyRow.push(km && km > 0 ? `VOY (${km}km)` : '');
          });
          rows.push(voyRow);
        });
      }
      if (m.specials.sejourTrips && m.specials.sejourTrips.length > 0) {
        m.specials.sejourTrips.forEach((st) => {
          const sejRow: (string | number)[] = [
            `  ↳ Séjour : ${st.tripName}`,
            '',
            st.count,
            st.km,
          ];
          weeks.forEach((w) => {
            const km = st.weeklyKm[w.weekKey];
            sejRow.push(km && km > 0 ? `SÉJ (${km}km)` : '');
          });
          rows.push(sejRow);
        });
      }
    }
  });

  // Summary rows at the bottom
  const totalPoints = members.reduce((sum, m) => sum + m.activeWeeksCount, 0);
  const totalRandos = members.reduce((sum, m) => sum + m.totalRandos, 0);
  const totalKm =
    Math.round(
      members.reduce(
        (sum, m) =>
          sum +
          m.totalKm +
          (m.specials?.frKm || 0) +
          (m.specials?.voyageKm || 0) +
          (m.specials?.sejourKm || 0),
        0
      ) * 10
    ) / 10;

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
