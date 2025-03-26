const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du fichier est requis'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Le nom original du fichier est requis'],
    trim: true
  },
  path: {
    type: String,
    required: [true, 'Le chemin du fichier est requis'],
  },
  size: {
    type: Number,
    required: [true, 'La taille du fichier est requise']
  },
  columns: {
    type: [String],
    default: []
  },
  rowCount: {
    type: Number,
    default: 0
  },
  selectedColumn: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'error'],
    default: 'uploaded'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  errorMessage: {
    type: String,
    default: null
  },
  processingStartedAt: {
    type: Date,
    default: null
  },
  processingCompletedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  processedRecords: {
    type: Number,
    default: 0
  },
  totalRecords: {
    type: Number,
    default: 0
  },
  isLarge: {
    type: Boolean,
    default: false
  },
  processingOptions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Méthode pour marquer le fichier en cours de traitement
FileSchema.methods.startProcessing = function() {
  this.status = 'processing';
  this.processingStartedAt = new Date();
  this.progress = 0;
  return this.save();
};

// Méthode pour mettre à jour la progression du traitement
FileSchema.methods.updateProgress = function(progress, processedRecords) {
  this.progress = Math.min(Math.max(0, progress), 100); // Assurer que progress est entre 0 et 100
  if (processedRecords !== undefined) {
    this.processedRecords = processedRecords;
  }
  this.updatedAt = new Date();
  return this.save();
};

// Méthode pour marquer le fichier comme traité
FileSchema.methods.completeProcessing = function() {
  this.status = 'completed';
  this.processingCompletedAt = new Date();
  this.progress = 100;
  this.processedRecords = this.totalRecords || this.rowCount;
  return this.save();
};

// Méthode pour marquer le fichier en erreur
FileSchema.methods.markError = function(message) {
  this.status = 'error';
  this.errorMessage = message;
  this.updatedAt = new Date();
  return this.save();
};

// Méthode pour mettre à jour la date de dernier accès
FileSchema.methods.updateAccessTime = function() {
  this.lastAccessedAt = new Date();
  return this.save();
};

// Méthode pour déterminer si un fichier est considéré comme volumineux
FileSchema.methods.determineSize = function() {
  // Un fichier est considéré volumineux s'il contient plus de 10 000 lignes
  // ou s'il fait plus de 5 MB
  const ROW_THRESHOLD = 10000;
  const SIZE_THRESHOLD = 5 * 1024 * 1024; // 5 MB
  
  this.isLarge = this.rowCount > ROW_THRESHOLD || this.size > SIZE_THRESHOLD;
  return this.save();
};

// Méthode statique pour trouver les fichiers volumineux
FileSchema.statics.findLargeFiles = function() {
  return this.find({ isLarge: true }).sort({ createdAt: -1 });
};

// Méthode statique pour nettoyer les fichiers anciens
FileSchema.statics.cleanupOldFiles = async function(ageInDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ageInDays);
  
  const oldFiles = await this.find({
    createdAt: { $lt: cutoffDate }
  });
  
  // Suppression des fichiers physiques
  oldFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Impossible de supprimer le fichier ${file.path}:`, error);
      }
    }
  });
  
  // Suppression des enregistrements dans la base de données
  return this.deleteMany({
    createdAt: { $lt: cutoffDate }
  });
};

// Index pour améliorer les performances des requêtes
FileSchema.index({ createdAt: -1 });
FileSchema.index({ status: 1 });
FileSchema.index({ isLarge: 1 });

const File = mongoose.model('File', FileSchema);

module.exports = File;