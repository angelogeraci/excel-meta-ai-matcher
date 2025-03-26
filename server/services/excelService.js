const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Service qui gère les opérations sur les fichiers Excel
 */
class ExcelService {
  /**
   * Lit un fichier Excel et extrait les informations de base
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {Object} - Informations du fichier (colonnes, nombre de lignes)
   */
  parseExcelFile(filePath) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
      }
      
      // Lire le fichier Excel
      const workbook = XLSX.readFile(filePath);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir la feuille en JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Extraire les en-têtes (première ligne)
      const headers = data[0] || [];
      
      // Calculer le nombre de lignes (exclure la ligne d'en-tête)
      const rowCount = data.length > 0 ? data.length - 1 : 0;
      
      return {
        columns: headers,
        rowCount,
        sheetNames: workbook.SheetNames,
        currentSheet: firstSheetName
      };
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier Excel:', error);
      throw error;
    }
  }

  /**
   * Lit les données d'une colonne spécifique d'un fichier Excel
   * @param {string} filePath - Chemin du fichier Excel
   * @param {string} columnName - Nom de la colonne à extraire
   * @param {string} sheetName - Nom de la feuille (optionnel, utilise la première par défaut)
   * @returns {Array} - Valeurs de la colonne
   */
  extractColumnData(filePath, columnName, sheetName = null) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
      }
      
      // Lire le fichier Excel
      const workbook = XLSX.readFile(filePath);
      
      // Déterminer la feuille à utiliser
      const sheet = sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheet];
      
      // Convertir la feuille en JSON avec en-têtes
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Vérifier si la colonne existe
      if (data.length > 0 && !(columnName in data[0])) {
        throw new Error(`Colonne "${columnName}" non trouvée dans le fichier`);
      }
      
      // Extraire les valeurs de la colonne spécifiée
      const columnValues = data.map((row, index) => ({
        value: row[columnName],
        rowIndex: index + 1 // +1 car les en-têtes sont déjà exclus par sheet_to_json
      })).filter(item => item.value !== undefined && item.value !== null && item.value !== '');
      
      return columnValues;
    } catch (error) {
      console.error('Erreur lors de l\'extraction des données de colonne:', error);
      throw error;
    }
  }

  /**
   * Exporte les résultats dans un nouveau fichier Excel
   * @param {Array} results - Résultats à exporter
   * @param {Object} options - Options d'exportation
   * @returns {string} - Chemin du fichier exporté
   */
  exportResults(results, options = {}) {
    try {
      // Définir les options par défaut
      const {
        format = 'xlsx',
        includeScores = true,
        includeAllSuggestions = false,
        outputDir = path.join(__dirname, '../exports')
      } = options;
      
      // Créer le répertoire d'exportation s'il n'existe pas
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Préparer les données pour l'exportation
      const exportData = results.map(result => {
        const baseRow = {
          'Mot-clé Original': result.originalValue,
          'Suggestion Meta': result.selectedSuggestion ? result.selectedSuggestion.value : '',
          'Audience (millions)': result.selectedSuggestion ? 
            (result.selectedSuggestion.audience.size / 1000000).toFixed(2) : ''
        };
        
        // Ajouter le score si demandé
        if (includeScores && result.matchScore) {
          baseRow['Score de correspondance'] = result.matchScore;
        }
        
        // Ajouter des informations supplémentaires si demandé
        if (includeAllSuggestions && result.metaSuggestions) {
          // Ajouter toutes les suggestions alternatives (jusqu'à 3 en plus de la principale)
          const alternatives = result.metaSuggestions
            .filter(s => !s.isSelected)
            .slice(0, 3);
          
          alternatives.forEach((alt, i) => {
            baseRow[`Alternative ${i+1}`] = alt.value;
            if (includeScores && alt.score) {
              baseRow[`Score Alt. ${i+1}`] = alt.score;
            }
          });
        }
        
        return baseRow;
      });
      
      // Créer une nouvelle feuille de calcul
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Résultats');
      
      // Générer un nom de fichier unique
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `resultats-meta-matcher-${timestamp}.${format}`;
      const outputPath = path.join(outputDir, fileName);
      
      // Écrire le fichier dans le format approprié
      if (format === 'xlsx') {
        XLSX.writeFile(workbook, outputPath);
      } else if (format === 'csv') {
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        fs.writeFileSync(outputPath, csvContent, 'utf8');
      } else {
        throw new Error(`Format d'exportation non pris en charge: ${format}`);
      }
      
      return {
        path: outputPath,
        fileName,
        format
      };
    } catch (error) {
      console.error('Erreur lors de l\'exportation des résultats:', error);
      throw error;
    }
  }
}

module.exports = new ExcelService();