import React, { useMemo } from 'react';
import { MemberSummary, WeekInfo, RandoRecord } from '../types/rpa';
import { getSeasonTotalWeeks } from '../utils/dateAndWeek';
import {
  Users,
  Award,
  Bike,
  Route,
  Trophy,
  CalendarCheck,
  CalendarX,
  BarChart3,
} from 'lucide-react';

interface SeasonStatsProps {
  members: MemberSummary[];
  weeks: WeekInfo[];
  allRecords: RandoRecord[];
  selectedYear: number;
}

export const SeasonStats: React.FC<SeasonStatsProps> = ({
  members,
  weeks,
  allRecords,
  selectedYear,
}) => {
  // 1. Nbre de membres
  const membersCount = members.length;

  // 2. Points (somme des activeWeeksCount / 'x')
  const totalPoints = useMemo(() => {
    return members.reduce((acc, curr) => acc + curr.activeWeeksCount, 0);
  }, [members]);

  // 3. Nbre de randos (participations totales)
  const totalRandos = useMemo(() => {
    return members.reduce((acc, curr) => acc + curr.totalRandos, 0);
  }, [members]);

  // 4. Kilomètres cumulés
  const totalKm = useMemo(() => {
    const sum = members.reduce((acc, curr) => acc + curr.totalKm, 0);
    return Math.round(sum * 10) / 10;
  }, [members]);

  // 5. Nbre max de membres sur une rando
  const { maxMembersOnOneRando, topRandoEvent } = useMemo(() => {
    if (!allRecords || allRecords.length === 0) {
      return { maxMembersOnOneRando: 0, topRandoEvent: null };
    }

    const randoEventsMap = new Map<
      string,
      { randoName: string; dateStr: string; members: Set<string> }
    >();

    for (const rec of allRecords) {
      const randoNameClean = rec.randoName?.trim() || 'Rando sans titre';
      const dateClean = rec.dateStr?.trim() || '';
      const key = `${dateClean}___${randoNameClean.toLowerCase()}`;

      if (!randoEventsMap.has(key)) {
        randoEventsMap.set(key, {
          randoName: randoNameClean,
          dateStr: dateClean,
          members: new Set<string>(),
        });
      }

      if (rec.fullMemberName) {
        randoEventsMap.get(key)!.members.add(rec.fullMemberName);
      }
    }

    let max = 0;
    let best: { randoName: string; dateStr: string; count: number } | null = null;

    for (const event of randoEventsMap.values()) {
      const count = event.members.size;
      if (count > max) {
        max = count;
        best = {
          randoName: event.randoName,
          dateStr: event.dateStr,
          count,
        };
      }
    }

    return { maxMembersOnOneRando: max, topRandoEvent: best };
  }, [allRecords]);

  // 6. Nombre de semaines avec randos
  const weeksWithRandos = weeks.length;

  // 7. Nombre de semaines sans rando
  const totalSeasonWeeks = useMemo(() => {
    return getSeasonTotalWeeks(selectedYear);
  }, [selectedYear]);

  const weeksWithoutRandos = Math.max(0, totalSeasonWeeks - weeksWithRandos);
  const percentActive = totalSeasonWeeks > 0 ? Math.round((weeksWithRandos / totalSeasonWeeks) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-4 sm:p-5">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Statistiques de la saison {selectedYear}
            </h3>
            <p className="text-xs text-slate-500">
              Synthèse globale · Période du 01/11/{selectedYear - 1} au 31/10/{selectedYear}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
          {totalSeasonWeeks} semaines au calendrier
        </div>
      </div>

      {/* Grid of 7 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* 1. Nombre de membres */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 flex flex-col justify-between hover:bg-slate-50 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Membres</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {membersCount}
            </div>
            <div className="text-[11px] text-slate-500 truncate" title="Membres enregistrés">
              {membersCount > 1 ? 'Membres inscrits' : 'Membre inscrit'}
            </div>
          </div>
        </div>

        {/* 2. Total des points */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 flex flex-col justify-between hover:bg-emerald-50 transition-colors">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Points</span>
            <Award className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-900 font-mono">
              {totalPoints}
            </div>
            <div className="text-[11px] text-emerald-700 truncate" title="Points cumulés (x)">
              Points attribués (x)
            </div>
          </div>
        </div>

        {/* 3. Nombre de randos */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3 flex flex-col justify-between hover:bg-blue-50 transition-colors">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Randos</span>
            <Bike className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <div className="text-xl font-black text-blue-900 font-mono">
              {totalRandos}
            </div>
            <div className="text-[11px] text-blue-700 truncate" title="Participations totales">
              Participations
            </div>
          </div>
        </div>

        {/* 4. Kilomètres */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 flex flex-col justify-between hover:bg-amber-50 transition-colors">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Distance</span>
            <Route className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-900 font-mono">
              {totalKm.toLocaleString('fr-FR')} <span className="text-xs font-semibold">km</span>
            </div>
            <div className="text-[11px] text-amber-700 truncate" title="Kilomètres cumulés">
              Km cumulés
            </div>
          </div>
        </div>

        {/* 5. Nbre max de membres sur une rando */}
        <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3 flex flex-col justify-between hover:bg-rose-50 transition-colors">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" title="Nombre max de membres sur une rando">
              Max / rando
            </span>
            <Trophy className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-900 font-mono">
              {maxMembersOnOneRando} <span className="text-xs font-semibold">cyclos</span>
            </div>
            <div
              className="text-[11px] text-rose-700 truncate"
              title={
                topRandoEvent
                  ? `Record sur : ${topRandoEvent.randoName}${topRandoEvent.dateStr ? ` (${topRandoEvent.dateStr})` : ''}`
                  : 'Aucune sortie enregistrée'
              }
            >
              {topRandoEvent ? topRandoEvent.randoName : 'Aucune sortie'}
            </div>
          </div>
        </div>

        {/* 6. Nombre de semaines avec randos */}
        <div className="bg-teal-50/60 border border-teal-200 rounded-lg p-3 flex flex-col justify-between hover:bg-teal-50 transition-colors">
          <div className="flex items-center justify-between text-teal-700 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" title="Nombre de semaines avec randos">
              Sem. avec rando
            </span>
            <CalendarCheck className="w-4 h-4 text-teal-700" />
          </div>
          <div>
            <div className="text-xl font-black text-teal-900 font-mono">
              {weeksWithRandos}
            </div>
            <div className="text-[11px] text-teal-700 truncate" title={`${weeksWithRandos} semaines actives sur ${totalSeasonWeeks}`}>
              {percentActive}% de la saison
            </div>
          </div>
        </div>

        {/* 7. Nombre de semaines sans rando */}
        <div className="bg-slate-100/80 border border-slate-200 rounded-lg p-3 flex flex-col justify-between hover:bg-slate-100 transition-colors">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider" title="Nombre de semaines sans rando">
              Sem. sans rando
            </span>
            <CalendarX className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 font-mono">
              {weeksWithoutRandos}
            </div>
            <div className="text-[11px] text-slate-500 truncate" title={`${weeksWithoutRandos} semaines sans rando sur ${totalSeasonWeeks}`}>
              Sans sortie
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
