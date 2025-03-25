import { useState, useCallback } from 'react';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { ArrowUpTrayIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

// Simulons un service d'API pour l'upload
const uploadExcelFile = async (file: File): Promise<{ id: string }> => {
  // Simulation d'un appel API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: 'new-file-id' });
    }, 1500);
  });
};

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const navigate = useNavigate();

  const parseExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Prendre la première feuille
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir en JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Récupérer les en-têtes (colonnes)
        const headers = jsonData[0] as string[];
        setColumns(headers);
        
        // Récupérer les 5 premières lignes pour l'aperçu
        const previewData = jsonData.slice(1, 6);
        setPreview(previewData);
        
        toast.success('Fichier Excel chargé avec succès !');
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier Excel:', error);
        toast.error('Erreur lors de la lecture du fichier. Vérifiez que c\'est un fichier Excel valide.');
        setSelectedFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      parseExcel(file);
    }
  }, [parseExcel]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  });

  const uploadMutation = useMutation(uploadExcelFile, {
    onSuccess: (data) => {
      toast.success('Fichier téléchargé avec succès!');
      navigate(`/results/${data.id}`);
    },
    onError: () => {
      toast.error('Erreur lors du téléchargement du fichier');
    }
  });

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setColumns([]);
    setPreview([]);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Importer un fichier Excel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Téléchargez un fichier Excel contenant les critères à analyser avec l'API Meta Marketing
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
          >
            <input {...getInputProps()} />
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-900">
              Glissez-déposez un fichier Excel ici, ou cliquez pour sélectionner
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Formats acceptés: .xlsx, .xls (max 10MB)
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentTextIcon className="h-10 w-10 text-primary-500" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{selectedFile.name}</h3>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {columns.length} colonnes
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={removeFile}
                className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {columns.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Colonnes disponibles:</h4>
                <div className="flex flex-wrap gap-2">
                  {columns.map((column, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                    >
                      {column}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {preview.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Aperçu des données:</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        {columns.map((column, index) => (
                          <th
                            key={index}
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadMutation.isLoading}
                className="btn btn-primary"
              >
                {uploadMutation.isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Télécharger et analyser
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;