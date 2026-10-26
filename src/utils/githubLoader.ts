import { parseRpaCsv } from './csvParser';

export interface GithubFileEntry {
  name: string;
  path: string;
  download_url?: string;
  size?: number;
  type?: string;
}

export interface LoadedCsvFile {
  filename: string;
  content: string;
  count: number;
}

export interface LoadGithubResult {
  loadedFiles: LoadedCsvFile[];
  detectedYears: number[];
}

/**
 * Extrait toutes les années 4 chiffres (ex: 2018, 2019, 2026...) trouvées dans les noms de fichiers.
 */
export function extractYearsFromEntries(fileEntries: { name?: string }[]): number[] {
  const yearsSet = new Set<number>();
  for (const entry of fileEntries) {
    const name = entry.name || '';
    const matches = name.match(/\b(20\d\d)\b/g);
    if (matches) {
      for (const m of matches) {
        const y = parseInt(m, 10);
        if (y >= 2000 && y <= 2100) {
          yearsSet.add(y);
        }
      }
    }
  }
  if (yearsSet.size === 0) {
    return [2024, 2025, 2026, 2027];
  }
  return Array.from(yearsSet).sort((a, b) => a - b);
}

/**
 * Charge automatiquement depuis GitHub les fichiers de participations correspondants à la saison :
 * https://github.com/FabriziodelaRusta/Input_files/tree/main/participations
 *
 * Règle utilisateur :
 * - Sélectionner les fichiers dont le nom contient l'année définie dans la période de début (selectedYear - 1)
 * - ET ceux dont le nom contient l'année de la période de fin (selectedYear) si la période fin est différente de la période début.
 */
export async function loadGithubSeasonFiles(
  selectedYear: number,
  onProgress?: (msg: string) => void
): Promise<LoadGithubResult> {
  const startYear = selectedYear - 1;
  const endYear = selectedYear;
  const startYearStr = String(startYear);
  const endYearStr = String(endYear);

  if (onProgress) {
    onProgress('Connexion au dépôt GitHub pour récupérer les fichiers...');
  }

  let fileEntries: GithubFileEntry[] = [];

  // 1. Récupération de la liste des fichiers dans le dossier participations
  try {
    const res = await fetch(
      'https://api.github.com/repos/FabriziodelaRusta/Input_files/contents/participations',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) {
        fileEntries = json;
      }
    }
  } catch (err) {
    console.warn('Erreur appel direct GitHub API, tentative via le proxy serveur local...', err);
  }

  // Fallback via le serveur proxy local si nécessaire
  if (fileEntries.length === 0) {
    try {
      const proxyRes = await fetch('/api/github/participations');
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (Array.isArray(json)) {
          fileEntries = json;
        }
      }
    } catch (err) {
      console.warn('Erreur proxy GitHub local:', err);
    }
  }

  // Années détectées dynamiquement dans tous les fichiers présents sur GitHub
  const detectedYears = extractYearsFromEntries(fileEntries);

  // 2. Filtrer les fichiers selon la règle stricte :
  // - Nom contient startYear (ex. 2025 pour saison 2026)
  // - OU nom contient endYear (ex. 2026 pour saison 2026, si différent)
  const selectedEntries = fileEntries.filter((item) => {
    const name = item.name || '';
    const isCsv = name.toLowerCase().endsWith('.csv') || name.toLowerCase().endsWith('.cvs');
    if (!isCsv) return false;

    const containsStart = name.includes(startYearStr);
    const containsEnd = endYear !== startYear && name.includes(endYearStr);

    return containsStart || containsEnd;
  });

  if (selectedEntries.length === 0) {
    return { loadedFiles: [], detectedYears };
  }

  const loaded: LoadedCsvFile[] = [];

  // 3. Téléchargement et parsing de chaque fichier sélectionné
  for (const entry of selectedEntries) {
    if (onProgress) {
      onProgress(`Chargement de ${entry.name} depuis GitHub...`);
    }

    try {
      const downloadUrl =
        entry.download_url ||
        `https://raw.githubusercontent.com/FabriziodelaRusta/Input_files/main/participations/${encodeURIComponent(entry.name)}`;

      const fileRes = await fetch(downloadUrl);
      if (fileRes.ok) {
        const text = await fileRes.text();
        const records = parseRpaCsv(text, entry.name);
        loaded.push({
          filename: entry.name,
          content: text,
          count: records.length,
        });
      } else {
        console.warn(`Statut ${fileRes.status} lors du téléchargement de ${entry.name}`);
      }
    } catch (err) {
      console.warn(`Erreur lors du téléchargement de ${entry.name}:`, err);
    }
  }

  return { loadedFiles: loaded, detectedYears };
}
