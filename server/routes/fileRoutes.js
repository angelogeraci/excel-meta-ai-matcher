const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');
const MatchResult = require('../models/MatchResult');
const excelService = require('../services/excelService');

const router = express.Router();

// Configuration de Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtre pour n'accepter que les fichiers Excel
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
    // Ajout de types MIME supplémentaires pour une meilleure compatibilité
    'application/octet-stream', // Certains navigateurs utilisent ce type
    'application/excel',
    'application/x-excel',
    'application/x-msexcel'
  ];
  
  // Vérifier également l'extension du fichier comme fallback
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const validExtensions = ['.xls', '.xlsx', '.xlsm', '.xlsb'];
  
  if (allowedTypes.includes(file.mimetype) || validExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Format de fichier non pris en charge: ${file.mimetype}. Veuillez télécharger un fichier Excel (.xls ou .xlsx).`), false);
  }
};

// Augmentation de la limite à 50 MB pour les fichiers volumineux
const upload = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50 MB
    fieldSize: 25 * 1024 * 1024  // 25 MB pour les champs de formulaire
  }
});

/**
 * @route   POST /api/files/upload
 * @desc    Télécharger un fichier Excel
 * @access  Public
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier n\'a été téléchargé.'
      });
    }
    
    // Vérifier que le fichier est accessible
    if (!fs.existsSync(req.file.path)) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du fichier sur le serveur.'
      });
    }
    
    // Analyser seulement les informations de base du fichier (sans charger toutes les données)
    // afin d'optimiser pour les fichiers volumineux
    const fileInfo = await excelService.parseExcelFileHeaders(req.file.path);
    
    // Enregistrer les informations du fichier dans la base de données
    const file = new File({
      name: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      columns: fileInfo.columns,
      rowCount: fileInfo.rowCount,
      status: 'uploaded'
    });
    
    await file.save();
    
    // Lancer l'analyse complète des données en arrière-plan
    // pour ne pas bloquer la réponse au client
    excelService.prepareFileForProcessing(file._id)
      .catch(error => console.error('Erreur lors de la préparation du fichier:', error));
    
    res.status(201).json({
      success: true,
      message: 'Fichier téléchargé avec succès.',
      data: {
        id: file._id,
        name: file.originalName,
        columns: file.columns,
        rowCount: file.rowCount,
        uploadedAt: file.createdAt,
        status: file.status
      }
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    
    // Nettoyer le fichier en cas d'erreur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Personnaliser le message d'erreur pour certains types d'erreurs
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'Le fichier est trop volumineux. La taille maximale autorisée est de 50 MB.'
      });
    }
    
    next(error);
  }
});

/**
 * @route   GET /api/files
 * @desc    Obtenir la liste des fichiers téléchargés
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtres
    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }
    
    // Récupérer les fichiers avec pagination
    const files = await File.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Compter le nombre total de fichiers
    const total = await File.countDocuments(filters);
    
    // Transformer les données pour le client
    const transformedFiles = files.map(file => ({
      id: file._id,
      name: file.originalName,
      columns: file.columns,
      rowCount: file.rowCount,
      uploadedAt: file.createdAt,
      status: file.status,
      selectedColumn: file.selectedColumn
    }));
    
    res.status(200).json({
      success: true,
      data: transformedFiles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Autres routes pour la gestion des fichiers
 */
router.get('/:id', async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé.'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: file._id,
        name: file.originalName,
        columns: file.columns,
        rowCount: file.rowCount,
        uploadedAt: file.createdAt,
        status: file.status,
        selectedColumn: file.selectedColumn,
        processingStartedAt: file.processingStartedAt,
        processingCompletedAt: file.processingCompletedAt,
        errorMessage: file.errorMessage
      }
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/column', async (req, res, next) => {
  try {
    const { selectedColumn } = req.body;
    
    if (!selectedColumn) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de la colonne est requis.'
      });
    }
    
    // Récupérer le fichier
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé.'
      });
    }
    
    // Vérifier si la colonne existe dans le fichier
    if (!file.columns.includes(selectedColumn)) {
      return res.status(400).json({
        success: false,
        message: `La colonne "${selectedColumn}" n'existe pas dans ce fichier.`
      });
    }
    
    // Mettre à jour le fichier
    file.selectedColumn = selectedColumn;
    file.status = 'processing';
    file.processingStartedAt = new Date();
    await file.save();
    
    // Démarrer le traitement des données de la colonne en arrière-plan
    excelService.processColumnData(file._id, selectedColumn)
      .catch(error => {
        console.error('Erreur lors du traitement de la colonne:', error);
        file.status = 'error';
        file.errorMessage = error.message;
        file.save();
      });
    
    res.status(200).json({
      success: true,
      message: 'Colonne sélectionnée avec succès, traitement en cours.',
      data: {
        id: file._id,
        selectedColumn,
        status: file.status
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé.'
      });
    }
    
    // Supprimer le fichier physique
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    // Supprimer les résultats associés
    await MatchResult.deleteMany({ file: file._id });
    
    // Supprimer l'entrée de la base de données
    await file.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Fichier supprimé avec succès.'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/export', async (req, res, next) => {
  try {
    // Options d'exportation
    const options = {
      format: req.query.format || 'xlsx',
      includeScores: req.query.includeScores !== 'false',
      includeAllSuggestions: req.query.includeAllSuggestions === 'true'
    };
    
    // Récupérer le fichier
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé.'
      });
    }
    
    // Récupérer tous les résultats associés au fichier
    const results = await MatchResult.find({ file: file._id }).sort({ rowIndex: 1 });
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun résultat disponible pour ce fichier.'
      });
    }
    
    // Utiliser une méthode d'export optimisée pour les grands volumes de données
    try {
      const exportInfo = await excelService.exportLargeResults(results, options);
      
      // Envoyer le fichier en réponse
      res.download(exportInfo.path, exportInfo.fileName, (err) => {
        if (err) {
          next(err);
        } else {
          // Nettoyer le fichier automatiquement après 1 heure
          setTimeout(() => {
            if (fs.existsSync(exportInfo.path)) {
              fs.unlinkSync(exportInfo.path);
            }
          }, 3600000);
        }
      });
    } catch (exportError) {
      console.error('Erreur lors de l\'export:', exportError);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export des résultats: ' + exportError.message
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/:id/status', async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé.'
      });
    }
    
    // Si le fichier est en cours de traitement, obtenir des statistiques
    let processedCount = 0;
    if (file.status === 'processing' && file.selectedColumn) {
      processedCount = await MatchResult.countDocuments({ 
        file: file._id, 
        status: { $ne: 'pending' } 
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: file._id,
        status: file.status,
        progress: file.rowCount > 0 ? Math.floor((processedCount / file.rowCount) * 100) : 0,
        processedCount,
        totalCount: file.rowCount,
        startedAt: file.processingStartedAt,
        completedAt: file.processingCompletedAt,
        errorMessage: file.errorMessage
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;