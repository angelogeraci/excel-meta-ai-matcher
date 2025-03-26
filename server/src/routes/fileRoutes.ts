import express from 'express';
import { FileModel } from '../models/File';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import mongoose from 'mongoose';
import xlsx from 'xlsx';
import fileUpload, { UploadedFile, FileArray } from 'express-fileupload';

const router = express.Router();
const uploadsDir = path.join(__dirname, '../../uploads');

// Créer le dossier uploads s'il n'existe pas
async function initializeUploadsDir() {
  try {
    await fs.access(uploadsDir);
    console.log('Dossier uploads existant et accessible');
  } catch (error) {
    console.log('Création du dossier uploads...');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.chmod(uploadsDir, 0o777);
      console.log('Dossier uploads créé avec succès');
    } catch (mkdirError) {
      console.error('Erreur lors de la création du dossier uploads:', mkdirError);
      throw new Error('Impossible de créer le dossier uploads');
    }
  }
}

// Initialiser le dossier uploads
initializeUploadsDir().catch(console.error);

// Configuration de express-fileupload
router.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  abortOnLimit: true,
  responseOnLimit: 'Le fichier est trop volumineux. La taille maximale est de 10MB.',
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: true,
  safeFileNames: true,
  preserveExtension: true,
  createParentPath: true
}));

// Route pour télécharger un fichier
router.post('/upload', async (req, res) => {
  console.log('Début de la requête d\'upload');
  console.log('Headers:', req.headers);

  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        message: 'Aucun fichier n\'a été uploadé'
      });
    }

    const uploadedFile = req.files.file as UploadedFile;
    if (Array.isArray(uploadedFile)) {
      return res.status(400).json({
        message: 'Un seul fichier à la fois est autorisé'
      });
    }

    console.log('Fichier reçu:', uploadedFile.name, 'Type MIME:', uploadedFile.mimetype);

    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      'application/x-excel',
      'application/excel',
      'application/x-msexcel',
      'text/csv'
    ];

    const allowedExtensions = ['.xls', '.xlsx', '.csv'];
    const fileExtension = path.extname(uploadedFile.name).toLowerCase();

    if (!allowedMimes.includes(uploadedFile.mimetype) && !allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({
        message: 'Format de fichier non supporté',
        error: 'Seuls les fichiers Excel (.xls, .xlsx, .csv) sont acceptés.'
      });
    }

    const uniqueFileName = `${Date.now()}-${uploadedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    try {
      // Déplacer le fichier vers le dossier uploads
      await uploadedFile.mv(filePath);
      console.log('Fichier déplacé vers:', filePath);

      // Lire le fichier Excel
      console.log('Lecture du fichier Excel...');
      const workbook = xlsx.readFile(filePath, {
        type: 'file',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: true
      });

      if (!workbook.SheetNames.length) {
        throw new Error('Le fichier Excel est vide');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (!data.length) {
        throw new Error('Le fichier Excel ne contient pas de données');
      }

      const firstRow = data[0] as Record<string, unknown>;
      const columns = Object.keys(firstRow);
      
      if (!columns.length) {
        throw new Error('Le fichier Excel ne contient pas de colonnes');
      }

      // Sauvegarder les informations dans la base de données
      const file = new FileModel({
        filename: uploadedFile.name,
        path: filePath,
        columns,
        rowCount: data.length,
        status: 'uploaded',
        size: uploadedFile.size,
        mimeType: uploadedFile.mimetype
      });

      await file.save();
      console.log('Fichier enregistré en base de données');
      res.json(file);

    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
      
      // Nettoyer le fichier en cas d'erreur
      try {
        await fs.unlink(filePath);
        console.log('Fichier temporaire supprimé:', filePath);
      } catch (unlinkError) {
        console.error('Erreur lors de la suppression du fichier temporaire:', unlinkError);
      }

      throw error;
    }

  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ 
      message: 'Erreur lors du traitement du fichier',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour récupérer la liste des fichiers
router.get('/', async (req, res) => {
  try {
    const files = await FileModel.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des fichiers' });
  }
});

// Route pour récupérer les détails d'un fichier spécifique
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    // Vérifier si l'ID est un ObjectId MongoDB valide
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ 
        message: 'ID de fichier invalide',
        details: 'L\'ID fourni n\'est pas un ID MongoDB valide'
      });
    }

    const file = await FileModel.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Ajouter des informations supplémentaires sur le fichier
    const fileStats = await fs.stat(file.path).catch(() => null);
    
    const response = {
      ...file.toObject(),
      exists: !!fileStats,
      size: fileStats ? fileStats.size : 0,
      lastModified: fileStats ? fileStats.mtime : null
    };

    res.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du fichier:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des détails du fichier',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour supprimer un fichier
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Supprimer le fichier physique
    try {
      await fs.unlink(file.path);
    } catch (unlinkError) {
      console.error('Erreur lors de la suppression du fichier physique:', unlinkError);
    }

    // Supprimer l'entrée de la base de données
    await file.deleteOne();

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