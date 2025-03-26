const OpenAI = require('openai');

/**
 * Service qui gère les interactions avec l'API OpenAI pour l'évaluation des correspondances
 */
class AIService {
  constructor() {
    // Initialiser le client OpenAI si la clé API est disponible
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      console.warn('WARNING: OPENAI_API_KEY n\'est pas défini. L\'évaluation par IA ne fonctionnera pas correctement.');
      this.openai = null;
    }
  }

  /**
   * Évalue les correspondances entre un mot-clé original et les suggestions de Meta
   * @param {string} keyword - Le mot-clé original
   * @param {Array<Object>} suggestions - Liste des suggestions de Meta
   * @returns {Promise<Object>} - Résultats de l'évaluation
   */
  async evaluateMatches(keyword, suggestions) {
    try {
      if (!this.openai) {
        throw new Error('API OpenAI non configurée');
      }
      
      // Extraire uniquement la valeur textuelle des suggestions pour l'analyse
      const suggestionValues = suggestions.map(s => s.value);
      
      // Construire le prompt pour l'analyse
      const prompt = this._buildEvaluationPrompt(keyword, suggestionValues);
      
      // Appeler l'API OpenAI
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Vous êtes un expert en marketing numérique spécialisé dans l'évaluation des correspondances entre les mots-clés et les ciblages publicitaires pour Meta (Facebook/Instagram). Vous allez analyser la pertinence entre un mot-clé d'origine et plusieurs suggestions de ciblage, puis attribuer un score de correspondance à chacune sur une échelle de 1 à 100."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Traiter la réponse de l'IA
      const responseContent = completion.choices[0].message.content;
      const evaluation = JSON.parse(responseContent);
      
      return this._processEvaluation(evaluation, suggestions);
    } catch (error) {
      console.error('Erreur lors de l\'évaluation par IA:', error.message);
      
      // En mode développement, utiliser une évaluation simulée si l'API n'est pas disponible
      if (process.env.NODE_ENV === 'development') {
        console.warn('Utilisation d\'une évaluation simulée pour le développement');
        return this._getSimulatedEvaluation(keyword, suggestions);
      }
      
      throw error;
    }
  }

  /**
   * Construit le prompt pour l'évaluation par l'IA
   * @param {string} keyword - Le mot-clé original
   * @param {Array<string>} suggestions - Liste des suggestions textuelles
   * @returns {string} - Prompt formaté pour l'IA
   */
  _buildEvaluationPrompt(keyword, suggestions) {
    return `
      Évaluez la pertinence entre le mot-clé d'origine "${keyword}" et les suggestions de ciblage suivantes pour les publicités Meta:
      ${suggestions.map((suggestion, index) => `${index + 1}. "${suggestion}"`).join('\n')}
      
      Pour chaque suggestion, évaluez:
      1. La pertinence sémantique
      2. La correspondance d'intention marketing
      3. La pertinence culturelle et linguistique
      
      Attribuez un score de 1 à 100 pour chaque suggestion, où 100 représente une correspondance parfaite.
      
      Fournissez une brève justification pour chaque score.
      
      Identifiez également la meilleure correspondance globale et son score.
      
      Formatez votre réponse en JSON avec cette structure:
      {
        "scores": [
          {
            "suggestion": "texte de la suggestion",
            "score": nombre entier de 1 à 100,
            "reason": "justification du score"
          },
          ...
        ],
        "bestMatch": {
          "suggestion": "meilleure suggestion",
          "score": nombre entier de 1 à 100
        }
      }
    `;
  }

  /**
   * Traite les résultats de l'évaluation par l'IA pour les associer aux suggestions originales
   * @param {Object} evaluation - Résultats bruts de l'évaluation
   * @param {Array<Object>} originalSuggestions - Suggestions originales avec les données complètes
   * @returns {Object} - Résultats traités
   */
  _processEvaluation(evaluation, originalSuggestions) {
    // Associer les scores à chaque suggestion originale
    const scoredSuggestions = originalSuggestions.map(suggestion => {
      const matchingScore = evaluation.scores.find(s => s.suggestion === suggestion.value);
      if (matchingScore) {
        return {
          ...suggestion,
          score: matchingScore.score,
          reasonForScore: matchingScore.reason
        };
      }
      return suggestion;
    });
    
    // Trier par score décroissant
    scoredSuggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Déterminer l'index de la meilleure correspondance
    const bestMatchIndex = scoredSuggestions.findIndex(
      s => s.value === evaluation.bestMatch.suggestion
    );
    
    return {
      suggestions: scoredSuggestions,
      bestMatchIndex: bestMatchIndex >= 0 ? bestMatchIndex : 0,
      bestMatchScore: evaluation.bestMatch.score
    };
  }

  /**
   * Génère une évaluation simulée pour le développement lorsque l'API n'est pas disponible
   * @param {string} keyword - Le mot-clé original
   * @param {Array<Object>} suggestions - Liste des suggestions
   * @returns {Object} - Évaluation simulée
   */
  _getSimulatedEvaluation(keyword, suggestions) {
    const scoredSuggestions = suggestions.map(suggestion => {
      // Simuler un score basé sur la correspondance textuelle
      let score = 50; // Score de base
      
      // Correspondance exacte
      if (suggestion.value.toLowerCase() === keyword.toLowerCase()) {
        score = 95;
      } 
      // Contient le mot-clé complet
      else if (suggestion.value.toLowerCase().includes(keyword.toLowerCase())) {
        score = 85;
      } 
      // Contient des parties du mot-clé
      else {
        const keywordWords = keyword.toLowerCase().split(/\s+/);
        const suggestionWords = suggestion.value.toLowerCase().split(/\s+/);
        
        let matches = 0;
        keywordWords.forEach(word => {
          if (suggestionWords.some(sWord => sWord.includes(word) || word.includes(sWord))) {
            matches++;
          }
        });
        
        // Ajuster le score en fonction du nombre de correspondances
        if (matches > 0) {
          score = 60 + Math.min(25, matches * 10);
        }
      }
      
      // Ajouter une variation aléatoire
      score = Math.min(98, Math.max(35, score + (Math.random() * 10 - 5)));
      
      return {
        ...suggestion,
        score: Math.round(score)
      };
    });
    
    // Trier par score
    scoredSuggestions.sort((a, b) => b.score - a.score);
    
    return {
      suggestions: scoredSuggestions,
      bestMatchIndex: 0,
      bestMatchScore: scoredSuggestions[0].score
    };
  }
}

module.exports = new AIService();