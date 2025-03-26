import { useState, useEffect } from 'react';
import { SearchFilters } from '@/types';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface ResultsFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

const ResultsFilters = ({ filters, onFiltersChange }: ResultsFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  
  // Mettre à jour les filtres locaux lorsque les props changent
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);
  
  // Mettre à jour les filtres après un court délai pour éviter trop de requêtes
  useEffect(() => {
    const handler = setTimeout(() => {
      onFiltersChange(localFilters);
    }, 300);
    
    return () => clearTimeout(handler);
  }, [localFilters, onFiltersChange]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFilters({ ...localFilters, query: e.target.value });
  };
  
  const handleMinScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
    setLocalFilters({ ...localFilters, minScore: value });
  };
  
  const handleMaxScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
    setLocalFilters({ ...localFilters, maxScore: value });
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SearchFilters['status'];
    setLocalFilters({ ...localFilters, status: value });
  };
  
  const handleReset = () => {
    const resetFilters: SearchFilters = { query: '' };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    setShowAdvanced(false);
  };
  
  return (
    <div className="mb-4">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          className="block w-full rounded-md border-gray-300 pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          placeholder="Rechercher par mot-clé ou suggestion..."
          value={localFilters.query}
          onChange={handleSearchChange}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Filtres avancés</span>
        </button>
      </div>
      
      {showAdvanced && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="min-score" className="form-label">
              Score minimum
            </label>
            <input
              type="number"
              id="min-score"
              min="0"
              max="100"
              className="form-input"
              value={localFilters.minScore || ''}
              onChange={handleMinScoreChange}
            />
          </div>
          
          <div>
            <label htmlFor="max-score" className="form-label">
              Score maximum
            </label>
            <input
              type="number"
              id="max-score"
              min="0"
              max="100"
              className="form-input"
              value={localFilters.maxScore || ''}
              onChange={handleMaxScoreChange}
            />
          </div>
          
          <div>
            <label htmlFor="status" className="form-label">
              Statut
            </label>
            <select
              id="status"
              className="form-select"
              value={localFilters.status || 'all'}
              onChange={handleStatusChange}
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="processed">Traité</option>
              <option value="failed">Échec</option>
            </select>
          </div>
          
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={handleReset}
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsFilters;