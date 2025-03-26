const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const MatchResult = require('../models/MatchResult');
const { Worker } = require('worker_threads');

/**
 * Service qui gère les opérations sur les fichiers Excel
 * Optimisé pour les fichiers volumineux
 */
class ExcelService {
  
  /**
   * Analyser uniquement les en-têtes et les informations de base d'un fichier Excel
   * sans charger toutes les données en mémoire
   * 
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {Object} - Informations du fichier (colonnes, nombre de lignes)
   */
  async parseExcelFileHeaders(filePath) {
    try {
      // Vérifier si le fichier existe
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier non trouvé: ${filePath}`);
      }
      
      // Options pour optimiser la lecture des fichiers volumineux
      const opts = {
        sheetRows: 1, // Lire uniquement la première ligne (en-têtes)
        raw: false,
        cellFormula: false,
        cellHTML: false,
        cellNF: false,
        cellStyles: false
      };
      
      // Lire le fichier Excel avec les options optimisées
      const workbook = XLSX.readFile(filePath, opts);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Extraire les en-têtes (première ligne)
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
      
      // Maintenant, compter le nombre de lignes
      // Pour les fichiers volumineux, on utilise une approche de streaming
      const rowCount = await this.countRowsInExcelFile(filePath);
      
      return {
        columns: headers,
        rowCount,
        sheetNames: workbook.SheetNames,
        currentSheet: firstSheetName
      };
    } catch (error) {
      console.error('Erreur lors de l\'analyse des en-têtes Excel:', error);
      throw error;
    }
  }
  
  /**
   * Compter le nombre de lignes dans un fichier Excel de manière optimisée
   * en évitant de charger tout le fichier en mémoire
   * 
   * @param {string} filePath - Chemin du fichier Excel
   * @returns {number} - Nombre de lignes
   */
  async countRowsInExcelFile(filePath) {
    try {
      // Pour les fichiers volumineux, nous lisons par blocs
      // On commence par lire seulement les informations de l'en-tête du fichier
      const workbook = XLSX.readFile(filePath, {
        sheetRows: 0, // Juste l'en-tête
        bookSheets: true // Ne chargez que les informations de la feuille
      });
      
      const firstSheet = workbook.SheetNames[0];
      
      // Maintenant, nous utilisons une approche par lots pour compter
      let rowCount = 0;
      const BATCH_SIZE = 1000; // Nombre de lignes à lire par lot
      let batchIndex = 1;
      let continueCounting = true;
      
      while (continueCounting) {
        // Lire un bloc de lignes
        const opts = {
          sheetRows: BATCH_SIZE,
          range: batchIndex * BATCH_SIZE // Commencez à partir de cette ligne
        };
        
        // Essayer de lire le bloc
        try {
          const tempWorkbook = XLSX.readFile(filePath, opts);
          const tempWorksheet = tempWorkbook.Sheets[firstSheet];
          const data = XLSX.utils.sheet_to_json(tempWorksheet, { header: 1 });
          
          // Si le bloc est vide ou contient moins de lignes que le lot complet, nous avons terminé
          if (data.length === 0) {
            continueCounting = false;
          } else {
            rowCount += data.length;
            batchIndex++;
          }
        } catch (error) {
          // Si une erreur se produit, c'est probablement parce que nous avons dépassé la fin du fichier
          continueCounting = false;
        }
      }
      
      // Soustraire 1 pour l'en-tête si des lignes ont été trouvées
      return rowCount > 0 ? rowCount - 1 : 0;
    } catch (error) {
      console.error('Erreur lors du comptage des lignes Excel:', error);
      throw error;
    }
  }
  
  /**
   * Prépare un fichier Excel pour le traitement en arrière-plan
   * Cette fonction est appelée après l'upload initial pour
   * effectuer des validations et prétraitements supplémentaires
   * 
   * @param {string} fileId - ID du fichier dans la base de données
   * @returns {Promise<void>}
   */
  async prepareFileForProcessing(fileId) {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        throw new Error(`Fichier avec ID ${fileId} non trouvé.`);
      }
      
      if (!fs.existsSync(file.path)) {
        throw new Error(`Fichier physique non trouvé: ${file.path}`);
      }
      
      // Vérifier que le fichier peut être ouvert correctement
      try {
        const testWorkbook = XLSX.readFile(file.path, {
          sheetRows: 2, // Lire seulement 2 lignes pour le test
          raw: false
        });
        
        // Vérifier qu'au moins une feuille existe
        if (testWorkbook.SheetNames.length === 0) {
          throw new Error('Le fichier Excel ne contient aucune feuille de calcul.');
        }
      } catch (error) {
        console.error('Erreur lors du test d\'ouverture du fichier Excel:', error);
        file.status = 'error';
        file.errorMessage = `Erreur lors de l'ouverture du fichier Excel: ${error.message}`;
        await file.save();
        throw error;
      }
      
      // Tout est correct, marquer le fichier comme prêt
      file.status = 'uploaded';
      await file.save();
      
      return file;
    } catch (error) {
      console.error('Erreur lors de la préparation du fichier pour le traitement:', error);
      throw error;
    }
  }

  /**
   * Lit les données d'une colonne spécifique d'un fichier Excel optimisé pour les fichiers volumineux
   * en utilisant une approche par lots
   * 
   * @param {string} fileId - ID du fichier dans la base de données
   * @param {string} columnName - Nom de la colonne à extraire
   * @returns {Promise<void>}
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
      
      // Traiter les données par lots pour éviter la surcharge de mémoire
      const BATCH_SIZE = 1000; // Nombre de lignes à traiter par lot
      let processedRows = 0;
      let totalBatches = Math.ceil(file.rowCount / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startRow = batchIndex * BATCH_SIZE;
        const endRow = Math.min((batchIndex + 1) * BATCH_SIZE, file.rowCount);
        
        // Lire un lot de données
        const batchData = await this.readExcelBatch(file.path, startRow, endRow);
        
        // Filtrer les données pour obtenir uniquement les valeurs de la colonne sélectionnée
        const columnValues = batchData
          .map((row, index) => ({
            value: row[columnName],
            rowIndex: startRow + index + 1 // +1 car les en-têtes sont déjà exclus
          }))
          .filter(item => item.value !== undefined && item.value !== null && item.value !== '');
        
        // Enregistrer les résultats dans la base de données par petits lots
        // pour éviter les problèmes de mémoire
        const savedBatch = await Promise.all(
          columnValues.map(item => {
            return new MatchResult({
              file: file._id,
              originalValue: item.value,
              rowIndex: item.rowIndex,
              status: 'pending'
            }).save();
          })
        );
        
        // Mettre à jour le compteur de lignes traitées
        processedRows += savedBatch.length;
        
        // Mettre à jour le statut du fichier avec la progression
        file.status = 'processing';
        await file.save();
      }
      
      // Une fois terminé, marquer le fichier comme traité
      file.status = 'completed';
      file.processingCompletedAt = new Date();
      await file.save();
      
      return true;
    } catch (error) {
      console.error('Erreur lors du traitement des données de colonne:', error);
      
      // En cas d'erreur, mettre à jour le statut du fichier
      try {
        const file = await File.findById(fileId);
        if (file) {
          file.status = 'error';
          file.errorMessage = error.message;
          await file.save();
        }
      } catch (updateError) {
        console.error('Erreur lors de la mise à jour du statut du fichier:', updateError);
      }
      
      throw error;
    }
  }
  
  /**
   * Lit un lot de données d'un fichier Excel
   * 
   * @param {string} filePath - Chemin du fichier Excel
   * @param {number} startRow - Indice de la première ligne à lire
   * @param {number} endRow - Indice de la dernière ligne à lire
   * @returns {Promise<Array>} - Données du lot
   */
  async readExcelBatch(filePath, startRow, endRow) {
    try {
      const opts = {
        range: startRow + 1, // +1 car la première ligne est l'en-tête (0)
        sheetRows: endRow - startRow
      };
      
      const workbook = XLSX.readFile(filePath, opts);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      console.error(`Erreur lors de la lecture du lot de lignes ${startRow}-${endRow}:`, error);
      throw error;
    }
  }
