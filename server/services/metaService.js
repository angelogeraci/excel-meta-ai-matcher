const axios = require('axios');

/**
 * Service qui gère les interactions avec l'API Meta Marketing
 */
class MetaService {
  constructor() {
    this.apiVersion = process.env.META_API_VERSION || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.accessToken = process.env.META_ACCESS_TOKEN;
    
    // Vérification des configurations requises
    if (!this.accessToken) {
      console.warn('WARNING: META_ACCESS_TOKEN n\'est pas défini. L\'API Meta Marketing ne fonctionnera pas correctement.');
    }
  }

  /**
   * Recherche des suggestions de ciblage basées sur un mot-clé
   * @param {string} keyword - Le mot-clé à rechercher
   * @param {number} limit - Nombre maximum de résultats à retourner
   * @returns {Promise<Array>} - Tableau de suggestions
   */
  async searchTargetingSuggestions(keyword, limit = 10) {
    try {
      if (!this.accessToken) {
        throw new Error('META_ACCESS_TOKEN n\'est pas défini');
      }

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: keyword,
          type: 'adinterest',
          limit,
          access_token: this.accessToken
        }
      });

      // Extraire les données pertinentes de la réponse
      if (response.data && response.data.data) {
        return response.data.data.map(suggestion => ({
          value: suggestion.name,
          audience: {
            size: this._calculateAudienceSize(suggestion),
            spec: {
              interests: [suggestion.id]
            }
          }
        }));
      }

      return [];
    } catch (error) {
      console.error('Erreur lors de la recherche de suggestions Meta:', error.message);
      
      // Simulation de réponse en mode développement si l'API n'est pas disponible
      if (process.env.NODE_ENV === 'development') {
        console.warn('Utilisation de suggestions simulées pour le développement');
        return this._getSimulatedSuggestions(keyword);
      }
      
      throw error;
    }
  }

  /**
   * Calcule la taille estimée de l'audience basée sur les données de Meta
   * @param {Object} suggestion - Suggestion de l'API Meta
   * @returns {number} - Taille estimée de l'audience
   */
  _calculateAudienceSize(suggestion) {
    // Si les données d'audience sont disponibles, utiliser la moyenne
    if (suggestion.audience_size_lower_bound && suggestion.audience_size_upper_bound) {
      return Math.floor((suggestion.audience_size_lower_bound + suggestion.audience_size_upper_bound) / 2);
    }
    
    // Sinon, utiliser une estimation approximative ou la valeur minimale disponible
    return suggestion.audience_size || suggestion.audience_size_lower_bound || 0;
  }

  /**
   * Génère des suggestions simulées pour le développement lorsque l'API n'est pas disponible
   * @param {string} keyword - Le mot-clé original
   * @returns {Array} - Suggestions simulées
   */
  _getSimulatedSuggestions(keyword) {
    const baseSuggestions = [
      { value: keyword, audience: { size: 10000000 + Math.random() * 50000000, spec: { interests: ['123456'] } } },
      { value: `${keyword} Marketing`, audience: { size: 5000000 + Math.random() * 20000000, spec: { interests: ['234567'] } } },
      { value: `Digital ${keyword}`, audience: { size: 8000000 + Math.random() * 30000000, spec: { interests: ['345678'] } } },
      { value: `${keyword} Social Media`, audience: { size: 12000000 + Math.random() * 40000000, spec: { interests: ['456789'] } } },
      { value: `Online ${keyword}`, audience: { size: 7000000 + Math.random() * 25000000, spec: { interests: ['567890'] } } }
    ];
    
    // Générer quelques variations du mot-clé en anglais si le mot-clé n'est pas en anglais
    if (!/^[a-zA-Z\s]+$/.test(keyword)) {
      // Utiliser des traductions approximatives pour la simulation
      const englishVariants = [
        { value: this._getEnglishSimulation(keyword), audience: { size: 15000000 + Math.random() * 60000000, spec: { interests: ['678901'] } } },
        { value: `${this._getEnglishSimulation(keyword)} Trends`, audience: { size: 9000000 + Math.random() * 35000000, spec: { interests: ['789012'] } } }
      ];
      
      return [...baseSuggestions, ...englishVariants];
    }
    
    return baseSuggestions;
  }
  
  /**
   * Simule une traduction en anglais pour les mots-clés non anglophones
   * (Ceci est une version très simplifiée pour la démonstration)
   * @param {string} keyword - Mot-clé non anglophone
   * @returns {string} - Version simulée en anglais
   */
  _getEnglishSimulation(keyword) {
    // Dictionnaire de traduction simplifié pour la démonstration
    const simpleDictionary = {
      'marketing': 'marketing',
      'digital': 'digital',
      'réseaux': 'networks',
      'sociaux': 'social',
      'médias': 'media',
      'vente': 'sales',
      'en': 'online',
      'ligne': 'online',
      'commerce': 'commerce',
      'publicité': 'advertising',
      'annonce': 'ad',
      'campagne': 'campaign'
    };
    
    // Diviser le mot-clé en mots individuels et tenter de traduire chacun
    const words = keyword.toLowerCase().split(/\s+/);
    const translated = words.map(word => simpleDictionary[word] || word);
    
    // Recombiner et capitaliser le premier mot pour l'anglais
    const result = translated.join(' ');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}

module.exports = new MetaService();