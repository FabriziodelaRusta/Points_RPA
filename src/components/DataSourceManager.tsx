import React, { useState, useMemo } from 'react';
import { SeasonInfo } from '../types/rpa';
import {
  Folder,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  HelpCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Info,
} from 'lucide-react';

interface DataSourceManagerProps {
  seasonInfo: SeasonInfo;
  selectedYear: number;
  onChangeSelectedYear: (year: number) => void;
  availableYears?: number[];
  loadedFiles: { filename: string; count: number }[];
  isServerLocalFound: boolean;
  localDirPath: string;
  onFilesSelected: (files: FileList | File[]) => void;
  onDirectoryPick?: () => void;
  onCheckLocalServer: () => void;
  onRemoveFile: (filename: string) => void;
  isLoading: boolean;
  totalBeforeFilter: number;
  totalAfterFilter: number;
  excludedCount: number;
  isCustomData: boolean;
}

export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  seasonInfo,
  selectedYear,
  onChangeSelectedYear,
  availableYears = [2024, 2025, 2026],
  loadedFiles,
  isServerLocalFound,
  localDirPath,
  onFilesSelected,
  onDirectoryPick,
  onCheckLocalServer,
  onRemoveFile,
  isLoading,
  totalBeforeFilter,
  totalAfterFilter,
  excludedCount,
  isCustomData,
}) => {
  const [showRuleDetails, setShowRuleDetails] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Liste dynamique des années incluant toujours l'année sélectionnée
  const displayedYears = useMemo(() => {
    const set = new Set(availableYears && availableYears.length > 0 ? availableYears : [2024, 2025, 2026]);
    set.add(selectedYear); // Assure que l'année courante ou naviguée est toujours présente
    return Array.from(set).sort((a, b) => a - b);
  }, [availableYears, selectedYear]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3.5">
      {/* 1. Header with Year Selector, Dynamic Dropdown & Season Boundary with Blue Help */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Layers className="w-5 h-5" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Contrôles de sélection d'année (< , liste déroulante dynamique , >) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChangeSelectedYear(selectedYear - 1)}
                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Année précédente"
                aria-label="Année précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => onChangeSelectedYear(Number(e.target.value))}
                className="bg-emerald-50 border border-emerald-300 font-bold text-emerald-900 text-sm rounded px-3 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {displayedYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Saison {yr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onChangeSelectedYear(selectedYear + 1)}
                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Année suivante"
                aria-label="Année suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Période affichée avec le bouton Help bleu positionné à sa droite */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
              <span>
                Période : <span className="text-emerald-800 font-bold">01/11/{selectedYear - 1}</span> au{' '}
                <span className="text-emerald-800 font-bold">31/10/{selectedYear}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRuleDetails(!showRuleDetails)}
                className="p-0.5 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-100/70 transition-colors cursor-pointer ml-0.5"
                title="Afficher les règles de calcul de la saison"
                aria-label="Aide sur les règles de la saison"
              >
                <HelpCircle className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Compteur de sorties retenues */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-xs bg-slate-100 text-slate-800 px-3 py-1.5 rounded-md border border-slate-200 font-medium flex items-center gap-1.5 shadow-2xs">
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
        </div>
      </div>

      {showRuleDetails && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-slate-900 space-y-2">
          <div className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            Règles de calcul de la saison {selectedYear} :
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-800">
            <li>
              <strong>Période de la saison {selectedYear} :</strong> du <strong>1er novembre {selectedYear - 1}</strong> au <strong>31 octobre {selectedYear}</strong>.
            </li>
            <li>
              <strong>Liste des saisons dynamique :</strong> la liste déroulante propose automatiquement toutes les années détectées dans les fichiers de votre dépôt GitHub.
            </li>
            <li>
              <strong>Sélection automatique GitHub :</strong> les fichiers du dossier <code className="bg-white px-1 py-0.5 rounded border border-slate-300 font-mono">participations</code> dont le nom contient <strong>{selectedYear - 1}</strong> ou <strong>{selectedYear}</strong> sont automatiquement analysés.
            </li>
            <li>
              <strong>Bouton « Sélectionner CVS » :</strong> permet d'ajouter des fichiers manuels complémentaires sans écraser les fichiers déjà chargés.
            </li>
            <li>
              <strong>Protection du dépôt GitHub :</strong> cliquer sur le symbole Corbeille retire uniquement le fichier de l'analyse locale dans votre navigateur pour le calcul des points. <em>Aucun fichier n'est modifié ni supprimé sur GitHub.</em>
            </li>
          </ul>
        </div>
      )}

      {/* Source & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="text-xs">
            <span className="text-slate-500">Source : </span>
            <span className="font-mono font-medium text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
              GitHub (FabriziodelaRusta/Input_files/participations)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Direct directory selector for browser if supported */}
          {typeof window !== 'undefined' && 'showDirectoryPicker' in window && (
            <button
              type="button"
              onClick={onDirectoryPick}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5 text-slate-600" />
              Ouvrir un dossier
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
                e.target.value = ''; // Reset so the same file can be re-selected if deleted
              }
            }}
          />

          {/* Bouton pour ajouter des fichiers (n'écrase pas les fichiers existants) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 transition-colors flex items-center gap-2 cursor-pointer text-left"
            title="Ajouter des fichiers CSV complémentaires"
          >
            <Upload className="w-4 h-4 text-slate-600 shrink-0" />
            <div className="flex flex-col items-start leading-tight">
              <span className="font-medium text-slate-900">Sélectionner CVS</span>
              <span className="text-[10px] text-slate-500 font-normal">ajouter des fichiers</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onCheckLocalServer}
            disabled={isLoading}
            title="Recharger les fichiers depuis GitHub"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Currently loaded files indicator with Trash icon for each */}
      {loadedFiles.length > 0 ? (
        <div className="pt-2 border-t border-slate-100 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-medium shrink-0">Fichiers analysés :</span>
            {loadedFiles.map((f) => (
              <span
                key={f.filename}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded font-mono text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="font-semibold">{f.filename}</span>
                <span className="text-slate-500 font-sans text-[11px]">({f.count} lignes brutes)</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(f.filename)}
                  title={`Retirer ${f.filename} de l'analyse locale (le fichier reste intact sur GitHub)`}
                  aria-label={`Retirer ${f.filename} de l'analyse locale`}
                  className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="text-[11px] text-slate-400 italic">
            * Cliquer sur la corbeille retire un fichier uniquement de l'analyse locale sur votre écran (GitHub reste intact).
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500 italic">
          <span>{isLoading ? 'Chargement des fichiers depuis GitHub...' : 'Aucun fichier chargé pour le moment. Cliquez sur « Sélectionner CVS » pour importer vos données.'}</span>
        </div>
      )}
    </div>
  );
};
