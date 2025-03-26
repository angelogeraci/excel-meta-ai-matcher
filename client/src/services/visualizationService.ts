import {
  MatchResult,
  VisualizationData,
  ScoreDistribution,
  AudienceSizeData,
  KeywordComparisonData,
  WordCloudItem,
  ProgressData,
  ScoreAudienceCorrelation
} from '@/types';

/**
 * Service qui génère les données pour les visualisations à partir des résultats
 */
class VisualizationService {
  /**
   * Génère toutes les données de visualisation à partir des résultats
   */
  generateVisualizationData(results: MatchResult[]): VisualizationData {
    return {
      scoreSummary: this.generateScoreSummary(results),
      audienceSummary: this.generateAudienceSummary(results),
      keywordComparisons: this.generateKeywordComparisons(results),
      wordCloudData: this.generateWordCloudData(results),
      progressData: this.generateProgressData(results),
      correlationData: this.generateCorrelationData(results)
    };
  }

  /**
   * Génère un résumé des scores
   */
  generateScoreSummary(results: MatchResult[]) {
    const processedResults = results.filter(result => result.status === 'processed' && result.matchScore !== null);
    
    // Si aucun résultat, retourner des valeurs par défaut
    if (processedResults.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        distributions: []
      };
    }

    // Calculer les statistiques
    const scores = processedResults.map(result => result.matchScore || 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    
    // Trouver min, max et médiane
    const sortedScores = [...scores].sort((a, b) => a - b);
    const min = sortedScores[0];
    const max = sortedScores[sortedScores.length - 1];
    
    let median;
    const mid = Math.floor(sortedScores.length / 2);
    if (sortedScores.length % 2 === 0) {
      median = (sortedScores[mid - 1] + sortedScores[mid]) / 2;
    } else {
      median = sortedScores[mid];
    }

    // Générer la distribution des scores
    const distributions: ScoreDistribution[] = [];
    
    // Définir les plages de scores
    const ranges = [
      { min: 0, max: 20, label: '0-20' },
      { min: 20, max: 40, label: '20-40' },
      { min: 40, max: 60, label: '40-60' },
      { min: 60, max: 80, label: '60-80' },
      { min: 80, max: 100, label: '80-100' }
    ];

    // Compter les occurrences dans chaque plage
    ranges.forEach(range => {
      const count = scores.filter(score => score >= range.min && score < range.max).length;
      const percentage = (count / scores.length) * 100;
      
      distributions.push({
        range: range.label,
        count,
        percentage
      });
    });

    return {
      average,
      median,
      min,
      max,
      distributions
    };
  }

  /**
   * Génère un résumé des tailles d'audience
   */
  generateAudienceSummary(results: MatchResult[]) {
    const processedResults = results.filter(
      result => result.status === 'processed' && result.selectedSuggestion?.audience?.size
    );
    
    // Si aucun résultat, retourner des valeurs par défaut
    if (processedResults.length === 0) {
      return {
        totalAudience: 0,
        averageAudience: 0,
        minAudience: 0,
        maxAudience: 0,
        audienceSizeByKeyword: []
      };
    }

    // Calculer les statistiques d'audience
    const audienceSizes = processedResults.map(result => result.selectedSuggestion?.audience?.size || 0);
    const totalAudience = audienceSizes.reduce((a, b) => a + b, 0);
    const averageAudience = totalAudience / audienceSizes.length;
    const minAudience = Math.min(...audienceSizes);
    const maxAudience = Math.max(...audienceSizes);

    // Générer les données d'audience par mot-clé
    const audienceSizeByKeyword: AudienceSizeData[] = processedResults.map(result => ({
      originalValue: result.originalValue,
      audienceSize: result.selectedSuggestion?.audience?.size || 0,
      matchScore: result.matchScore || 0
    }));

    // Trier par taille d'audience
    audienceSizeByKeyword.sort((a, b) => b.audienceSize - a.audienceSize);

    return {
      totalAudience,
      averageAudience,
      minAudience,
      maxAudience,
      audienceSizeByKeyword
    };
  }

  /**
   * Génère des données de comparaison entre mots-clés originaux et suggestions
   */
  generateKeywordComparisons(results: MatchResult[]) {
    const processedResults = results.filter(
      result => result.status === 'processed' && result.selectedSuggestion
    );
    
    // Mapper les résultats pour la comparaison
    const keywordComparisons: KeywordComparisonData[] = processedResults.map(result => ({
      keyword: result.originalValue,
      suggestion: result.selectedSuggestion?.value || '',
      score: result.matchScore || 0,
      audienceSize: result.selectedSuggestion?.audience?.size || 0
    }));

    // Trier par score
    keywordComparisons.sort((a, b) => b.score - a.score);

    return keywordComparisons;
  }

  /**
   * Génère des données pour un nuage de mots
   */
  generateWordCloudData(results: MatchResult[]) {
    const processedResults = results.filter(result => result.status === 'processed');
    
    // Extraire tous les mots des suggestions
    const allWords: string[] = [];
    
    processedResults.forEach(result => {
      if (result.selectedSuggestion?.value) {
        const words = result.selectedSuggestion.value
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 2); // Ignorer les mots trop courts
        
        allWords.push(...words);
      }
    });

    // Compteur de fréquence des mots
    const wordFrequency: Record<string, number> = {};
    allWords.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Convertir en format pour nuage de mots
    const wordCloudData: WordCloudItem[] = Object.entries(wordFrequency)
      .map(([text, value]) => ({ text, value }))
      .filter(item => item.value > 1) // Filtrer les mots qui n'apparaissent qu'une fois
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // Prendre les 50 mots les plus fréquents

    return wordCloudData;
  }

  /**
   * Génère des données sur la progression du traitement
   */
  generateProgressData(results: MatchResult[]) {
    const total = results.length;
    
    if (total === 0) {
      return [];
    }

    // Compter par statut
    const statusCounts: Record<string, number> = {
      pending: 0,
      processed: 0,
      failed: 0
    };

    results.forEach(result => {
      statusCounts[result.status]++;
    });

    // Convertir en pourcentages
    const progressData: ProgressData[] = Object.entries(statusCounts).map(([status, count]) => ({
      status: status as 'pending' | 'processed' | 'failed',
      count,
      percentage: (count / total) * 100
    }));

    return progressData;
  }

  /**
   * Génère des données sur la corrélation entre score et taille d'audience
   */
  generateCorrelationData(results: MatchResult[]) {
    const processedResults = results.filter(
      result => result.status === 'processed' && result.selectedSuggestion?.audience?.size
    );

    // Mapper pour la corrélation
    const correlationData: ScoreAudienceCorrelation[] = processedResults.map(result => ({
      matchScore: result.matchScore || 0,
      audienceSize: result.selectedSuggestion?.audience?.size || 0,
      keyword: result.originalValue
    }));

    return correlationData;
  }
}

export default new VisualizationService();