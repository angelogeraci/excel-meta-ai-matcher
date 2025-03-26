import { useState } from 'react';
import { ExportOptions } from '@/types';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface ResultsExportProps {
  onExport: (options: ExportOptions) => void;
}

const ResultsExport = ({ onExport }: ResultsExportProps) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'xlsx',
    includeScores: true,
    includeAllSuggestions: false
  });
  
  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExportOptions({
      ...exportOptions,
      format: e.target.value as 'xlsx' | 'csv'
    });
  };
  
  const handleIncludeScoresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExportOptions({
      ...exportOptions,
      includeScores: e.target.checked
    });
  };
  
  const handleIncludeAllSuggestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExportOptions({
      ...exportOptions,
      includeAllSuggestions: e.target.checked
    });
  };
  
  const handleExport = () => {
    onExport(exportOptions);
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Options d'exportation</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="export-format" className="form-label">
            Format
          </label>
          <select
            id="export-format"
            className="form-select"
            value={exportOptions.format}
            onChange={handleFormatChange}
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </div>
        
        <div className="flex items-start">
          <div className="flex h-5 items-center">
            <input
              id="include-scores"
              type="checkbox"
              className="form-checkbox"
              checked={exportOptions.includeScores}
              onChange={handleIncludeScoresChange}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="include-scores" className="font-medium text-gray-700">
              Inclure les scores
            </label>
            <p className="text-gray-500">
              Ajouter les scores de correspondance
            </p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="flex h-5 items-center">
            <input
              id="include-all-suggestions"
              type="checkbox"
              className="form-checkbox"
              checked={exportOptions.includeAllSuggestions}
              onChange={handleIncludeAllSuggestionsChange}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="include-all-suggestions" className="font-medium text-gray-700">
              Toutes les suggestions
            </label>
            <p className="text-gray-500">
              Inclure toutes les suggestions (pas seulement la sélectionnée)
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleExport}
          className="btn btn-primary w-full"
        >
          <ArrowDownTrayIcon className="mr-2 h-5 w-5" />
          Exporter
        </button>
      </div>
    </div>
  );
};

export default ResultsExport;