import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import xlsx from 'xlsx';
import { FileModel } from '../models/File';

const router = express.Router();

// Configuration de Multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch((err) => cb(err, uploadDir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      return cb(null, true);
    }
    cb(new Error('Seuls les fichiers Excel et CSV sont autorisés'));
  }
});

// Route pour uploader un fichier
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    // Lire le fichier
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON pour obtenir les colonnes et le nombre de lignes
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const columns = data[0] as string[];
    const rowCount = data.length - 1;

    // Créer un enregistrement de fichier dans la base de données
    const fileRecord = new FileModel({
      name: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      columns: columns,
      rowCount: rowCount,
      status: 'completed'
    });

    await fileRecord.save();

    res.status(201).json({
      message: 'Fichier téléchargé avec succès',
      file: {
        id: fileRecord._id,
        name: fileRecord.originalName,
        columns: fileRecord.columns,
        rowCount: fileRecord.rowCount
      }
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    res.status(500).json({ 
      message: 'Erreur lors du téléchargement du fichier',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour récupérer les détails d'un fichier
router.get('/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const file = await FileModel.findById(fileId);

    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    res.json({
      id: file._id,
      name: file.originalName,
      columns: file.columns,
      rowCount: file.rowCount,
      uploadedAt: file.uploadedAt,
      status: file.status
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du fichier:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des détails du fichier',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour lister tous les fichiers
router.get('/', async (req, res) => {
  try {
    const files = await FileModel.find().sort({ uploadedAt: -1 });
    
    const filesResponse = files.map(file => ({
      id: file._id,
      name: file.originalName,
      columns: file.columns,
      rowCount: file.rowCount,
      uploadedAt: file.uploadedAt,
      status: file.status
    }));

    res.json(filesResponse);
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des fichiers',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour supprimer un fichier
router.delete('/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const file = await FileModel.findByIdAndDelete(fileId);

    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Supprimer le fichier physique
    await fs.unlink(file.path);

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression du fichier',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;