import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ExcelFile, MatchResult, SearchFilters, ExportOptions } from '@/types';
import ColumnSelector from '@/components/results/ColumnSelector';
import ResultsTable from '@/components/results/ResultsTable';
import ResultsFilters from '@/components/results/ResultsFilters';
import ResultsExport from '@/components/results/ResultsExport';
import { apiService } from '@/services/apiService';

const ResultsPage = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  
  const [selectedColumn, setSelectedColumn] = useState<string | undefined>();
  const [filters, setFilters] = useState<SearchFilters>({ query: '' });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Charger les détails du fichier
  const { 
    data: fileDetails, 
    isLoading: isLoadingFile, 
    error: fileError 
  } = useQuery<ExcelFile, Error>(
    ['fileDetails', fileId],
    () => apiService.fetchFileDetails(fileId as string),
    {
      enabled: !!fileId,
      onError: (error) => {
        toast.error(`Erreur lors du chargement des détails du fichier : ${error.message}`);
        navigate('/');
      }
    }
  );
  
  // Charger les résultats
  const { 
    data: results, 
    isLoading: isLoadingResults, 
    error: resultsError 
  } = useQuery<MatchResult[], Error>(
    ['results', fileId, selectedColumn],
    () => apiService.fetchResults(fileId as string, selectedColumn as string),
    {
      enabled: !!fileId && !!selectedColumn,
      onError: (error) => {
        toast.error(`Erreur lors du chargement des résultats : ${error.message}`);
      }
    }
  );
  
  // Mutation pour exporter les résultats
  const exportMutation = useMutation(
    (options: ExportOptions) => apiService.exportResults(fileId as string, options),
    {
      onSuccess: () => {
        toast.success('Export réussi');
      },
      onError: (error: Error) => {
        toast.error(`Erreur lors de l'export : ${error.message}`);
      }
    }
  );

  // Mutation pour supprimer des résultats
  const deleteMutation = useMutation(
    (resultIds: string[]) => apiService.deleteResults(resultIds),
    {
      onSuccess: () => {
        toast.success(`${selectedRows.length} résultat(s) supprimé(s)`);
        setSelectedRows([]);
      },
      onError: (error: Error) => {
        toast.error(`Erreur lors de la suppression : ${error.message}`);
      }
    }
  );

  // Mutation pour mettre à jour une suggestion
  const updateSuggestionMutation = useMutation(
    ({ resultId, suggestionId }: { resultId: string, suggestionId: string }) => 
      apiService.updateSuggestion(resultId, suggestionId),
    {
      onSuccess: () => {
        toast.success('Suggestion mise à jour');
      },
      onError: (error: Error) => {
        toast.error(`Erreur lors de la mise à jour : ${error.message}`);
      }
    }
  );
  
  // Filtrer les résultats
  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    return results.filter(result => {
      // Filtres de recherche
      if (filters.query && 
        !result.originalValue.toLowerCase().includes(filters.query.toLowerCase()) && 
        !result.selectedSuggestion.value.toLowerCase().includes(filters.query.toLowerCase())) {
        return false;
      }
      
      // Filtres de score
      if (filters.minScore !== undefined && result.matchScore < filters.minScore) {
        return false;
      }
      
      if (filters.maxScore !== undefined && result.matchScore > filters.maxScore) {
        return false;
      }
      
      // Filtre de statut
      if (filters.status && filters.status !== 'all' && result.status !== filters.status) {
        return false;
      }
      
      return true;
    });
  }, [results, filters]);
  
  const handleColumnSelect = (columnName: string) => {
    setSelectedColumn(columnName);
  };
  
  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };
  
  const handleRowsSelect = (rows: string[]) => {
    setSelectedRows(rows);
  };
  
  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    deleteMutation.mutate(selectedRows);
  };
  
  const handleExport = (options: ExportOptions) => {
    exportMutation.mutate(options);
  };
  
  const handleSuggestionChange = (resultId: string, suggestionId: string) => {
    updateSuggestionMutation.mutate({ resultId, suggestionId });
  };
  
  const isLoading = isLoadingFile || isLoadingResults;
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {fileDetails?.name || 'Chargement...'}
          </h1>
          {fileDetails && (
            <p className="mt-1 text-sm text-gray-500">
              {fileDetails.rowCount} lignes • {fileDetails.columns.length} colonnes
            </p>
          )}
        </div>
        
        <div className="mt-4 md:mt-0 flex">
          {selectedRows.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="btn btn-danger mr-2"
              disabled={deleteMutation.isLoading}
            >
              <TrashIcon className="h-5 w-5 mr-1" />
              Supprimer ({selectedRows.length})
            </button>
          )}
          
          <button
            onClick={() => handleExport({ 
              format: 'xlsx', 
              includeScores: true, 
              includeAllSuggestions: false 
            })}
            className="btn btn-primary"
            disabled={!results || results.length === 0 || exportMutation.isLoading}
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
            Exporter
          </button>
        </div>
      </div>
      
      {fileError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          {fileError.message}
        </div>
      )}

      {resultsError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          {resultsError.message}
        </div>
      )}
      
      {!selectedColumn && fileDetails ? (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Sélectionnez une colonne à analyser
          </h2>
          <ColumnSelector 
            columns={fileDetails.columns} 
            onSelect={handleColumnSelect} 
          />
        </div>
      ) : (
        <>
          {!isLoading && results && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <ResultsFilters 
                  filters={filters} 
                  onFiltersChange={handleFiltersChange} 
                />
              </div>
              <div>
                <ResultsExport 
                  onExport={handleExport} 
                />
              </div>
            </div>
          )}
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="loading-spinner mx-auto" />
                <p className="mt-2 text-gray-500">Chargement des résultats...</p>
              </div>
            ) : results && results.length > 0 ? (
              <ResultsTable 
                results={filteredResults}
                selectedRows={selectedRows}
                onRowsSelect={handleRowsSelect}
                onSuggestionChange={handleSuggestionChange}
              />
            ) : (
              <div className="p-8 text-center">
                {selectedColumn ? (
                  <p className="text-gray-500">Aucun résultat trouvé pour la colonne sélectionnée.</p>
                ) : (
                  <p className="text-gray-500">Veuillez sélectionner une colonne à analyser.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsPage;