const express = require('express');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Public
 */
router.post(
  '/register',
  [
    check('name', 'Le nom est requis').not().isEmpty(),
    check('email', 'Veuillez inclure un email valide').isEmail(),
    check('password', 'Veuillez entrer un mot de passe avec 6 caractères ou plus').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { name, email, password, organization, jobTitle } = req.body;

      // Vérifier si l'utilisateur existe déjà
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          success: false,
          message: 'Un utilisateur avec cet email existe déjà'
        });
      }

      // Créer un nouvel utilisateur
      user = new User({
        name,
        email,
        password,
        organization: organization || '',
        jobTitle: jobTitle || ''
      });

      await user.save();

      // Générer un token JWT
      const token = user.generateAuthToken();

      // Mettre à jour la date de dernière connexion
      await user.updateLastLogin();

      res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          jobTitle: user.jobTitle
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Authentification d'un utilisateur
 * @access  Public
 */
router.post(
  '/login',
  [
    check('email', 'Veuillez inclure un email valide').isEmail(),
    check('password', 'Le mot de passe est requis').exists()
  ],
  async (req, res, next) => {
    try {
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Vérifier si l'utilisateur existe
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Identifiants invalides'
        });
      }

      // Vérifier si le mot de passe correspond
      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Identifiants invalides'
        });
      }

      // Générer un token JWT
      const token = user.generateAuthToken();

      // Mettre à jour la date de dernière connexion
      await user.updateLastLogin();

      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          jobTitle: user.jobTitle
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir les informations de l'utilisateur connecté
 * @access  Private
 */
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        jobTitle: user.jobTitle,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/auth/me
 * @desc    Modifier les informations de l'utilisateur connecté
 * @access  Private
 */
router.put(
  '/me',
  [
    protect,
    check('name', 'Le nom est requis').optional().not().isEmpty(),
    check('email', 'Veuillez inclure un email valide').optional().isEmail()
  ],
  async (req, res, next) => {
    try {
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { name, email, organization, jobTitle } = req.body;

      // Créer l'objet de mise à jour
      const updateData = {};
      if (name) updateData.name = name;
      if (organization) updateData.organization = organization;
      if (jobTitle) updateData.jobTitle = jobTitle;

      // Si l'email est modifié, vérifier qu'il n'est pas déjà utilisé
      if (email && email !== req.user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Cet email est déjà utilisé'
          });
        }
        updateData.email = email;
      }

      // Mettre à jour l'utilisateur
      const user = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: 'Profil mis à jour avec succès',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization: user.organization,
          jobTitle: user.jobTitle
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/auth/password
 * @desc    Modifier le mot de passe de l'utilisateur
 * @access  Private
 */
router.put(
  '/password',
  [
    protect,
    check('currentPassword', 'Le mot de passe actuel est requis').exists(),
    check('newPassword', 'Le nouveau mot de passe doit contenir au moins 6 caractères').isLength({ min: 6 })
  ],
  async (req, res, next) => {
    try {
      // Validation des données
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Récupérer l'utilisateur avec son mot de passe
      const user = await User.findById(req.user.id).select('+password');

      // Vérifier si le mot de passe actuel correspond
      const isMatch = await user.matchPassword(currentPassword);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Mot de passe actuel incorrect'
        });
      }

      // Mettre à jour le mot de passe
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Mot de passe mis à jour avec succès'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion de l'utilisateur (côté client)
 * @access  Private
 */
router.post('/logout', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

module.exports = router;