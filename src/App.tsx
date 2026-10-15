import React, { useState, useEffect, useMemo } from 'react';
import { RandoRecord, MemberSummary, WeekInfo, SeasonInfo } from './types/rpa';
import { getSeasonInfo } from './utils/dateAndWeek';
import { parseRpaCsv, processAllRecords } from './utils/csvParser';
import { SAMPLE_2025_CSV, SAMPLE_2026_CSV, SAMPLE_2027_CSV } from './utils/sampleData';
import { MemberSelector } from './components/MemberSelector';
import { DataSourceManager } from './components/DataSourceManager';
import { LibreCalcTable } from './components/LibreCalcTable';
import { SeasonStats } from './components/SeasonStats';
import {
  ListOrdered,
  Table as TableIcon,
  Calendar,
  Award,
  Users,
  Compass,
  FileText,
  Printer,
  ChevronDown,
  Layers,
} from 'lucide-react';

export default function App() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [loadedFiles, setLoadedFiles] = useState<{ filename: string; content: string; count: number }[]>([]);
  const [isCustomData, setIsCustomData] = useState<boolean>(false);
  const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'calc' | 'chronological'>('calc');
  const [isServerLocalFound, setIsServerLocalFound] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const localDirPath = '/home/sabine/Documents/RPA';

  // Calculate season rule based on selected year and reference date
  const seasonInfo: SeasonInfo = useMemo(() => {
    return getSeasonInfo(selectedYear, referenceDate);
  }, [selectedYear, referenceDate]);

  // Load sample dataset matching the selected season (du 01/11/(selectedYear - 1) au 31/10/selectedYear)
  const loadSampleDataset = () => {
    const filesToLoad: { filename: string; content: string }[] = [];

    if (selectedYear === 2026) {
      filesToLoad.push(
        {
          filename: `2025.csv`,
          content: SAMPLE_2025_CSV,
        },
        {
          filename: `2026.csv`,
          content: SAMPLE_2026_CSV,
        }
      );
    } else if (selectedYear === 2025) {
      filesToLoad.push(
        {
          filename: `2024.csv`,
          content: SAMPLE_2025_CSV,
        },
        {
          filename: `2025.csv`,
          content: SAMPLE_2025_CSV,
        }
      );
    } else {
      filesToLoad.push(
        {
          filename: `${selectedYear - 1}.csv`,
          content: SAMPLE_2025_CSV,
        },
        {
          filename: `${selectedYear}.csv`,
          content: SAMPLE_2026_CSV,
        }
      );
    }

    const processed = filesToLoad.map((f) => {
      const records = parseRpaCsv(f.content, f.filename);
      return {
        filename: f.filename,
        content: f.content,
        count: records.length,
      };
    });

    setIsCustomData(false);
    setLoadedFiles(processed);
    setStatusMessage(
      `Données exemples de la saison ${selectedYear} chargées (${processed.map((p) => p.filename).join(' et ')}) : période du 01/11/${selectedYear - 1} au 31/10/${selectedYear}.`
    );
  };

  // Attempt to check and fetch files from server if running locally on Sabine's machine
  const checkLocalServerFiles = async () => {
    setIsLoading(true);
    try {
      const checkRes = await fetch(`/api/rpa/check?dir=${encodeURIComponent(localDirPath)}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        setIsServerLocalFound(checkData.dirExists);

        if (checkData.dirExists) {
          const readRes = await fetch(`/api/rpa/read-files?dir=${encodeURIComponent(localDirPath)}&year=${selectedYear}`);
          if (readRes.ok) {
            const readData = await readRes.json();
            if (readData.loadedFiles && readData.loadedFiles.length > 0) {
              const processed = readData.loadedFiles.map((f: any) => {
                const records = parseRpaCsv(f.content, f.filename);
                return {
                  filename: f.filename,
                  content: f.content,
                  count: records.length,
                };
              });
              setIsCustomData(true);
              setLoadedFiles(processed);
              setStatusMessage(
                `Fichiers locaux chargés depuis ${localDirPath} : ${processed.map((p: any) => p.filename).join(', ')}`
              );
              setIsLoading(false);
              return;
            }
          }
        }
      }
    } catch {
      setIsServerLocalFound(false);
    }

    // Default to sample dataset if no files loaded yet
    if (loadedFiles.length === 0) {
      loadSampleDataset();
    }
    setIsLoading(false);
  };

  // Run on mount
  useEffect(() => {
    checkLocalServerFiles();
  }, []);

  // When selected year changes:
  // If using demo data, reload sample data for the new season.
  // If user uploaded their own CSVs, PRESERVE their files and re-filter!
  useEffect(() => {
    if (!isCustomData) {
      loadSampleDataset();
    } else {
      setStatusMessage(
        `Saison ${selectedYear} appliquée à vos fichiers importés (${loadedFiles.map((f) => f.filename).join(', ')}).`
      );
    }
  }, [selectedYear]);

  // Handle manual files upload
  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newLoaded: { filename: string; content: string; count: number }[] = [];

    for (const file of fileArray) {
      const text = await file.text();
      const records = parseRpaCsv(text, file.name);
      newLoaded.push({
        filename: file.name,
        content: text,
        count: records.length,
      });
    }

    if (newLoaded.length > 0) {
      setIsCustomData(true);
      setLoadedFiles(newLoaded);
      setStatusMessage(
        `Fichiers personnels importés : ${newLoaded.map((f) => f.filename).join(', ')} (${newLoaded.reduce((acc, c) => acc + c.count, 0)} lignes) — vos fichiers seront conservés lors du changement de saison.`
      );
    }
  };

  // Browser directory picker (File System Access API)
  const handleDirectoryPick = async () => {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) return;
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      const expected = seasonInfo.expectedFiles;
      const found: { filename: string; content: string; count: number }[] = [];

      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const name = entry.name;
          const isTarget =
            expected.some((exp) => exp.toLowerCase() === name.toLowerCase()) ||
            expected.some((exp) => exp.replace('.csv', '.cvs').toLowerCase() === name.toLowerCase()) ||
            name.toLowerCase().endsWith('.csv');

          if (isTarget) {
            const file = await entry.getFile();
            const text = await file.text();
            const records = parseRpaCsv(text, name);
            found.push({
              filename: name,
              content: text,
              count: records.length,
            });
          }
        }
      }

      if (found.length > 0) {
        setIsCustomData(true);
        setLoadedFiles(found);
        setStatusMessage(`Dossier personnel chargé : ${found.map((f) => f.filename).join(', ')} — vos fichiers seront conservés lors du changement de saison.`);
      } else {
        setStatusMessage(
          `Aucun des fichiers attendus (${expected.join(', ')}) n'a été trouvé dans le dossier sélectionné.`
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Erreur sélection dossier:', err);
      }
    }
  };

  // Combine records from all loaded files
  const combinedRawRecords = useMemo(() => {
    const list: RandoRecord[] = [];
    for (const f of loadedFiles) {
      const parsed = parseRpaCsv(f.content, f.filename);
      list.push(...parsed);
    }
    return list;
  }, [loadedFiles]);

  // Process, group and sort records:
  // - Filtrage strict de l'année sélectionnée :
  //   Pour l'année YYYY :
  //   - Fichier YYYY-1 : lignes >= 1er novembre (YYYY-1)
  //   - Fichier YYYY : lignes < 1er novembre YYYY
  // - Regrouper les lignes par noms
  // - Trier par date (1er champ) et par nom (3e champ)
  const { sortedRecords, weeks, members, totalBeforeFilter, totalAfterFilter, excludedCount } = useMemo(() => {
    return processAllRecords(combinedRawRecords, selectedYear);
  }, [combinedRawRecords, selectedYear]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Title as requested with official RPA logo */}
          <div className="flex items-center gap-3">
            <img
              src="https://fabriziodelarusta.github.io/icons/logo-RPA_bleu.png"
              alt="Logo Roue Princière d'Allain"
              className="w-12 h-12 object-contain shrink-0 drop-shadow-xs"
              loading="eager"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Calcul des points pour les membres de la Roue Princière d'Allain
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>Club cyclotourisme & randonnées</span>
                <span>·</span>
                <span>Allain (Meurthe-et-Moselle)</span>
                <span>·</span>
                <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Saison {selectedYear} (du 01/11/{selectedYear - 1} au 31/10/{selectedYear})
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & View Toggles */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('calc')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'calc'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Tableau LibreOffice Calc
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chronological')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'chronological'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Liste triée ({sortedRecords.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Imprimer la feuille de calcul"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 flex-1 w-full space-y-6">
        {/* Status notification if any */}
        {statusMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2 rounded-md flex items-center justify-between shadow-2xs">
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage('')}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-3 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* 1. Data Source & Season Year Manager */}
        <DataSourceManager
          seasonInfo={seasonInfo}
          selectedYear={selectedYear}
          onChangeSelectedYear={setSelectedYear}
          loadedFiles={loadedFiles}
          isServerLocalFound={isServerLocalFound}
          localDirPath={localDirPath}
          onLoadSampleData={loadSampleDataset}
          onFilesSelected={handleFilesSelected}
          onDirectoryPick={handleDirectoryPick}
          onCheckLocalServer={checkLocalServerFiles}
          isLoading={isLoading}
          referenceDate={referenceDate}
          onChangeReferenceDate={setReferenceDate}
          totalBeforeFilter={totalBeforeFilter}
          totalAfterFilter={totalAfterFilter}
          excludedCount={excludedCount}
          isCustomData={isCustomData}
        />

        {/* 2. Member Dropdown with participation count as requested */}
        <MemberSelector
          members={members}
          selectedMemberName={selectedMemberName}
          onSelectMember={setSelectedMemberName}
        />

        {/* 3. Main View: LibreOffice Calc Spreadsheet OR Chronological Sort View */}
        {activeTab === 'calc' ? (
          <LibreCalcTable
            members={members}
            weeks={weeks}
            selectedMemberName={selectedMemberName}
            onSelectMember={setSelectedMemberName}
            allRecords={sortedRecords}
          />
        ) : (
          /* Chronological Sort view showing 1st and 3rd field order */
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-700" />
                  Randonnées de la saison {selectedYear} regroupées et triées par date (1er champ) et par nom (3e champ)
                </h3>
                <p className="text-xs text-slate-500">
                  Période retenue : du 01/11/{selectedYear - 1} au 31/10/{selectedYear} · {sortedRecords.length} participations consolidées ({excludedCount} lignes hors saison exclues)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[580px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200 w-12 text-center">#</th>
                    <th className="py-2 px-4 border-r border-slate-200">
                      1er champ : Date
                    </th>
                    <th className="py-2 px-4 border-r border-slate-200">
                      3e champ : Nom et prénom
                    </th>
                    <th className="py-2 px-4 border-r border-slate-200">
                      2e champ : Randonnée
                    </th>
                    <th className="py-2 px-3 border-r border-slate-200 text-center">
                      Km (valeur numérique champ 3)
                    </th>
                    <th className="py-2 px-4 border-r border-slate-200 text-center">
                      Semaine (Lundi-Dimanche)
                    </th>
                    <th className="py-2 px-4 text-center">Fichier source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {sortedRecords.map((r, i) => (
                    <tr
                      key={r.id || i}
                      className={`hover:bg-emerald-50/50 transition-colors ${
                        selectedMemberName === r.fullMemberName ? 'bg-emerald-100/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono border-r border-slate-100">
                        {i + 1}
                      </td>
                      <td className="py-2 px-4 font-mono font-medium text-slate-800 border-r border-slate-100">
                        {r.dateStr}
                      </td>
                      <td className="py-2 px-4 text-slate-900 border-r border-slate-100 font-medium">
                        {r.fullMemberName}
                      </td>
                      <td className="py-2 px-4 text-slate-700 border-r border-slate-100">
                        {r.randoName}
                      </td>
                      <td className="py-2 px-3 text-center text-emerald-800 font-mono border-r border-slate-100 font-semibold">
                        {r.km > 0 ? `${r.km} km` : '-'}
                      </td>
                      <td className="py-2 px-4 text-center text-slate-600 border-r border-slate-100 font-mono text-[11px]">
                        Semaine {r.weekNumber} ({r.weekKey})
                      </td>
                      <td className="py-2 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {r.sourceFile}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Statistiques globales sous le tableau comme demandé */}
        <SeasonStats
          members={members}
          weeks={weeks}
          allRecords={sortedRecords}
          selectedYear={selectedYear}
        />
      </main>

      {/* Version Number centered at bottom as strictly requested */}
      <footer className="text-center py-6 text-slate-500 font-mono text-sm tracking-wide border-t border-slate-200/80 bg-white/50">
        v1.2 - FabriziodelaRusta
      </footer>
    </div>
  );
}
