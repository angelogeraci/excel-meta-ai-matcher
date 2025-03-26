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
  }
}, {
  timestamps: true
});

// Méthode pour marquer le fichier en cours de traitement
FileSchema.methods.startProcessing = function() {
  this.status = 'processing';
  this.processingStartedAt = new Date();
  return this.save();
};

// Méthode pour marquer le fichier comme traité
FileSchema.methods.completeProcessing = function() {
  this.status = 'completed';
  this.processingCompletedAt = new Date();
  return this.save();
};

// Méthode pour marquer le fichier en erreur
FileSchema.methods.markError = function(message) {
  this.status = 'error';
  this.errorMessage = message;
  return this.save();
};

// Index pour améliorer les performances des requêtes
FileSchema.index({ createdAt: -1 });
FileSchema.index({ status: 1 });

const File = mongoose.model('File', FileSchema);

module.exports = File;