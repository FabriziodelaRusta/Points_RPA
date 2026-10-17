import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MemberSummary, WeekInfo, RandoRecord } from '../types/rpa';
import { exportToOds, exportToXlsx, exportToCsv } from '../utils/exportCalc';
import {
  Download,
  FileSpreadsheet,
  Search,
  ZoomIn,
  ZoomOut,
  ArrowUpDown,
  Check,
} from 'lucide-react';

interface LibreCalcTableProps {
  members: MemberSummary[];
  weeks: WeekInfo[];
  selectedMemberName: string | null;
  onSelectMember: (name: string | null) => void;
  allRecords: RandoRecord[];
}

export const LibreCalcTable: React.FC<LibreCalcTableProps> = ({
  members,
  weeks,
  selectedMemberName,
  onSelectMember,
  allRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<
    'name_asc' | 'name_desc' | 'points_desc' | 'randos_desc' | 'km_desc'
  >('name_asc');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activeCell, setActiveCell] = useState<{
    coord: string;
    content: string;
    member?: string;
    week?: string;
  }>({
    coord: 'B2',
    content: '=NB.SI(E2:AZ2; "x")',
  });

  const memberRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Filter & sort members
  const processedMembers = useMemo(() => {
    let result = members.filter((m) =>
      m.memberName.toLowerCase().includes(searchTerm.toLowerCase().trim())
    );

    result = [...result].sort((a, b) => {
      if (sortBy === 'name_asc') return a.memberName.localeCompare(b.memberName, 'fr');
      if (sortBy === 'name_desc') return b.memberName.localeCompare(a.memberName, 'fr');
      if (sortBy === 'points_desc') return b.activeWeeksCount - a.activeWeeksCount;
      if (sortBy === 'randos_desc') return b.totalRandos - a.totalRandos;
      if (sortBy === 'km_desc') return b.totalKm - a.totalKm;
      return 0;
    });

    return result;
  }, [members, searchTerm, sortBy]);

  // Scroll to selected member if requested
  useEffect(() => {
    if (selectedMemberName && memberRowRefs.current[selectedMemberName]) {
      memberRowRefs.current[selectedMemberName]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedMemberName]);

  // Compute total participants per week
  const weekTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    weeks.forEach((w) => {
      let count = 0;
      members.forEach((m) => {
        if (m.participationsByWeek[w.weekKey] && m.participationsByWeek[w.weekKey].length > 0) {
          count++;
        }
      });
      totals[w.weekKey] = count;
    });
    return totals;
  }, [members, weeks]);

  const totalPointsOverall = useMemo(() => {
    return members.reduce((sum, m) => sum + m.activeWeeksCount, 0);
  }, [members]);

  const totalRandosOverall = useMemo(() => {
    return members.reduce((sum, m) => sum + m.totalRandos, 0);
  }, [members]);

  const totalKmOverall = useMemo(() => {
    return Math.round(members.reduce((sum, m) => sum + m.totalKm, 0) * 10) / 10;
  }, [members]);

  const handleCellClick = (
    coord: string,
    content: string,
    memberName?: string,
    weekHeader?: string
  ) => {
    setActiveCell({
      coord,
      content,
      member: memberName,
      week: weekHeader,
    });
    if (memberName) {
      onSelectMember(memberName);
    }
  };

  const getFontSize = () => {
    if (zoomLevel <= 80) return 'text-[11px]';
    if (zoomLevel <= 90) return 'text-xs';
    if (zoomLevel >= 120) return 'text-base';
    if (zoomLevel >= 110) return 'text-sm';
    return 'text-xs';
  };

  const lastColLetter = weeks.length > 0 ? weeks[weeks.length - 1].colLetter : 'AZ';

  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden flex flex-col">
      {/* LibreOffice Calc Title Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-950">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white text-emerald-800 rounded flex items-center justify-center font-bold text-xs shadow-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide flex items-center gap-2">
              <span>LibreOffice Calc — Feuille de points & randos RPA</span>
              <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded font-mono">
                Semaines Lun-Dim
              </span>
            </div>
            <p className="text-[11px] text-emerald-200">
              Roue Princière d'Allain · Synthèse hebdomadaire, total points, randos et km
            </p>
          </div>
        </div>

        {/* Action and Export Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => exportToOds(members, weeks)}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors flex items-center gap-1 cursor-pointer border border-emerald-600 shadow-2xs"
            title="Format natif LibreOffice Calc"
          >
            <Download className="w-3.5 h-3.5" />
            Export .ODS (Calc)
          </button>
          <button
            type="button"
            onClick={() => exportToXlsx(members, weeks)}
            className="px-2.5 py-1 text-xs font-medium bg-emerald-950/60 hover:bg-emerald-950 text-emerald-100 rounded transition-colors flex items-center gap-1 cursor-pointer border border-emerald-700"
            title="Format Excel / Calc"
          >
            <Download className="w-3.5 h-3.5" />
            .XLSX
          </button>
          <button
            type="button"
            onClick={() => exportToCsv(members, weeks)}
            className="px-2.5 py-1 text-xs font-medium bg-emerald-950/60 hover:bg-emerald-950 text-emerald-100 rounded transition-colors flex items-center gap-1 cursor-pointer border border-emerald-700"
            title="Format CSV avec séparateur point-virgule"
          >
            <Download className="w-3.5 h-3.5" />
            .CSV
          </button>
        </div>
      </div>

      {/* Calc Toolbar & Formula Bar */}
      <div className="bg-slate-100 border-b border-slate-300 p-2 text-xs flex flex-wrap items-center justify-between gap-2">
        {/* Formula Bar */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          {/* Coordinate Box */}
          <div className="bg-white border border-slate-300 font-mono font-bold text-slate-700 px-2.5 py-1 rounded w-20 text-center shadow-2xs">
            {activeCell.coord}
          </div>
          {/* fx symbol */}
          <div className="font-serif italic font-bold text-slate-500 text-sm select-none">
            fx
          </div>
          {/* Formula / Content Input */}
          <div className="flex-1 bg-white border border-slate-300 px-3 py-1 rounded text-slate-800 font-mono shadow-2xs truncate">
            {activeCell.content}
          </div>
        </div>

        {/* Table Controls (Search, Sort, Zoom) */}
        <div className="flex items-center gap-2">
          {/* Search Member */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-300 rounded pl-7 pr-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden text-xs">
            <button
              type="button"
              onClick={() =>
                setSortBy((prev) => {
                  if (prev === 'name_asc') return 'points_desc';
                  if (prev === 'points_desc') return 'randos_desc';
                  if (prev === 'randos_desc') return 'km_desc';
                  if (prev === 'km_desc') return 'name_desc';
                  return 'name_asc';
                })
              }
              className="px-2 py-1 hover:bg-slate-100 flex items-center gap-1 text-slate-700 cursor-pointer"
              title="Changer le tri"
            >
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <span>
                {sortBy === 'name_asc' && 'Nom A-Z'}
                {sortBy === 'name_desc' && 'Nom Z-A'}
                {sortBy === 'points_desc' && 'Points max'}
                {sortBy === 'randos_desc' && 'Randos max'}
                {sortBy === 'km_desc' && 'Km max'}
              </span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center border border-slate-300 rounded bg-white text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 10, 80))}
              className="px-2 py-1 hover:bg-slate-100 text-slate-600 border-r border-slate-200 cursor-pointer"
              title="Zoom arrière"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-2 text-slate-500 font-mono text-[11px]">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 130))}
              className="px-2 py-1 hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Zoom avant"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Active cell helper info banner */}
      {activeCell.member && (
        <div className="bg-emerald-50/90 border-b border-emerald-200 px-3 py-1 text-xs text-emerald-900 flex items-center justify-between">
          <span>
            Cellule sélectionnée : <strong>{activeCell.member}</strong>
            {activeCell.week ? ` · ${activeCell.week}` : ''}
          </span>
          <span className="font-mono text-emerald-800">{activeCell.content}</span>
        </div>
      )}

      {/* Spreadsheet Main Container */}
      <div className="relative overflow-x-auto max-h-[640px] select-none border-b border-slate-300">
        <table className={`w-full border-collapse ${getFontSize()} font-sans text-slate-800`}>
          {/* Top Calc Header: Column Letters (A, B, C, D, E...) */}
          <thead>
            <tr className="bg-slate-200 text-slate-600 font-mono text-center border-b border-slate-300 text-[11px]">
              {/* Row index top-left corner */}
              <th className="w-9 min-w-9 px-1 py-1 bg-slate-300 border-r border-slate-300 sticky left-0 z-40 text-slate-500 font-medium">
                #
              </th>
              {/* Col A */}
              <th className="px-3 py-1 bg-slate-200 border-r border-slate-300 sticky left-9 z-30 min-w-[190px] text-center font-bold">
                A
              </th>
              {/* Col B (Total points) */}
              <th className="px-2 py-1 bg-slate-200 border-r border-slate-300 sticky left-[226px] z-30 min-w-[75px] text-center font-bold text-emerald-900">
                B
              </th>
              {/* Col C (Total randos) */}
              <th className="px-2 py-1 bg-slate-200 border-r border-slate-300 sticky left-[301px] z-30 min-w-[75px] text-center font-bold text-slate-800">
                C
              </th>
              {/* Col D (Total km) */}
              <th className="px-2 py-1 bg-slate-200 border-r border-slate-300 sticky left-[376px] z-30 min-w-[80px] text-center font-bold text-emerald-900">
                D
              </th>
              {/* Col E..N (Weeks) */}
              {weeks.map((w) => (
                <th
                  key={`letter-${w.weekKey}`}
                  className="px-2 py-1 bg-slate-200 border-r border-slate-300 min-w-[115px] font-bold text-slate-700"
                >
                  {w.colLetter}
                </th>
              ))}
            </tr>

            {/* Column Label Headers */}
            <tr className="bg-slate-100 text-slate-800 font-semibold border-b-2 border-slate-400">
              {/* Row index 1 */}
              <th className="px-1 py-2 bg-slate-200 border-r border-slate-300 text-center font-mono text-slate-500 sticky left-0 z-40 text-[11px]">
                1
              </th>

              {/* Col A: Nom et prénom du membre */}
              <th
                onClick={() => handleCellClick('A1', 'Nom et Prénom')}
                className="px-3 py-2 text-left bg-slate-100 border-r border-slate-300 sticky left-9 z-30 min-w-[190px] shadow-xs cursor-pointer hover:bg-slate-200"
              >
                <div className="flex items-center justify-between">
                  <span>Nom et prénom du membre</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    ({processedMembers.length})
                  </span>
                </div>
              </th>

              {/* Col B: Total points as requested */}
              <th
                onClick={() => handleCellClick('B1', 'Total points')}
                className="px-2 py-2 text-center bg-emerald-100/80 text-emerald-950 border-r border-slate-300 sticky left-[226px] z-30 min-w-[75px] shadow-xs cursor-pointer hover:bg-emerald-200"
                title="Total des points (nombre de semaines avec au moins une rando = nombre de 'x')"
              >
                <div className="leading-tight">
                  <div className="font-bold text-emerald-900">Total</div>
                  <div className="text-[10px] font-medium text-emerald-700">points</div>
                </div>
              </th>

              {/* Col C: Total randos as requested */}
              <th
                onClick={() => handleCellClick('C1', 'Total randos')}
                className="px-2 py-2 text-center bg-slate-200/90 text-slate-900 border-r border-slate-300 sticky left-[301px] z-30 min-w-[75px] shadow-xs cursor-pointer hover:bg-slate-300"
                title="Total de toutes les randonnées (y compris plusieurs par semaine)"
              >
                <div className="leading-tight">
                  <div className="font-bold text-slate-900">Total</div>
                  <div className="text-[10px] font-medium text-slate-600">randos</div>
                </div>
              </th>

              {/* Col D: Total km as requested */}
              <th
                onClick={() => handleCellClick('D1', 'Total km')}
                className="px-2 py-2 text-center bg-emerald-50 text-emerald-950 border-r-2 border-emerald-300 sticky left-[376px] z-30 min-w-[80px] shadow-xs cursor-pointer hover:bg-emerald-100"
                title="Total des kilomètres parcourus"
              >
                <div className="leading-tight">
                  <div className="font-bold text-emerald-900">Total</div>
                  <div className="text-[10px] font-medium text-emerald-700">km</div>
                </div>
              </th>

              {/* Col E..N: Semaines */}
              {weeks.map((w) => (
                <th
                  key={w.weekKey}
                  onClick={() =>
                    handleCellClick(
                      `${w.colLetter}1`,
                      `Semaine ${w.weekNumber} (${w.startFormatted} au ${w.endFormatted})`
                    )
                  }
                  className="px-2 py-1.5 text-center bg-slate-100 border-r border-slate-300 min-w-[115px] hover:bg-slate-200 cursor-pointer"
                  title={`Semaine ${w.weekNumber} : du lundi ${w.startFormatted} au dimanche ${w.endFormatted}`}
                >
                  <div className="font-bold text-slate-800 text-[11px]">
                    Semaine {w.weekNumber}
                  </div>
                  <div className="text-[10px] font-normal text-slate-500 whitespace-nowrap">
                    {w.startFormatted} - {w.endFormatted}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body: Member rows */}
          <tbody>
            {processedMembers.map((member, rowIndex) => {
              const rowNum = rowIndex + 2;
              const isSelected = selectedMemberName === member.memberName;

              return (
                <tr
                  key={member.memberName}
                  ref={(el) => {
                    memberRowRefs.current[member.memberName] = el;
                  }}
                  className={`border-b border-slate-200 transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/80 hover:bg-emerald-100/80'
                      : rowIndex % 2 === 0
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-slate-50/60 hover:bg-slate-100/60'
                  }`}
                >
                  {/* Row coordinate index */}
                  <td className="px-1 py-1.5 text-center font-mono text-[11px] bg-slate-200 text-slate-500 border-r border-slate-300 sticky left-0 z-30 select-none">
                    {rowNum}
                  </td>

                  {/* Member Name (Col A) */}
                  <td
                    onClick={() =>
                      handleCellClick(
                        `A${rowNum}`,
                        member.memberName,
                        member.memberName
                      )
                    }
                    className={`px-3 py-1.5 font-medium border-r border-slate-300 sticky left-9 z-20 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-950 font-bold border-l-4 border-l-emerald-600'
                        : rowIndex % 2 === 0
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[155px]">{member.memberName}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 ml-1" />
                      )}
                    </div>
                  </td>

                  {/* Total Points (x count) (Col B) */}
                  <td
                    onClick={() =>
                      handleCellClick(
                        `B${rowNum}`,
                        `=NB.SI(E${rowNum}:${lastColLetter}${rowNum}; "x") [Points: ${member.activeWeeksCount}]`,
                        member.memberName
                      )
                    }
                    className={`px-2 py-1.5 text-center font-bold font-mono border-r border-slate-300 sticky left-[226px] z-20 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                    title={`${member.memberName} a ${member.activeWeeksCount} point(s) (semaines avec 'x')`}
                  >
                    {member.activeWeeksCount}
                  </td>

                  {/* Total Randos (Col C) */}
                  <td
                    onClick={() =>
                      handleCellClick(
                        `C${rowNum}`,
                        `=SOMME_RANDOS(${rowNum}) [Total randos: ${member.totalRandos}]`,
                        member.memberName
                      )
                    }
                    className={`px-2 py-1.5 text-center font-bold font-mono border-r border-slate-300 sticky left-[301px] z-20 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-300 text-slate-900'
                        : 'bg-slate-100/90 text-slate-800 hover:bg-slate-200'
                    }`}
                    title={`${member.memberName} a fait ${member.totalRandos} randonnée(s) au total`}
                  >
                    {member.totalRandos}
                  </td>

                  {/* Total Km (Col D) */}
                  <td
                    onClick={() =>
                      handleCellClick(
                        `D${rowNum}`,
                        `=SOMME_KM(${rowNum}) [Distance totale: ${member.totalKm} km]`,
                        member.memberName
                      )
                    }
                    className={`px-2 py-1.5 text-center font-bold font-mono border-r-2 border-emerald-300 sticky left-[376px] z-20 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100'
                    }`}
                    title={`${member.memberName} a parcouru ${member.totalKm} km au total`}
                  >
                    {member.totalKm}
                  </td>

                  {/* Week Columns with 'x' (Col E..N) */}
                  {weeks.map((week) => {
                    const participations = member.participationsByWeek[week.weekKey] || [];
                    const hasRando = participations.length > 0;
                    const cellCoord = `${week.colLetter}${rowNum}`;

                    return (
                      <td
                        key={week.weekKey}
                        onClick={() =>
                          handleCellClick(
                            cellCoord,
                            hasRando
                              ? `x (${participations.length} rando${participations.length > 1 ? 's' : ''}: ${participations.map((p) => `${p.dateStr} - ${p.randoName}${p.km > 0 ? ` [${p.km} km]` : ''}`).join('; ')})`
                              : '',
                            member.memberName,
                            week.headerLabel
                          )
                        }
                        className={`px-1.5 py-1.5 text-center border-r border-slate-200 cursor-pointer relative group transition-colors ${
                          hasRando
                            ? isSelected
                              ? 'bg-emerald-200 text-emerald-900 font-extrabold'
                              : 'bg-emerald-50/40 text-emerald-800 font-bold hover:bg-emerald-100'
                            : isSelected
                            ? 'bg-emerald-50/20 hover:bg-emerald-100/50'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        {hasRando ? (
                          <div className="flex items-center justify-center">
                            {/* The 'x' mark requested by user */}
                            <span className="text-sm font-black text-emerald-700 select-none">
                              x
                            </span>

                            {/* Floating tooltip with rando detail */}
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 bg-slate-900 text-white text-[11px] rounded py-1 px-2.5 whitespace-nowrap shadow-lg pointer-events-none">
                              <div className="font-semibold">{member.memberName}</div>
                              {participations.map((p, idx) => (
                                <div key={idx} className="text-emerald-300">
                                  {p.dateStr} : {p.randoName} {p.km > 0 ? `(${p.km} km)` : ''}
                                </div>
                              ))}
                              {participations.length > 1 && (
                                <div className="text-amber-300 font-semibold text-[10px]">
                                  ★ {participations.length} randos cette semaine !
                                </div>
                              )}
                              <div className="text-[9px] text-slate-400">
                                Semaine {week.weekNumber} ({week.startFormatted} - {week.endFormatted})
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-200"></span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Empty state if filtered or no files loaded */}
            {processedMembers.length === 0 && (
              <tr>
                <td colSpan={weeks.length + 5} className="text-center py-10 text-slate-500 text-sm">
                  {members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                      <span className="font-semibold text-slate-700">Aucun fichier de sorties chargé</span>
                      <span className="text-xs text-slate-500">
                        Veuillez cliquer sur « Sélectionner CVS » ci-dessus pour importer vos fichiers générés via Vélo-liberté.
                      </span>
                    </div>
                  ) : (
                    <span>Aucun membre ne correspond à votre filtre "{searchTerm}".</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>

          {/* Footer: Dedicated Summary Rows */}
          <tfoot>
            {/* 1. Ligne dédiée pour les totaux des colonnes Total (Points, Randos, Km) */}
            <tr className="bg-emerald-100/90 border-t-2 border-slate-400 font-bold text-slate-800">
              {/* Row index */}
              <td className="px-1 py-2 text-center font-mono text-[11px] bg-emerald-200 text-emerald-950 border-r border-slate-300 sticky left-0 z-40">
                {members.length + 2}
              </td>

              {/* Label */}
              <td
                onClick={() =>
                  handleCellClick(
                    `A${members.length + 2}`,
                    'TOTAL DES COLONNES (Points, Randos, Km)'
                  )
                }
                className="px-3 py-2 text-left bg-emerald-100 border-r border-slate-300 sticky left-9 z-30 uppercase tracking-wider text-[11px] text-emerald-950 font-black cursor-pointer shadow-xs"
              >
                TOTAL DES COLONNES
              </td>

              {/* Grand Total Points (Col B) */}
              <td
                onClick={() =>
                  handleCellClick(
                    `B${members.length + 2}`,
                    `=SOMME(B2:B${members.length + 1}) [Total points: ${totalPointsOverall}]`
                  )
                }
                className="px-2 py-2 text-center font-mono font-black text-emerald-950 bg-emerald-200 border-r border-slate-300 sticky left-[226px] z-30 text-xs cursor-pointer shadow-xs"
                title="Somme de la colonne Total points"
              >
                {totalPointsOverall}
              </td>

              {/* Grand Total Randos (Col C) */}
              <td
                onClick={() =>
                  handleCellClick(
                    `C${members.length + 2}`,
                    `=SOMME(C2:C${members.length + 1}) [Total randos: ${totalRandosOverall}]`
                  )
                }
                className="px-2 py-2 text-center font-mono font-black text-slate-900 bg-slate-300 border-r border-slate-300 sticky left-[301px] z-30 text-xs cursor-pointer shadow-xs"
                title="Somme de la colonne Total randos"
              >
                {totalRandosOverall}
              </td>

              {/* Grand Total Km (Col D) */}
              <td
                onClick={() =>
                  handleCellClick(
                    `D${members.length + 2}`,
                    `=SOMME(D2:D${members.length + 1}) [Total km: ${totalKmOverall} km]`
                  )
                }
                className="px-2 py-2 text-center font-mono font-black text-emerald-950 bg-emerald-200/95 border-r-2 border-emerald-400 sticky left-[376px] z-30 text-xs cursor-pointer shadow-xs"
                title="Somme de la colonne Total km"
              >
                {totalKmOverall}
              </td>

              {/* Empty / span cells for weekly columns on this totals row */}
              {weeks.map((w) => (
                <td
                  key={`totals-col-${w.weekKey}`}
                  className="px-1.5 py-2 text-center text-slate-300 border-r border-slate-300 bg-emerald-50/40 text-xs font-mono"
                >
                  -
                </td>
              ))}
            </tr>

            {/* 2. Ligne dédiée pour les participants par semaine */}
            <tr className="bg-slate-200 border-t border-slate-300 font-bold text-slate-800">
              {/* Row index */}
              <td className="px-1 py-2 text-center font-mono text-[11px] bg-slate-300 text-slate-600 border-r border-slate-300 sticky left-0 z-40">
                {members.length + 3}
              </td>

              {/* Label */}
              <td
                onClick={() =>
                  handleCellClick(
                    `A${members.length + 3}`,
                    'TOTAL PARTICIPANTS PAR SEMAINE'
                  )
                }
                className="px-3 py-2 text-left bg-slate-200 border-r border-slate-300 sticky left-9 z-30 uppercase tracking-wider text-[11px] text-slate-700 font-bold cursor-pointer shadow-xs"
              >
                Total participants / sem.
              </td>

              {/* Col B (Points) */}
              <td className="px-2 py-2 text-center text-slate-400 font-mono bg-slate-200 border-r border-slate-300 sticky left-[226px] z-30 text-xs shadow-xs">
                -
              </td>

              {/* Col C (Randos) */}
              <td className="px-2 py-2 text-center text-slate-400 font-mono bg-slate-200 border-r border-slate-300 sticky left-[301px] z-30 text-xs shadow-xs">
                -
              </td>

              {/* Col D (Km) */}
              <td className="px-2 py-2 text-center text-slate-400 font-mono bg-slate-200 border-r-2 border-emerald-300 sticky left-[376px] z-30 text-xs shadow-xs">
                -
              </td>

              {/* Weekly Totals */}
              {weeks.map((w) => {
                const total = weekTotals[w.weekKey] || 0;
                return (
                  <td
                    key={`weekly-total-${w.weekKey}`}
                    onClick={() =>
                      handleCellClick(
                        `${w.colLetter}${members.length + 3}`,
                        `=NB.SI(${w.colLetter}2:${w.colLetter}${members.length + 1}; "x") [Participants: ${total}]`,
                        undefined,
                        w.headerLabel
                      )
                    }
                    className="px-1.5 py-2 text-center font-mono font-bold text-slate-800 border-r border-slate-300 bg-slate-200 hover:bg-slate-300 cursor-pointer text-xs"
                    title={`Nombre de participants ayant fait une rando en semaine ${w.weekNumber} : ${total}`}
                  >
                    {total > 0 ? (
                      <span className="text-slate-900 font-black">{total}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Spreadsheet Bottom Status Bar */}
      <div className="bg-slate-100 px-4 py-2 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Feuille : RPA_Points</span>
          <span className="text-slate-400">|</span>
          <span>
            {members.length} membres · {totalPointsOverall} points (x) · {totalRandosOverall} randos · {totalKmOverall.toLocaleString('fr-FR')} km
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
          <span>Col B: Total points</span>
          <span>·</span>
          <span>Col C: Total randos</span>
          <span>·</span>
          <span>Col D: Total km</span>
          <span>·</span>
          <span>Col E+: Semaines (Lun-Dim)</span>
        </div>
      </div>
    </div>
  );
};
