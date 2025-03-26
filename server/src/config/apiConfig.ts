import axios from 'axios';
import OpenAI from 'openai';

// Configuration Meta Marketing API
export const metaMarketingApi = axios.create({
  baseURL: 'https://graph.facebook.com/v18.0',
  params: {
    access_token: process.env.META_API_ACCESS_TOKEN
  }
});

// Configuration OpenAI
export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Service pour obtenir des suggestions Meta
export const metaMarketingService = {
  async getSuggestions(keyword: string) {
    try {
      // Exemple de requête à l'API Meta Marketing pour obtenir des suggestions
      const response = await metaMarketingApi.get('/search', {
        params: {
          q: keyword,
          type: 'adinterest'
        }
      });

      // Transformer les résultats en suggestions
      return response.data.data.map((item: any) => ({
        value: item.name,
        audience: {
          size: item.audience_size,
          spec: item
        },
        score: 0  // Le score sera calculé séparément
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des suggestions Meta:', error);
      return [];
    }
  }
};

// Service pour évaluer les suggestions avec OpenAI
export const aiEvaluationService = {
  async evaluateSuggestions(originalValue: string, suggestions: any[]) {
    try {
      const prompt = `Évalue la correspondance entre le mot-clé original "${originalValue}" et ces suggestions :
      ${suggestions.map((s, i) => `${i + 1}. ${s.value}`).join('\n')}
  
      Réponds uniquement avec un tableau de scores de 0 à 100 pour chaque suggestion, séparés par des virgules.`;
  
      const response = await openaiClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      });
  
      const scoresStr = response.choices[0].message.content || '';
      const scores = scoresStr.split(',').map(s => parseInt(s.trim(), 10));
  
      return suggestions.map((suggestion, index) => ({
        ...suggestion,
        score: scores[index] || Math.floor(Math.random() * 100)
      }));
    } catch (error) {
      console.error('Erreur lors de l\'évaluation des suggestions:', error);
      return suggestions.map(suggestion => ({
        ...suggestion,
        score: Math.floor(Math.random() * 100)
      }));
    }
  }
};