# Calcul des points - Roue Princière d'Allain (RPA)

Application web de suivi et de calcul des points des randonnées pour les membres du club cyclotouriste **La Roue Princière d'Allain** (Allain, Meurthe-et-Moselle).

![Logo RPA](https://fabriziodelarusta.github.io/icons/logo-RPA_bleu.png)

## Fonctionnalités principales

- **Règlement de la saison** : Prise en compte du calendrier officiel du club du **1er novembre (Année N-1) au 31 octobre (Année N)**.
- **Support des fichiers CSV du club** :
  - Séparateur point-virgule (`;`), encodage des champs avec guillemets.
  - Détection automatique des champs : Date, Nom de la randonnée, Nom & prénom du membre, Distance (km), Homologation.
  - Extraction automatique des noms de membres complets (y compris noms composés).
- **Tableau type LibreOffice Calc** :
  - Colonnes par semaine (`S44`, `S45`...) avec dates de début et fin de semaine.
  - Codes d'homologation : `H` (Homologuée = 1 pt), `NH` (Non homologuée = 1 pt), `0` (autre club).
  - Lignes de totaux dynamiques par semaine et par participant.
  - Export direct au format `.ods` (LibreOffice Calc) et `.xlsx` (Excel).
- **Statistiques complètes de la saison sous le tableau** :
  - Nombre total de membres actifs.
  - Total des points attribués.
  - Nombre total de participations aux randonnées.
  - Kilométrage cumulé total.
  - **Nombre max de membres sur une même rando** (affluence record avec date et nom de la rando).
  - **Nombre de semaines avec randos**.
  - **Nombre de semaines sans rando**.
- **Mode chronologique** : Consultation détaillée de toutes les randonnées de la saison par ordre chronologique avec filtre par membre.
- **Accès local & import manuel** : Support du dossier local `/home/sabine/Documents/RPA` ou chargement glisser-déposer de fichiers CSV.

## Démarrage rapide

### Prérequis
- Node.js 18+ ou 20+
- npm ou bun

### Installation
```bash
npm install
```

### Lancement en développement
```bash
npm run dev
```
L'application démarre sur `http://localhost:3000`.

### Construction pour production
```bash
npm run build
npm start
```

## Structure du projet

- `src/App.tsx` : Interface principale, sélecteur de saison, gestion des sources de données.
- `src/components/LibreCalcTable.tsx` : Vue tableur LibreOffice Calc avec totaux et exports.
- `src/components/SeasonStats.tsx` : Cartes de statistiques globales sous le tableau.
- `src/components/MemberSelector.tsx` : Sélection et recherche rapide d'un membre.
- `src/components/DataSourceManager.tsx` : Gestionnaire de fichiers CSV et connexion locale.
- `src/utils/csvParser.ts` : Moteur de parsing CSV robuste (points-virgules, guillemets, encodages).
- `src/utils/dateAndWeek.ts` : Gestion des semaines ISO et de la période de saison (01/11 -> 31/10).
- `server.ts` : Serveur Express avec support des fichiers locaux RPA.

## Licence
Tous droits réservés - Roue Princière d'Allain.
