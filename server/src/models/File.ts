import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  columns: [{ type: String }],
  rowCount: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
});

export const FileModel = mongoose.model('File', FileSchema);