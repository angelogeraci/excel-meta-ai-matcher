import mongoose from 'mongoose';

const MetaSuggestionSchema = new mongoose.Schema({
  value: { type: String, required: true },
  audience: {
    size: { type: Number, required: true },
    spec: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  score: { type: Number, required: true },
  isSelected: { type: Boolean, default: false }
});

const ResultSchema = new mongoose.Schema({
  file: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'File', 
    required: true 
  },
  column: { type: String, required: true },
  originalValue: { type: String, required: true },
  metaSuggestions: [MetaSuggestionSchema],
  selectedSuggestion: {
    type: MetaSuggestionSchema,
    default: null
  },
  matchScore: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processed', 'failed'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const ResultModel = mongoose.model('Result', ResultSchema);