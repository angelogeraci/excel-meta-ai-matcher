const express = require('express');
const { check, validationResult } = require('express-validator');
const aiService = require('../services/aiService');
const MatchResult = require('../models/MatchResult');

const router = express.Router();

/**
 * @route   POST /api/ai/evaluate
 * @desc    Évaluer les correspondances entre un mot-clé et des suggestions
 * @access  Public
 */
router.post('/evaluate', [
  check('keyword').notEmpty().withMessage('Le mot-clé est requis.'),
  check('suggestions').isArray({ min: 1 }).withMessage('Au moins une suggestion est requise.')
], async (req, res, next) => {
  try {
    // Valider les entrées
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { keyword, suggestions } = req.body;
    
    // Évaluer les correspondances
    const evaluation = await aiService.evaluateMatches(keyword, suggestions);
    
    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ai/process-result/:id
 * @desc    Traiter un résultat de correspondance spécifique
 * @access  Public
 */
router.post('/process-result/:id', async (req, res, next) => {
  try {
    const resultId = req.params.id;
    
    // Récupérer le résultat
    const result = await MatchResult.findById(resultId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Résultat non trouvé.'
      });
    }
    
    // Vérifier si le résultat est déjà traité
    if (result.status === 'processed') {
      return res.status(400).json({
        success: false,
        message: 'Ce résultat a déjà été traité.'
      });
    }
    
    // Vérifier si des suggestions ont été fournies
    if (!result.metaSuggestions || result.metaSuggestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune suggestion à évaluer.'
      });
    }
    
    // Évaluer les correspondances
    const evaluation = await aiService.evaluateMatches(
      result.originalValue,
      result.metaSuggestions
    );
    
    // Mettre à jour le résultat avec les scores et la meilleure correspondance
    result.metaSuggestions = evaluation.suggestions;
    await result.markProcessed(
      evaluation.suggestions,
      evaluation.bestMatchIndex,
      evaluation.bestMatchScore
    );
    
    res.status(200).json({
      success: true,
      message: 'Résultat traité avec succès.',
      data: {
        id: result._id,
        originalValue: result.originalValue,
        selectedSuggestion: result.selectedSuggestion,
        matchScore: result.matchScore,
        status: result.status
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/ai/result/:id/suggestion
 * @desc    Changer la suggestion sélectionnée pour un résultat
 * @access  Public
 */
router.put('/result/:id/suggestion', [
  check('suggestionIndex').isInt({ min: 0 }).withMessage('L\'index de suggestion doit être un nombre positif.')
], async (req, res, next) => {
  try {
    // Valider les entrées
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const resultId = req.params.id;
    const { suggestionIndex } = req.body;
    
    // Récupérer le résultat
    const result = await MatchResult.findById(resultId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Résultat non trouvé.'
      });
    }
    
    // Vérifier si l'index est valide
    if (!result.metaSuggestions || suggestionIndex >= result.metaSuggestions.length) {
      return res.status(400).json({
        success: false,
        message: 'Index de suggestion invalide.'
      });
    }
    
    // Changer la suggestion sélectionnée
    await result.changeSelectedSuggestion(suggestionIndex);
    
    res.status(200).json({
      success: true,
      message: 'Suggestion modifiée avec succès.',
      data: {
        id: result._id,
        originalValue: result.originalValue,
        selectedSuggestion: result.selectedSuggestion,
        matchScore: result.matchScore
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ai/health
 * @desc    Vérifier l'état de la connexion à l'API IA
 * @access  Public
 */
router.get('/health', async (req, res, next) => {
  try {
    // Simuler une vérification d'état
    const isConfigured = !!process.env.OPENAI_API_KEY;
    
    res.status(200).json({
      success: true,
      data: {
        status: isConfigured ? 'connected' : 'not_configured',
        ai_service: 'OpenAI',
        model: 'gpt-4o',
        message: isConfigured ? 'Connecté à l\'API OpenAI' : 'Clé d\'API OpenAI non configurée'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ai/results
 * @desc    Obtenir les résultats de correspondance pour un fichier
 * @access  Public
 */
router.get('/results', async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Filtres
    const fileId = req.query.fileId;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID du fichier est requis.'
      });
    }
    
    const filters = { file: fileId };
    
    // Filtres supplémentaires
    if (req.query.status && req.query.status !== 'all') {
      filters.status = req.query.status;
    }
    
    if (req.query.minScore) {
      filters.matchScore = { $gte: parseInt(req.query.minScore) };
    }
    
    if (req.query.maxScore) {
      if (filters.matchScore) {
        filters.matchScore.$lte = parseInt(req.query.maxScore);
      } else {
        filters.matchScore = { $lte: parseInt(req.query.maxScore) };
      }
    }
    
    if (req.query.query) {
      const searchQuery = req.query.query;
      filters.$or = [
        { originalValue: { $regex: searchQuery, $options: 'i' } },
        { 'selectedSuggestion.value': { $regex: searchQuery, $options: 'i' } }
      ];
    }
    
    // Récupérer les résultats avec pagination
    const results = await MatchResult.find(filters)
      .sort({ rowIndex: 1 })
      .skip(skip)
      .limit(limit);
    
    // Compter le nombre total de résultats
    const total = await MatchResult.countDocuments(filters);
    
    // Transformer les données pour le client
    const transformedResults = results.map(result => ({
      id: result._id,
      fileId: result.file,
      originalValue: result.originalValue,
      metaSuggestions: result.metaSuggestions,
      selectedSuggestion: result.selectedSuggestion,
      matchScore: result.matchScore,
      status: result.status,
      createdAt: result.createdAt
    }));
    
    res.status(200).json({
      success: true,
      data: transformedResults,
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
 * @route   DELETE /api/ai/results/:id
 * @desc    Supprimer un résultat spécifique
 * @access  Public
 */
router.delete('/results/:id', async (req, res, next) => {
  try {
    const result = await MatchResult.findById(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Résultat non trouvé.'
      });
    }
    
    await result.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Résultat supprimé avec succès.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/ai/results
 * @desc    Supprimer plusieurs résultats
 * @access  Public
 */
router.delete('/results', [
  check('ids').isArray({ min: 1 }).withMessage('Au moins un ID est requis.')
], async (req, res, next) => {
  try {
    // Valider les entrées
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { ids } = req.body;
    
    // Supprimer les résultats
    const deleteResult = await MatchResult.deleteMany({ _id: { $in: ids } });
    
    res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} résultat(s) supprimé(s) avec succès.`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;