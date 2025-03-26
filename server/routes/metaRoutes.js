const express = require('express');
const { check, validationResult } = require('express-validator');
const metaService = require('../services/metaService');

const router = express.Router();

/**
 * @route   GET /api/meta/suggestions
 * @desc    Rechercher des suggestions Meta Marketing en fonction d'un mot-clé
 * @access  Public
 */
router.get('/suggestions', [
  check('keyword').notEmpty().withMessage('Un mot-clé est requis.'),
  check('limit').optional().isInt({ min: 1, max: 50 }).withMessage('La limite doit être un nombre entre 1 et 50.')
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
    
    const { keyword } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    
    // Rechercher les suggestions
    const suggestions = await metaService.searchTargetingSuggestions(keyword, limit);
    
    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/meta/batch-suggestions
 * @desc    Rechercher des suggestions pour plusieurs mots-clés à la fois
 * @access  Public
 */
router.post('/batch-suggestions', [
  check('keywords').isArray().withMessage('La liste des mots-clés est requise.'),
  check('keywords.*').notEmpty().withMessage('Chaque mot-clé doit être non vide.'),
  check('limit').optional().isInt({ min: 1, max: 20 }).withMessage('La limite doit être un nombre entre 1 et 20.')
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
    
    const { keywords } = req.body;
    const limit = parseInt(req.body.limit) || 5;
    
    // Limiter le nombre de mots-clés pour éviter les abus
    if (keywords.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre maximum de mots-clés est de 100.'
      });
    }
    
    // Traiter chaque mot-clé séquentiellement pour éviter de surcharger l'API Meta
    const results = {};
    
    for (const keyword of keywords) {
      try {
        const suggestions = await metaService.searchTargetingSuggestions(keyword, limit);
        results[keyword] = suggestions;
      } catch (error) {
        console.error(`Erreur lors de la recherche pour "${keyword}":`, error.message);
        results[keyword] = { error: error.message };
      }
      
      // Ajouter un petit délai entre les requêtes pour respecter les limites d'API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/meta/audience-size
 * @desc    Obtenir la taille d'audience estimée pour une configuration de ciblage
 * @access  Public
 */
router.post('/audience-size', [
  check('targeting').isObject().withMessage('Une configuration de ciblage est requise.')
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
    
    const { targeting } = req.body;
    
    // Dans une implémentation réelle, vous appelleriez l'API Meta pour obtenir la taille d'audience
    // Mais pour cet exemple, nous simulons simplement une réponse
    
    let audienceSize = 0;
    
    if (targeting.interests && targeting.interests.length > 0) {
      // Simuler un calcul de taille d'audience basé sur les intérêts
      audienceSize = targeting.interests.length * 10000000 + Math.random() * 5000000;
    }
    
    if (targeting.age_min && targeting.age_max) {
      // Ajuster en fonction de la tranche d'âge
      const ageRange = targeting.age_max - targeting.age_min;
      audienceSize = audienceSize * (ageRange / 65);
    }
    
    if (targeting.genders && targeting.genders.length > 0) {
      // Ajuster en fonction du genre
      audienceSize = audienceSize * (targeting.genders.length / 2);
    }
    
    // Assurer des limites raisonnables
    audienceSize = Math.max(50000, Math.min(2000000000, audienceSize));
    
    res.status(200).json({
      success: true,
      data: {
        audience_size_lower_bound: Math.floor(audienceSize * 0.8),
        audience_size_upper_bound: Math.floor(audienceSize * 1.2),
        estimated_size: Math.floor(audienceSize)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/meta/health
 * @desc    Vérifier l'état de connexion à l'API Meta
 * @access  Public
 */
router.get('/health', async (req, res, next) => {
  try {
    // Simuler une vérification d'état
    const isConfigured = !!process.env.META_ACCESS_TOKEN;
    
    res.status(200).json({
      success: true,
      data: {
        status: isConfigured ? 'connected' : 'not_configured',
        api_version: process.env.META_API_VERSION || 'unknown',
        message: isConfigured ? 'Connecté à l\'API Meta Marketing' : 'Clé d\'API Meta non configurée'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;