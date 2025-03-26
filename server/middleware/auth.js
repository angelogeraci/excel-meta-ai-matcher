const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware de protection des routes
 * Vérifie que l'utilisateur est authentifié
 */
exports.protect = async (req, res, next) => {
  let token;

  // Vérifier si le token est présent dans les en-têtes d'autorisation
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extraire le token du format "Bearer TOKEN"
    token = req.headers.authorization.split(' ')[1];
  }
  // Vérifier si le token est présent dans les cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Vérifier si le token existe
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé, veuillez vous connecter'
    });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');

    // Ajouter l'utilisateur à la requête
    req.user = await User.findById(decoded.id);

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Accès non autorisé, token invalide'
    });
  }
};

/**
 * Middleware pour limiter l'accès en fonction du rôle
 * @param  {...string} roles - Liste des rôles autorisés
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Le rôle ${req.user.role} n'est pas autorisé à accéder à cette ressource`
      });
    }

    next();
  };
};