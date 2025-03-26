import express from 'express';
import { ResultModel } from '../models/Result';
import { FileModel } from '../models/File';
import axios from 'axios';
import OpenAI from 'openai';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function pour obtenir les suggestions Meta
async function getMetaSuggestions(value: string) {
  try {
    // Simulation des suggestions Meta (à remplacer par un vrai appel API)
    const suggestions = [
      { 
        value: value,
        audience: { 
          size: Math.floor(Math.random() * 200000000), 
          spec: {} 
        },
        score: Math.floor(Math.random() * 100)
      },
      { 
        value: `Digital ${value}`,
        audience: { 
          size: Math.floor(Math.random() * 200000000), 
          spec: {} 
        },
        score: Math.floor(Math.random() * 100)
      }
    ];

    return suggestions;
  } catch (error) {
    console.error('Erreur lors de la récupération des suggestions Meta:', error);
    return [];
  }
}

// Helper function pour évaluer les suggestions avec OpenAI
async function evaluateSuggestions(originalValue: string, suggestions: any[]) {
  try {
    const prompt = `Évalue la correspondance entre le mot-clé original "${originalValue}" et ces suggestions :
    ${suggestions.map((s, i) => `${i + 1}. ${s.value}`).join('\n')}

    Réponds uniquement avec un tableau de scores de 0 à 100 pour chaque suggestion, séparés par des virgules.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    const scoresStr = response.choices[0].message.content || '';
    const scores = scoresStr.split(',').map(s => parseInt(s.trim(), 10));

    return suggestions.map((suggestion, index) => ({
      ...suggestion,
      score: scores[index] || suggestion.score
    }));
  } catch (error) {
    console.error('Erreur lors de l\'évaluation des suggestions:', error);
    return suggestions;
  }
}

// Route pour générer des résultats pour une colonne de fichier
router.post('/generate', async (req, res) => {
  try {
    const { fileId, column } = req.body;

    // Vérifier que le fichier existe
    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Lire le fichier Excel et extraire les valeurs de la colonne
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Tableau pour stocker les résultats
    const results = [];

    // Traiter chaque ligne
    for (const row of data) {
      const originalValue = row[column];
      if (!originalValue) continue;

      // Obtenir des suggestions Meta
      const metaSuggestions = await getMetaSuggestions(originalValue);

      // Évaluer les suggestions avec OpenAI
      const evaluatedSuggestions = await evaluateSuggestions(originalValue, metaSuggestions);

      // Sélectionner la meilleure suggestion
      const bestSuggestion = evaluatedSuggestions.reduce((best, current) => 
        current.score > best.score ? current : best
      );

      // Créer un résultat
      const result = new ResultModel({
        file: fileId,
        column: column,
        originalValue: originalValue,
        metaSuggestions: evaluatedSuggestions,
        selectedSuggestion: bestSuggestion,
        matchScore: bestSuggestion.score,
        status: 'processed'
      });

      await result.save();
      results.push(result);
    }

    res.status(201).json({
      message: `Résultats générés pour la colonne ${column}`,
      resultCount: results.length
    });
  } catch (error) {
    console.error('Erreur lors de la génération des résultats:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération des résultats',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour récupérer les résultats d'un fichier pour une colonne
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { column } = req.query;

    const query: any = { file: fileId };
    if (column) {
      query.column = column;
    }

    const results = await ResultModel.find(query);

    res.json(results);
  } catch (error) {
    console.error('Erreur lors de la récupération des résultats:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des résultats',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour mettre à jour une suggestion pour un résultat
router.patch('/:resultId/suggestion', async (req, res) => {
  try {
    const { resultId } = req.params;
    const { suggestionId } = req.body;

    const result = await ResultModel.findById(resultId);
    if (!result) {
      return res.status(404).json({ message: 'Résultat non trouvé' });
    }

    // Réinitialiser les suggestions précédentes
    result.metaSuggestions.forEach(suggestion => {
      suggestion.isSelected = false;
    });

    // Sélectionner la nouvelle suggestion
    const selectedSuggestion = result.metaSuggestions.find(s => s.id === suggestionId);
    if (!selectedSuggestion) {
      return res.status(404).json({ message: 'Suggestion non trouvée' });
    }

    selectedSuggestion.isSelected = true;
    result.selectedSuggestion = selectedSuggestion;
    result.matchScore = selectedSuggestion.score;

    await result.save();

    res.json({
      message: 'Suggestion mise à jour',
      result
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la suggestion:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour de la suggestion',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour supprimer des résultats
router.delete('/', async (req, res) => {
  try {
    const { resultIds } = req.body;

    if (!resultIds || resultIds.length === 0) {
      return res.status(400).json({ message: 'Aucun résultat à supprimer' });
    }

    const deleteResult = await ResultModel.deleteMany({ _id: { $in: resultIds } });

    res.json({
      message: `${deleteResult.deletedCount} résultat(s) supprimé(s)`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des résultats:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la suppression des résultats',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;