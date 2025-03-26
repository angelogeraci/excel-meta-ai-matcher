const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement
dotenv.config();

// Créer le répertoire de téléchargement temporaire s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/meta', require('./routes/metaRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Route par défaut pour la vérification de l'API
app.get('/api', (req, res) => {
  res.json({ message: 'API Excel Meta AI Matcher opérationnelle' });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Connexion à MongoDB et démarrage du serveur
const startServer = async () => {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('Connexion à MongoDB établie');
    } else {
      console.warn('MONGO_URI non définie, fonctionnement sans base de données');
    }

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV || 'development'}`);
      console.log(`API accessible à http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();