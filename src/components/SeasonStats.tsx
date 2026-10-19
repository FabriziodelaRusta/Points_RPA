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
  Compass,
  Plane,
  Hotel,
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

  // 8. Statistiques spécifiques pour les fichiers FR ou VOY :
  // - Flèches-Relais : total flèches-relais, nbre de personnes, total km
  // - Voyages : total voyages par personne (si 2 personnes font le même voyage = 2), nbre de personnes, total km
  // - Séjours : total séjours par personne (si 2 personnes font le même séjour = 2), nbre de personnes, total km
  const specialStats = useMemo(() => {
    let flechesRelaisCount = 0;
    let flechesRelaisKm = 0;
    const flechesRelaisPersons = new Set<string>();

    let voyagesCount = 0;
    let voyagesKm = 0;
    const voyagesPersons = new Set<string>();

    let sejoursCount = 0;
    let sejoursKm = 0;
    const sejoursPersons = new Set<string>();

    for (const member of members) {
      if (member.specials) {
        if (member.specials.frCount > 0) {
          flechesRelaisCount += member.specials.frCount;
          flechesRelaisKm += member.specials.frKm;
          flechesRelaisPersons.add(member.memberName);
        }
        if (member.specials.voyageCount > 0) {
          voyagesCount += member.specials.voyageCount;
          voyagesKm += member.specials.voyageKm;
          voyagesPersons.add(member.memberName);
        }
        if (member.specials.sejourCount > 0) {
          sejoursCount += member.specials.sejourCount;
          sejoursKm += member.specials.sejourKm;
          sejoursPersons.add(member.memberName);
        }
      }
    }

    return {
      flechesRelais: {
        total: flechesRelaisCount,
        km: Math.round(flechesRelaisKm * 10) / 10,
        persons: flechesRelaisPersons.size,
      },
      voyages: {
        total: voyagesCount,
        km: Math.round(voyagesKm * 10) / 10,
        persons: voyagesPersons.size,
      },
      sejours: {
        total: sejoursCount,
        km: Math.round(sejoursKm * 10) / 10,
        persons: sejoursPersons.size,
      },
      hasAny: flechesRelaisCount > 0 || voyagesCount > 0 || sejoursCount > 0,
    };
  }, [members]);

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

      {/* Section Activités Spéciales (Fichiers FR & VOY) */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-100 text-purple-800 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Flèches-Relais, Voyages & Séjours · Fichiers FR ou VOY
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-mono self-start sm:self-auto">
            {specialStats.hasAny
              ? 'Activité(s) comptabilisée(s)'
              : 'En attente de fichier(s) FR ou VOY'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Flèches - Relais */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3.5 flex flex-col justify-between hover:bg-purple-50 transition-colors">
            <div className="flex items-center justify-between text-purple-700 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Flèches - Relais
              </span>
              <Compass className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-purple-950 font-mono">
                {specialStats.flechesRelais.total}
              </div>
              <div className="text-xs font-medium text-purple-800 mt-0.5">
                {specialStats.flechesRelais.total > 1
                  ? 'Total flèches-relais effectuées'
                  : 'Total flèche-relais effectuée'}
              </div>
              <div className="mt-2 pt-2 border-t border-purple-200/60 flex items-center justify-between text-[11px] text-purple-700">
                <span>
                  <strong>{specialStats.flechesRelais.persons}</strong>{' '}
                  {specialStats.flechesRelais.persons > 1 ? 'personnes' : 'personne'}
                </span>
                <span className="font-mono font-bold text-purple-900 bg-purple-100/70 px-1.5 py-0.5 rounded">
                  {specialStats.flechesRelais.km.toLocaleString('fr-FR')} km
                </span>
              </div>
            </div>
          </div>

          {/* 2. Voyages */}
          <div
            className="bg-sky-50/70 border border-sky-200 rounded-lg p-3.5 flex flex-col justify-between hover:bg-sky-50 transition-colors"
            title="Chaque voyage n'est compté qu'une fois par personne si le nom du voyage est identique (les km de toutes les étapes sont cumulés)"
          >
            <div className="flex items-center justify-between text-sky-700 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Voyages
              </span>
              <Plane className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-sky-950 font-mono">
                {specialStats.voyages.total}
              </div>
              <div className="text-xs font-medium text-sky-800 mt-0.5">
                {specialStats.voyages.total > 1
                  ? 'Voyages distincts par personne'
                  : 'Voyage distinct par personne'}
              </div>
              <div className="mt-2 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[11px] text-sky-700">
                <span>
                  <strong>{specialStats.voyages.persons}</strong>{' '}
                  {specialStats.voyages.persons > 1 ? 'personnes' : 'personne'}
                </span>
                <span className="font-mono font-bold text-sky-900 bg-sky-100/70 px-1.5 py-0.5 rounded">
                  {specialStats.voyages.km.toLocaleString('fr-FR')} km
                </span>
              </div>
            </div>
          </div>

          {/* 3. Séjours */}
          <div
            className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex flex-col justify-between hover:bg-amber-50 transition-colors"
            title="Chaque séjour n'est compté qu'une fois par personne si le nom du séjour est identique (les km de toutes les étapes sont cumulés)"
          >
            <div className="flex items-center justify-between text-amber-700 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Séjours
              </span>
              <Hotel className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                {specialStats.sejours.total}
              </div>
              <div className="text-xs font-medium text-amber-800 mt-0.5">
                {specialStats.sejours.total > 1
                  ? 'Séjours distincts par personne'
                  : 'Séjour distinct par personne'}
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-amber-700">
                <span>
                  <strong>{specialStats.sejours.persons}</strong>{' '}
                  {specialStats.sejours.persons > 1 ? 'personnes' : 'personne'}
                </span>
                <span className="font-mono font-bold text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded">
                  {specialStats.sejours.km.toLocaleString('fr-FR')} km
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
