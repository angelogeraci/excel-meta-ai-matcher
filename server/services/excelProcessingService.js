const File = require('../models/File');
const MatchResult = require('../models/MatchResult');
const excelService = require('./excelService');

/**
 * Service dédié au traitement des données Excel
 * Séparé pour gérer les opérations intensives sans bloquer le service principal
 */
class ExcelProcessingService {
  /**
   * Lit les données d'une colonne spécifique d'un fichier Excel
   * Optimisé pour les fichiers volumineux en utilisant une approche par lots
   * 
   * @param {string} fileId - ID du fichier dans la base de données
   * @param {string} columnName - Nom de la colonne à extraire
   * @returns {Promise<boolean>} - Statut de l'opération
   */
  async processColumnData(fileId, columnName) {
    try {
      // Récupérer le fichier
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error(`Fichier avec ID ${fileId} non trouvé.`);
      }
      
      if (!file.columns.includes(columnName)) {
        throw new Error(`Colonne "${columnName}" non trouvée dans le fichier.`);
      }
      
      // Mettre à jour le statut du fichier
      file.status = 'processing';
      file.processingStartedAt = new Date();
      await file.save();
      
      // Définir la taille du lot en fonction du nombre total de lignes
      // Pour les très gros fichiers, utilisez des lots plus petits
      const BATCH_SIZE = file.rowCount > 50000 ? 500 : 
                        file.rowCount > 10000 ? 1000 : 2000;
      
      let processedRows = 0;
      let totalBatches = Math.ceil(file.rowCount / BATCH_SIZE);
      
      console.log(`Traitement de ${file.rowCount} lignes en ${totalBatches} lots de ${BATCH_SIZE}`);
      
      // Supprimer les résultats existants pour ce fichier
      await MatchResult.deleteMany({ file: file._id });
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startRow = batchIndex * BATCH_SIZE;
        const endRow = Math.min((batchIndex + 1) * BATCH_SIZE, file.rowCount);
        
        console.log(`Traitement du lot ${batchIndex + 1}/${totalBatches}, lignes ${startRow} à ${endRow}`);
        
        try {
          // Lire un lot de données
          const batchData = await excelService.readExcelBatch(file.path, startRow, endRow);
          
          // Filtrer les données pour obtenir uniquement les valeurs de la colonne sélectionnée
          const columnValues = batchData
            .map((row, index) => ({
              value: row[columnName],
              rowIndex: startRow + index + 1 // +1 car les en-têtes sont déjà exclus
            }))
            .filter(item => item.value !== undefined && item.value !== null && item.value !== '');
          
          // Créer tous les objets MatchResult à insérer
          const matchResults = columnValues.map(item => ({
            file: file._id,
            originalValue: String(item.value), // Convertir en chaîne pour assurer la compatibilité
            rowIndex: item.rowIndex,
            status: 'pending'
          }));
          
          // Utiliser insertMany pour une insertion plus efficace
          if (matchResults.length > 0) {
            await MatchResult.insertMany(matchResults, { ordered: false });
          }
          
          // Mettre à jour le compteur de lignes traitées
          processedRows += columnValues.length;
          
          // Mettre à jour le statut du fichier toutes les 5 lots ou pour le dernier lot
          if (batchIndex % 5 === 0 || batchIndex === totalBatches - 1) {
            await File.updateOne(
              { _id: file._id },
              { 
                $set: { 
                  status: 'processing',
                  progress: Math.floor((processedRows / file.rowCount) * 100)
                }
              }
            );
          }
        } catch (batchError) {
          console.error(`Erreur lors du traitement du lot ${batchIndex}:`, batchError);
          // Continuer avec le lot suivant même en cas d'erreur
        }
        
        // Attendre un court moment pour libérer l'event loop
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Une fois terminé, marquer le fichier comme traité
      await File.updateOne(
        { _id: file._id },
        { 
          $set: { 
            status: 'completed',
            processingCompletedAt: new Date()
          }
        }
      );
      
      console.log(`Traitement terminé: ${processedRows} lignes traitées sur ${file.rowCount}`);
      
      return true;
    } catch (error) {
      console.error('Erreur lors du traitement des données de colonne:', error);
      
      // En cas d'erreur, mettre à jour le statut du fichier
      try {
        await File.updateOne(
          { _id: fileId },
          { 
            $set: { 
              status: 'error',
              errorMessage: error.message
            }
          }
        );
      } catch (updateError) {
        console.error('Erreur lors de la mise à jour du statut du fichier:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * Exporte les résultats dans un fichier Excel
   * Optimisé pour les grands volumes de données en utilisant une approche par lots
   * 
   * @param {Array} results - Résultats à exporter (ou ID de fichier)
   * @param {Object} options - Options d'exportation
   * @returns {Promise<Object>} - Infos sur le fichier exporté
   */
  async exportLargeResults(results, options = {}) {
    const XLSX = require('xlsx');
    const fs = require('fs');
    const path = require('path');
    
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
      
      // Générer un nom de fichier unique
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `resultats-meta-matcher-${timestamp}.${format}`;
      const outputPath = path.join(outputDir, fileName);
      
      // Définir les en-têtes du fichier d'export
      const headers = [
        'Mot-clé Original',
        'Suggestion Meta',
        'Audience (millions)'
      ];
      
      if (includeScores) {
        headers.push('Score de correspondance');
      }
      
      if (includeAllSuggestions) {
        headers.push(
          'Alternative 1',
          'Alternative 2',
          'Alternative 3'
        );
        
        if (includeScores) {
          headers.push(
            'Score Alt. 1',
            'Score Alt. 2',
            'Score Alt. 3'
          );
        }
      }
      
      // Créer une nouvelle feuille de calcul avec les en-têtes
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([headers]);
      
      // Pour les exports volumineux, traiter par lots
      const BATCH_SIZE = 5000; // Nombre d'enregistrements à traiter par lot
      const totalItems = results.length;
      const totalBatches = Math.ceil(totalItems / BATCH_SIZE);
      
      console.log(`Export de ${totalItems} résultats en ${totalBatches} lots`);
      
      // Utiliser un index de ligne pour garder la position dans la feuille
      let rowIndex = 1; // La première ligne contient les en-têtes
      
      // Traiter les résultats par lots
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min((batchIndex + 1) * BATCH_SIZE, totalItems);
        const batchResults = results.slice(startIdx, endIdx);
        
        console.log(`Traitement du lot d'export ${batchIndex + 1}/${totalBatches}`);
        
        // Préparer les données pour ce lot
        batchResults.forEach(result => {
          // Créer une ligne pour l'export
          const row = [];
          
          // Ajouter les données de base
          row.push(
            result.originalValue || '',
            result.selectedSuggestion ? result.selectedSuggestion.value : '',
            result.selectedSuggestion ? (result.selectedSuggestion.audience.size / 1000000).toFixed(2) : ''
          );
          
          // Ajouter le score si demandé
          if (includeScores) {
            row.push(result.matchScore || '');
          }
          
          // Ajouter les alternatives si demandées
          if (includeAllSuggestions && result.metaSuggestions) {
            const alternatives = result.metaSuggestions
              .filter(s => !s.isSelected)
              .slice(0, 3);
            
            // Ajouter jusqu'à 3 alternatives
            for (let i = 0; i < 3; i++) {
              row.push(alternatives[i] ? alternatives[i].value : '');
            }
            
            // Ajouter les scores des alternatives si demandés
            if (includeScores) {
              for (let i = 0; i < 3; i++) {
                row.push(alternatives[i] && alternatives[i].score ? alternatives[i].score : '');
              }
            }
          }
          
          // Ajouter la ligne à la feuille de calcul
          const rowData = {};
          headers.forEach((header, colIndex) => {
            rowData[XLSX.utils.encode_col(colIndex)] = row[colIndex] || '';
          });
          
          XLSX.utils.sheet_add_json(worksheet, [rowData], {
            skipHeader: true,
            origin: rowIndex
          });
          
          rowIndex++;
        });
        
        // Libérer l'event loop pour éviter le blocage
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Ajouter la feuille au classeur
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Résultats');
      
      // Écrire le fichier dans le format approprié
      if (format === 'xlsx') {
        XLSX.writeFile(workbook, outputPath);
      } else if (format === 'csv') {
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        fs.writeFileSync(outputPath, csvContent, 'utf8');
      } else {
        throw new Error(`Format d'exportation non pris en charge: ${format}`);
      }
      
      console.log(`Export terminé: ${outputPath}`);
      
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

module.exports = new ExcelProcessingService();