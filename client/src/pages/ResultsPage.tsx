import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ExcelFile, MatchResult, MetaSuggestion, ExcelColumnSelection, SearchFilters } from '@/types';
import ColumnSelector from '@/components/results/ColumnSelector';
import ResultsTable from '@/components/results/ResultsTable';
import ResultsFilters from '@/components/results/ResultsFilters';
import ResultsExport from '@/components/results/ResultsExport';

// Services fictifs (à remplacer par de vraies implémentations)
const fetchFileDetails = async (fileId: string): Promise<ExcelFile> => {
  // Simulation d'une requête API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: fileId,
        name: 'campagne-facebook.xlsx',
        uploadedAt: '2025-03-20T10:30:00Z',
        columns: ['Campagne', 'Budget', 'Mots-clés', 'Audience', 'Objectif', 'Placement'],
        rowCount: 145,
        status: 'completed'
      });
    }, 500);
  });
};

const fetchResults = async (fileId: string, columnName?: string): Promise<MatchResult[]> => {
  // Simulation d'une requête API
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!columnName) {
        resolve([]);
        return;
      }
      
      resolve([
        {
          id: '1',
          fileId,
          originalValue: 'Marketing Digital',
          metaSuggestions: [
            { id: 'ms1', value: 'Digital Marketing', audience: { size: 123000000, spec: {} }, score: 92, isSelected: true },
            { id: 'ms2', value: 'Online Marketing', audience: { size: 98000000, spec: {} }, score: 85, isSelected: false },
            { id: 'ms3', value: 'Internet Marketing', audience: { size: 78000000, spec: {} }, score: 70, isSelected: false }
          ],
          selectedSuggestion: { id: 'ms1', value: 'Digital Marketing', audience: { size: 123000000, spec: {} }, score: 92, isSelected: true },
          matchScore: 92,
          status: 'processed',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          fileId,
          originalValue: 'Réseaux Sociaux',
          metaSuggestions: [
            { id: 'ms4', value: 'Social Media', audience: { size: 156000000, spec: {} }, score: 94, isSelected: true },
            { id: 'ms5', value: 'Social Networks', audience: { size: 142000000, spec: {} }, score: 88, isSelected: false },
            { id: 'ms6', value: 'Social Platforms', audience: { size: 67000000, spec: {} }, score: 65, isSelected: false }
          ],
          selectedSuggestion: { id: 'ms4', value: 'Social Media', audience: { size: 156000000, spec: {} }, score: 94, isSelected: true },
          matchScore: 94,
          status: 'processed',
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          fileId,
          originalValue: 'E-commerce',
          metaSuggestions: [
            { id: 'ms7', value: 'Online Shopping', audience: { size: 189000000, spec: {} }, score: 88, isSelected: true },
            { id: 'ms8', value: 'E-commerce', audience: { size: 132000000, spec: {} }, score: 95, isSelected: false },
            { id: 'ms9', value: 'Internet Retail', audience: { size: 89000000, spec: {} }, score: 72, isSelected: false }
          ],
          selectedSuggestion: { id: 'ms7', value: 'Online Shopping', audience: { size: 189000000, spec: {} }, score: 88, isSelected: true },
          matchScore: 88,
          status: 'processed',
          createdAt: new Date().toISOString()
        }
      ]);
    }, 800);
  });
};

const ResultsPage = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  
  const [selectedColumn, setSelectedColumn] = useState<string | undefined>();
  const [filters, setFilters] = useState<SearchFilters>({ query: '' });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Charger les détails du fichier
  const { data: fileDetails, isLoading: isLoadingFile } = useQuery(
    ['fileDetails', fileId],
    () => fetchFileDetails(fileId as string),
    {
      enabled: !!fileId,
      onError: () => {
        toast.error('Erreur lors du chargement des détails du fichier');
        navigate('/');
      }
    }
  );
  
  // Charger les résultats
  const { data: results, isLoading: isLoadingResults } = useQuery(
    ['results', fileId, selectedColumn],
    () => fetchResults(fileId as string, selectedColumn),
    {
      enabled: !!fileId && !!selectedColumn,
      onError: () => toast.error('Erreur lors du chargement des résultats')
    }
  );
  
  // Filtrer les résultats
  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    return results.filter(result => {
      // Filtrer par texte de recherche
      if (filters.query && !result.originalValue.toLowerCase().includes(filters.query.toLowerCase()) && 
          !result.selectedSuggestion.value.toLowerCase().includes(filters.query.toLowerCase())) {
        return false;
      }
      
      // Filtrer par score minimum
      if (filters.minScore !== undefined && result.matchScore < filters.minScore) {
        return false;
      }
      
      // Filtrer par score maximum
      if (filters.maxScore !== undefined && result.matchScore > filters.maxScore) {
        return false;
      }
      
      // Filtrer par statut
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
    
    // Dans une implémentation réelle, vous appelleriez votre API pour supprimer les lignes
    toast.success(`${selectedRows.length} ligne(s) supprimée(s)`);
    setSelectedRows([]);
  };
  
  const handleExport = () => {
    // Dans une implémentation réelle, vous appelleriez votre API pour exporter les résultats
    toast.success('Export réussi !');
  };
  
  const handleSuggestionChange = (resultId: string, suggestionId: string) => {
    // Dans une implémentation réelle, vous mettriez à jour votre API
    toast.success('Suggestion mise à jour');
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
            >
              <TrashIcon className="h-5 w-5 mr-1" />
              Supprimer ({selectedRows.length})
            </button>
          )}
          
          <button
            onClick={handleExport}
            className="btn btn-primary"
            disabled={!results || results.length === 0}
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
            Exporter
          </button>
        </div>
      </div>
      
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
                <ResultsExport onExport={handleExport} />
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