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
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non pris en charge. Veuillez télécharger un fichier Excel (.xls ou .xlsx).'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // Limite à 10MB
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
    
    // Analyser le fichier Excel pour obtenir les informations de base
    const fileInfo = excelService.parseExcelFile(req.file.path);
    
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
 * @route   GET /api/files/:id
 * @desc    Obtenir les détails d'un fichier spécifique
 * @access  Public
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

/**
 * @route   PUT /api/files/:id/column
 * @desc    Sélectionner une colonne à analyser
 * @access  Public
 */
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
    
    // Commencer à traiter le fichier en arrière-plan
    // Dans une implémentation réelle, vous utiliseriez une file d'attente comme Bull ou une fonction asynchrone
    // Pour cet exemple, on simule juste la réponse
    setTimeout(async () => {
      try {
        // Extraire les valeurs de la colonne sélectionnée
        const columnData = excelService.extractColumnData(file.path, selectedColumn);
        
        // Créer des entrées de résultat pour chaque valeur de la colonne
        await Promise.all(columnData.map(item => {
          return new MatchResult({
            file: file._id,
            originalValue: item.value,
            rowIndex: item.rowIndex,
            status: 'pending'
          }).save();
        }));
        
        // Marquer le fichier comme traité
        file.status = 'completed';
        file.processingCompletedAt = new Date();
        await file.save();
      } catch (error) {
        console.error('Erreur lors du traitement du fichier:', error);
        
        // Marquer le fichier en erreur
        file.status = 'error';
        file.errorMessage = error.message;
        await file.save();
      }
    }, 500);
    
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

/**
 * @route   DELETE /api/files/:id
 * @desc    Supprimer un fichier
 * @access  Public
 */
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

/**
 * @route   GET /api/files/:id/export
 * @desc    Exporter les résultats d'un fichier
 * @access  Public
 */
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
    
    // Exporter les résultats
    const exportInfo = excelService.exportResults(results, options);
    
    // Envoyer le fichier en réponse
    res.download(exportInfo.path, exportInfo.fileName, (err) => {
      if (err) {
        next(err);
      } else {
        // Nettoyer le fichier après l'envoi (optionnel)
        // Vous pourriez vouloir conserver les exports pour un certain temps
        // setTimeout(() => {
        //   if (fs.existsSync(exportInfo.path)) {
        //     fs.unlinkSync(exportInfo.path);
        //   }
        // }, 60000); // Supprime après 1 minute
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;