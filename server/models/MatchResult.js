const mongoose = require('mongoose');

const SuggestionSchema = new mongoose.Schema({
  value: {
    type: String,
    required: true
  },
  audience: {
    size: {
      type: Number,
      required: true
    },
    spec: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  isSelected: {
    type: Boolean,
    default: false
  }
});

const MatchResultSchema = new mongoose.Schema({
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: [true, 'Le fichier associé est requis']
  },
  originalValue: {
    type: String,
    required: [true, 'La valeur originale est requise'],
    trim: true
  },
  metaSuggestions: [SuggestionSchema],
  selectedSuggestion: {
    type: SuggestionSchema,
    default: null
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: null
  },
  rowIndex: {
    type: Number,
    required: true
  },
  processingStartedAt: {
    type: Date,
    default: null
  },
  processingCompletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Méthode pour marquer comme traité
MatchResultSchema.methods.markProcessed = function(suggestions, selectedIndex, score) {
  this.metaSuggestions = suggestions;
  
  if (suggestions && suggestions.length > 0 && selectedIndex !== undefined) {
    suggestions[selectedIndex].isSelected = true;
    this.selectedSuggestion = suggestions[selectedIndex];
  }
  
  this.matchScore = score || (this.selectedSuggestion ? this.selectedSuggestion.score : null);
  this.status = 'processed';
  this.processingCompletedAt = new Date();
  
  return this.save();
};

// Méthode pour marquer en erreur
MatchResultSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  
  return this.save();
};

// Méthode pour changer la suggestion sélectionnée
MatchResultSchema.methods.changeSelectedSuggestion = function(suggestionIndex) {
  if (!this.metaSuggestions || suggestionIndex >= this.metaSuggestions.length) {
    throw new Error('Suggestion invalide');
  }
  
  // Désélectionner l'ancienne suggestion
  if (this.selectedSuggestion) {
    const oldIndex = this.metaSuggestions.findIndex(s => 
      s.value === this.selectedSuggestion.value && s.isSelected);
    
    if (oldIndex > -1) {
      this.metaSuggestions[oldIndex].isSelected = false;
    }
  }
  
  // Sélectionner la nouvelle suggestion
  this.metaSuggestions[suggestionIndex].isSelected = true;
  this.selectedSuggestion = this.metaSuggestions[suggestionIndex];
  
  // Mettre à jour le score si disponible
  if (this.selectedSuggestion.score) {
    this.matchScore = this.selectedSuggestion.score;
  }
  
  return this.save();
};

// Index pour améliorer les performances
MatchResultSchema.index({ file: 1, rowIndex: 1 });
MatchResultSchema.index({ file: 1, status: 1 });
MatchResultSchema.index({ file: 1, matchScore: -1 });

const MatchResult = mongoose.model('MatchResult', MatchResultSchema);

module.exports = MatchResult;