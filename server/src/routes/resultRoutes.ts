import express from 'express';
import * as XLSX from 'xlsx';
import { ResultModel } from '../models/Result';
import { FileModel } from '../models/File';
import OpenAI from 'openai';
import axios from 'axios';

const router = express.Router();

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration Meta API
const metaApiBaseUrl = 'https://graph.facebook.com';
const metaApiVersion = process.env.META_API_VERSION || 'v18.0';

// Route pour générer des suggestions pour un fichier
router.post('/:fileId/analyze', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { column } = req.body;

    // Vérifier que le fichier existe
    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Lire le fichier Excel
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Trouver l'index de la colonne
    const columnIndex = (data[0] as string[]).indexOf(column);
    if (columnIndex === -1) {
      return res.status(400).json({ message: 'Colonne non trouvée' });
    }

    // Extraire les valeurs uniques de la colonne
    const uniqueValues = [...new Set(data.slice(1).map(row => row[columnIndex]))];

    // Générer des suggestions pour chaque valeur unique
    const results = [];

    for (const value of uniqueValues) {
      try {
        // Obtenir des suggestions Meta Marketing
        const metaSuggestions = await getMetaMarketingSuggestions(value.toString());
        
        // Obtenir un score IA
        const aiScore = await getAIMatchScore(value.toString(), metaSuggestions);

        // Sélectionner la meilleure suggestion
        const bestSuggestion = metaSuggestions.reduce((best, current) => 
          current.score > best.score ? current : best
        );

        const result = new ResultModel({
          file: fileId,
          column: column,
          originalValue: value.toString(),
          metaSuggestions: metaSuggestions,
          selectedSuggestion: bestSuggestion,
          matchScore: bestSuggestion.score,
          status: 'processed'
        });

        await result.save();
        results.push(result);
      } catch (suggestionError) {
        console.error(`Erreur pour la valeur ${value}:`, suggestionError);
      }
    }

    res.status(201).json({
      message: 'Analyse terminée',
      resultsCount: results.length
    });
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'analyse du fichier', 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    });
  }
});

// Route pour récupérer les résultats d'un fichier
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { column } = req.query;

    const query: { file: string, column?: string } = { file: fileId };
    if (column) query.column = column as string;

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

// Route pour mettre à jour une suggestion
router.patch('/:resultId/suggestion', async (req, res) => {
  try {
    const { resultId } = req.params;
    const { suggestionId } = req.body;

    const result = await ResultModel.findById(resultId);
    if (!result) {
      return res.status(404).json({ message: 'Résultat non trouvé' });
    }

    // Réinitialiser tous les isSelected à false
    result.metaSuggestions.forEach(suggestion => {
      suggestion.isSelected = false;
    });

    // Sélectionner la nouvelle suggestion
    const selectedSuggestion = result.metaSuggestions.find(s => s.id === suggestionId);
    if (!selectedSuggestion) {
      return res.status(400).json({ message: 'Suggestion non trouvée' });
    }

    selectedSuggestion.isSelected = true;
    result.selectedSuggestion = selectedSuggestion;
    result.matchScore = selectedSuggestion.score;

    await result.save();

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la suggestion:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour de la suggestion', 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    });
  }
});

// Fonction pour obtenir des suggestions Meta Marketing
async function getMetaMarketingSuggestions(value: string) {
  try {
    // Appel à l'API Meta pour obtenir des suggestions
    const response = await axios.get(`${metaApiBaseUrl}/${metaApiVersion}/search`, {
      params: {
        q: value,
        type: 'adinterest',
        access_token: process.env.META_API_ACCESS_TOKEN
      }
    });

    // Transformer les résultats
    return response.data.data.map((interest: any) => ({
      id: interest.id,
      value: interest.name,
      audience: {
        size: interest.audience_size,
        spec: {}
      },
      score: calculateInterestScore(interest)
    })).slice(0, 3); // Limiter à 3 suggestions
  } catch (error) {
    console.error('Erreur API Meta:', error);
    // Suggestions par défaut en cas d'erreur
    return [
      { 
        id: 'fallback1', 
        value, 
        audience: { size: 1000000, spec: {} }, 
        score: 70 
      }
    ];
  }
}

// Fonction pour calculer un score pour un intérêt
function calculateInterestScore(interest: any): number {
  // Score basé sur la taille de l'audience et d'autres critères
  const baseScore = Math.min(Math.log(interest.audience_size || 1) * 10, 95);
  const randomVariation = Math.random() * 5;
  return Math.round(baseScore + randomVariation);
}

// Fonction pour obtenir un score IA de correspondance
async function getAIMatchScore(originalValue: string, suggestions: any[]) {
  try {
    const prompt = `
      Évalue la correspondance entre le mot-clé "${originalValue}" et les suggestions suivantes :
      ${suggestions.map(s => `- ${s.value}`).join('\n')}

      Réponds uniquement avec un score de correspondance entre 0 et 100.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10
    });

    const scoreResponse = completion.choices[0].message.content || '70';
    return Math.min(Math.max(parseInt(scoreResponse), 0), 100);
  } catch (error) {
    console.error('Erreur IA:', error);
    return 70; // Score par défaut
  }
}

export default router;