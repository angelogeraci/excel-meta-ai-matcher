import { MatchResult } from './index';

// Types pour les visualisations de scores
export interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface ScoreSummary {
  average: number;
  median: number;
  min: number;
  max: number;
  distributions: ScoreDistribution[];
}

// Types pour les visualisations d'audience
export interface AudienceSizeData {
  originalValue: string;
  audienceSize: number;
  matchScore: number;
}

export interface AudienceSizeSummary {
  totalAudience: number;
  averageAudience: number;
  minAudience: number;
  maxAudience: number;
  audienceSizeByKeyword: AudienceSizeData[];
}

// Types pour la visualisation de comparaison des mots-clés
export interface KeywordComparisonData {
  keyword: string;
  suggestion: string;
  score: number;
  audienceSize: number;
}

// Types pour la visualisation de tendances de mots-clés
export interface WordCloudItem {
  text: string;
  value: number;
}

// Types pour la performance à travers le temps
export interface TimeSeriesData {
  date: string;
  averageScore: number;
  totalKeywords: number;
  successRate: number;
}

// Types pour les graphiques de progression
export interface ProgressData {
  status: 'pending' | 'processed' | 'failed';
  count: number;
  percentage: number;
}

// Types pour la corrélation entre score et taille d'audience
export interface ScoreAudienceCorrelation {
  matchScore: number;
  audienceSize: number;
  keyword: string;
}

// Type principal pour les données de visualisation
export interface VisualizationData {
  scoreSummary: ScoreSummary;
  audienceSummary: AudienceSizeSummary;
  keywordComparisons: KeywordComparisonData[];
  wordCloudData: WordCloudItem[];
  progressData: ProgressData[];
  correlationData: ScoreAudienceCorrelation[];
}

// Types pour les options de visualisation
export interface VisualizationOptions {
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'wordCloud' | 'heatmap';
  metricType: 'score' | 'audience' | 'keywords' | 'progress' | 'correlation';
  timeRange?: 'day' | 'week' | 'month' | 'all';
  colorScheme?: 'default' | 'meta' | 'monochrome' | 'rainbow';
  showLabels?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  isAnimated?: boolean;
}

// Fonction qui génère des données de visualisation à partir des résultats de correspondance
export type VisualizationGenerator = (results: MatchResult[]) => VisualizationData;