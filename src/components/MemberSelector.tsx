import React from 'react';
import { MemberSummary, RandoRecord } from '../types/rpa';
import { User, Calendar, Award, CheckCircle2, ChevronRight, X, Route, Trophy } from 'lucide-react';
import { checkSportTrophy } from '../utils/trophy';

interface MemberSelectorProps {
  members: MemberSummary[];
  selectedMemberName: string | null;
  onSelectMember: (name: string | null) => void;
  onScrollToMember?: (name: string) => void;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({
  members,
  selectedMemberName,
  onSelectMember,
  onScrollToMember,
}) => {
  const selectedMember = members.find((m) => m.memberName === selectedMemberName);

  const getMemberGrandTotalKm = (m: MemberSummary) => {
    const specialsKm =
      (m.specials?.frKm || 0) + (m.specials?.voyageKm || 0) + (m.specials?.sejourKm || 0);
    return Math.round((m.totalKm + specialsKm) * 10) / 10;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
      <div>
        {/* Dropdown with member and count of randos as requested */}
        <label
          htmlFor="member-dropdown"
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          Liste déroulante des membres · Randos, points & km (total global)
        </label>
        <div className="relative">
          <select
            id="member-dropdown"
            value={selectedMemberName || ''}
            onChange={(e) => onSelectMember(e.target.value ? e.target.value : null)}
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-md px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors font-medium cursor-pointer"
          >
            <option value="">-- Tous les membres ({members.length} inscrits) --</option>
            {members.map((m) => {
              const grandTotalKm = getMemberGrandTotalKm(m);
              const trophy = checkSportTrophy(m);
              return (
                <option key={m.memberName} value={m.memberName}>
                  {trophy.eligible ? '🏆 ' : ''}{m.memberName} — {m.totalRandos} rando{m.totalRandos > 1 ? 's' : ''} · {m.activeWeeksCount} point{m.activeWeeksCount > 1 ? 's' : ''} · {grandTotalKm} km
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Selected Member Detail Box */}
      {selectedMember && (
        <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/70 -mx-4 -mb-4 p-4 rounded-b-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {selectedMember.memberName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1">
                    {selectedMember.memberName}
                    {checkSportTrophy(selectedMember).eligible && (
                      <sup
                        className="inline-flex items-center -translate-y-1 ml-0.5 text-amber-500"
                        title="Trophée sportif : ≥ 20 sorties dont ≥ 10 randos et ≥ 1600 km"
                      >
                        <Trophy className="w-4 h-4 fill-amber-400 stroke-amber-600 drop-shadow-2xs" />
                      </sup>
                    )}
                  </span>
                  {checkSportTrophy(selectedMember).eligible && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full flex items-center gap-1 shadow-2xs">
                      🏆 Trophée 20 randos / 1600 km
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    {selectedMember.activeWeeksCount} point{selectedMember.activeWeeksCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-800 rounded-full">
                    {selectedMember.totalRandos} rando{selectedMember.totalRandos > 1 ? 's' : ''}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-full"
                    title="Total km : randos + séjours + voyages + flèches et relais et autres"
                  >
                    {getMemberGrandTotalKm(selectedMember)} km total
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedMember.totalRandos} participation{selectedMember.totalRandos > 1 ? 's' : ''} sur {selectedMember.activeWeeksCount} semaine{selectedMember.activeWeeksCount > 1 ? 's' : ''}
                  {Boolean(
                    selectedMember.specials &&
                      (selectedMember.specials.frKm > 0 ||
                        selectedMember.specials.voyageKm > 0 ||
                        selectedMember.specials.sejourKm > 0)
                  ) && (
                    <span className="ml-1 text-slate-400">
                      (dont {selectedMember.totalKm} km randos,{' '}
                      {[
                        selectedMember.specials?.frKm
                          ? `${selectedMember.specials.frKm} km flèches/relais`
                          : null,
                        selectedMember.specials?.voyageKm
                          ? `${selectedMember.specials.voyageKm} km voyages`
                          : null,
                        selectedMember.specials?.sejourKm
                          ? `${selectedMember.specials.sejourKm} km séjours`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onScrollToMember && (
                <button
                  type="button"
                  onClick={() => onScrollToMember(selectedMember.memberName)}
                  className="px-2.5 py-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  Localiser dans Calc
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onSelectMember(null)}
                aria-label="Fermer la vue membre"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of individual randos for this member */}
          <div className="mt-3">
            <div className="text-xs font-semibold text-slate-600 mb-1.5">
              Détail des sorties ({selectedMember.records.length}) :
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {selectedMember.records.map((rec: RandoRecord, idx) => (
                <div
                  key={rec.id || idx}
                  className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-slate-700">{rec.dateStr}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-900 font-medium">{rec.randoName}</span>
                    {rec.km > 0 && (
                      <span className="text-emerald-700 font-mono text-[11px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {rec.km} km
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">Semaine {rec.weekNumber}</span>
                    <span className="text-slate-400">({rec.sourceFile})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
