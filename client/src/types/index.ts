// Types liés à l'upload et au traitement des fichiers Excel
export interface ExcelFile {
  id: string;
  name: string;
  uploadedAt: string;
  columns: string[];
  rowCount: number;
  status: 'uploaded' | 'processing' | 'completed' | 'error';
}

export interface ExcelColumnSelection {
  fileId: string;
  selectedColumn: string;
}

// Types liés aux résultats après traitement
export interface MatchResult {
  id: string;
  fileId: string;
  originalValue: string;
  metaSuggestions: MetaSuggestion[];
  selectedSuggestion: MetaSuggestion;
  matchScore: number;
  status: 'pending' | 'processed' | 'failed';
  createdAt: string;
}

export interface MetaSuggestion {
  id: string;
  value: string;
  audience: {
    size: number;
    spec: Record<string, unknown>;
  };
  score?: number; // Score attribué par l'IA
  isSelected: boolean;
}

// Types pour les filtres de recherche
export interface SearchFilters {
  query: string;
  minScore?: number;
  maxScore?: number;
  status?: 'pending' | 'processed' | 'failed' | 'all';
}

// Types pour l'API Meta
export interface MetaAPIResponse {
  data: {
    audience_size_lower_bound: number;
    audience_size_upper_bound: number;
    path: string[];
    description: string;
    name: string;
    id: string;
  }[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
  };
}

// Types pour l'API IA
export interface AIScoreRequest {
  keyword: string;
  suggestions: string[];
}

export interface AIScoreResponse {
  scores: Array<{
    suggestion: string;
    score: number;
    reason: string;
  }>;
  bestMatch: {
    suggestion: string;
    score: number;
  };
}

// Types pour les filtres de tableau
export interface TableSelection {
  selectedRows: string[]; // IDs des lignes sélectionnées
}

// Types pour l'export
export interface ExportOptions {
  format: 'xlsx' | 'csv';
  includeScores: boolean;
  includeAllSuggestions: boolean;
}
