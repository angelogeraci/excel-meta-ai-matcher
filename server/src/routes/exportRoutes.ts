import express from 'express';
import xlsx from 'xlsx';
import { ResultModel } from '../models/Result';
import { FileModel } from '../models/File';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Route pour exporter les résultats
router.post('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { 
      format = 'xlsx', 
      includeScores = true, 
      includeAllSuggestions = false 
    } = req.body;

    // Vérifier que le fichier existe
    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Récupérer les résultats
    const results = await ResultModel.find({ file: fileId });
    if (results.length === 0) {
      return res.status(404).json({ message: 'Aucun résultat trouvé' });
    }

    // Préparer les données pour l'export
    const exportData = results.map(result => {
      const baseRow: any = {
        'Mot-clé Original': result.originalValue,
        'Suggestion Sélectionnée': result.selectedSuggestion.value,
        'Taille Audience': (result.selectedSuggestion.audience.size / 1000000).toFixed(1) + 'M'
      };

      if (includeScores) {
        baseRow['Score de Correspondance'] = result.matchScore;
      }

      if (includeAllSuggestions) {
        result.metaSuggestions.forEach((suggestion, index) => {
          baseRow[`Suggestion ${index + 1}`] = suggestion.value;
          baseRow[`Score Suggestion ${index + 1}`] = suggestion.score;
          baseRow[`Audience Suggestion ${index + 1}`] = (suggestion.audience.size / 1000000).toFixed(1) + 'M';
        });
      }

      return baseRow;
    });

    // Créer le classeur
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Résultats');

    // Générer le nom de fichier
    const exportFileName = `export_${file.originalName.replace(/\.[^/.]+$/, '')}_${Date.now()}.${format}`;
    const exportPath = path.join(process.cwd(), 'exports', exportFileName);

    // Créer le dossier exports s'il n'existe pas
    await fs.mkdir(path.dirname(exportPath), { recursive: true });

    // Écrire le fichier
    xlsx.writeFile(workbook, exportPath);

    // Envoyer le fichier en téléchargement
    res.download(exportPath, exportFileName, async (err) => {
      if (err) {
        console.error('Erreur lors du téléchargement:', err);
      }
      
      // Optionnel : supprimer le fichier après le téléchargement
      try {
        await fs.unlink(exportPath);
      } catch (unlinkErr) {
        console.error('Erreur lors de la suppression du fichier:', unlinkErr);
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'export des résultats:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'export des résultats',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;