import React, { useState } from 'react';
import { SeasonInfo } from '../types/rpa';
import {
  Folder,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface DataSourceManagerProps {
  seasonInfo: SeasonInfo;
  selectedYear: number;
  onChangeSelectedYear: (year: number) => void;
  loadedFiles: { filename: string; count: number }[];
  isServerLocalFound: boolean;
  localDirPath: string;
  onFilesSelected: (files: FileList | File[]) => void;
  onDirectoryPick?: () => void;
  onCheckLocalServer: () => void;
  isLoading: boolean;
  referenceDate: Date;
  onChangeReferenceDate: (newDate: Date) => void;
  totalBeforeFilter: number;
  totalAfterFilter: number;
  excludedCount: number;
  isCustomData: boolean;
}

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  seasonInfo,
  selectedYear,
  onChangeSelectedYear,
  loadedFiles,
  isServerLocalFound,
  localDirPath,
  onFilesSelected,
  onDirectoryPick,
  onCheckLocalServer,
  isLoading,
  referenceDate,
  onChangeReferenceDate,
  totalBeforeFilter,
  totalAfterFilter,
  excludedCount,
  isCustomData,
}) => {
  const [showRuleDetails, setShowRuleDetails] = useState(false);
  const [showSimulateDate, setShowSimulateDate] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onChangeReferenceDate(new Date(e.target.value));
    }
  };

  const availableYears = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3.5">
      {/* 1. Header with Year Selector & Season Boundary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        {/* Year Selector Control */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="year-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Année dont on veut calculer les points :
              </label>
              <button
                type="button"
                onClick={() => setShowRuleDetails(!showRuleDetails)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Détails de la règle des 2 années et du 1er novembre"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Year Picker */}
            <div className="flex items-center gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => onChangeSelectedYear(selectedYear - 1)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Année précédente"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => onChangeSelectedYear(Number(e.target.value))}
                className="bg-emerald-50 border border-emerald-300 font-bold text-emerald-900 text-sm rounded px-2.5 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Saison {yr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onChangeSelectedYear(selectedYear + 1)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Année suivante"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs text-slate-600 ml-2 font-medium">
                Période : <span className="text-emerald-800 font-bold">01/11/{selectedYear - 1}</span> au{' '}
                <span className="text-emerald-800 font-bold">31/10/{selectedYear}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Filter Stats Badge */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md text-xs text-emerald-900 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>
              <strong>{totalAfterFilter}</strong> sorties retenues pour {selectedYear}
            </span>
            {excludedCount > 0 && (
              <span className="text-slate-500 text-[11px]">
                ({excludedCount} hors saison exclues)
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSimulateDate(!showSimulateDate)}
            className="text-xs text-slate-500 hover:text-emerald-700 underline cursor-pointer"
          >
            {showSimulateDate ? 'Fermer date' : 'Date de référence'}
          </button>
        </div>
      </div>

      {showSimulateDate && (
        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-700">Date de simulation :</span>
          <input
            type="date"
            value={referenceDate.toISOString().slice(0, 10)}
            onChange={handleDateChange}
            className="border border-slate-300 rounded px-2 py-1 bg-white text-slate-800"
          />
          <button
            type="button"
            onClick={() => onChangeReferenceDate(new Date())}
            className="text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
          >
            Réinitialiser à aujourd'hui
          </button>
          <span className="text-slate-500 italic">
            (Période saisonnière : du 01/11/{selectedYear - 1} au 31/10/{selectedYear})
          </span>
        </div>
      )}

      {showRuleDetails && (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-md text-xs text-emerald-950 space-y-2">
          <div className="font-bold text-emerald-900 text-sm">
            Règles de calcul de la saison {selectedYear} :
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-800">
            <li>
              <strong>Période de la saison {selectedYear} :</strong> du <strong>1er novembre {selectedYear - 1}</strong> au <strong>31 octobre {selectedYear}</strong>.
            </li>
            <li>
              <strong>Filtre sur les 2 fichiers :</strong>
              <ul className="list-circle list-inside ml-4 mt-0.5 space-y-0.5 text-slate-700">
                <li>
                  Dans le fichier <code className="bg-white px-1 py-0.5 rounded border border-emerald-300 font-mono">{selectedYear - 1}.csv</code> : on retient les lignes avec <strong>date ≥ 1er novembre {selectedYear - 1}</strong>.
                </li>
                <li>
                  Dans le fichier <code className="bg-white px-1 py-0.5 rounded border border-emerald-300 font-mono">{selectedYear}.csv</code> : on retient les lignes avec <strong>date &lt; 1er novembre {selectedYear}</strong>.
                </li>
              </ul>
            </li>
            <li>
              <strong>Extraction des kilomètres :</strong> la valeur numérique de distance est extraite en priorité du <strong>champ 3</strong> (ex. <code className="bg-white px-1 rounded font-mono">65</code> ou <code className="bg-white px-1 rounded font-mono">LECLERC Sabine 65 km</code>).
            </li>
            <li>
              <strong>Regroupement :</strong> toutes les lignes d'un même membre sont regroupées sur une seule ligne avec le total des points (x), le total des randos et le total des kilomètres.
            </li>
          </ul>
        </div>
      )}

      {/* Directory path & action buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-500">Dossier cible local : </span>
            <code className="font-mono font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
              {localDirPath}
            </code>
            {isServerLocalFound ? (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Détecté sur le poste
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center gap-1 text-slate-500">
                (sur poste de Sabine)
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct directory selector for browser */}
          {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
            <button
              type="button"
              onClick={onDirectoryPick}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5 text-slate-600" />
              Ouvrir le dossier RPA
            </button>
          )}

          {/* Hidden manual file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.cvs,text/csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFilesSelected(e.target.files);
              }
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition-colors flex items-center gap-2 cursor-pointer text-left"
          >
            <Upload className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <span className="font-medium text-slate-900">Sélectionner CVS</span>
              <span className="text-[10px] text-slate-500 font-normal">généré(s) via Vélo-liberté</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onCheckLocalServer}
            disabled={isLoading}
            title="Rafraîchir"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Currently loaded files indicator */}
      {loadedFiles.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium">Fichiers analysés :</span>
            {loadedFiles.map((f) => (
              <span
                key={f.filename}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-700"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                {f.filename} ({f.count} lignes brutes)
              </span>
            ))}
          </div>

          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded font-medium text-[11px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Vos fichiers CSV restent conservés au changement de saison
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500 italic">
          <span>Aucun fichier chargé pour le moment. Cliquez sur « Sélectionner CVS » pour importer vos données de sorties.</span>
        </div>
      )}
    </div>
  );
};
