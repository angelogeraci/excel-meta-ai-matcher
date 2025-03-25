import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Services fictifs pour l'implémentation (à remplacer plus tard par des services réels)
const uploadExcelFile = async (file: File): Promise<{id: string}> => {
  // Dans un cas réel, vous utiliseriez FormData et axios pour envoyer le fichier à l'API
  console.log('Uploading file...', file.name);
  
  // Simulation d'un délai de chargement
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: 'new-file-123' });
    }, 1500);
  });
};

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const navigate = useNavigate();
  
  const { mutate: uploadFile, isLoading } = useMutation(
    (file: File) => uploadExcelFile(file),
    {
      onSuccess: (data) => {
        toast.success('Fichier importé avec succès !');
        navigate(`/results/${data.id}`);
      },
      onError: () => {
        toast.error('Erreur lors de l\'importation du fichier.');
      }
    }
  );
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });
  
  const removeFile = () => {
    setSelectedFile(null);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      uploadFile(selectedFile);
    } else {
      toast.error('Veuillez sélectionner un fichier Excel.');
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Importer un fichier Excel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Importez un fichier Excel contenant vos critères ou mots-clés pour les faire correspondre avec les suggestions de Meta Marketing.
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="card mb-6">
          <div className="p-6">
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
            >
              <input {...getInputProps()} />
              
              <div className="flex flex-col items-center">
                <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-700 font-medium">
                  Glissez-déposez votre fichier Excel ici, ou 
                  <span className="text-primary-600 hover:text-primary-700"> cliquez pour parcourir</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Formats acceptés : .xlsx, .xls
                </p>
              </div>
            </div>
            
            {selectedFile && (
              <div className="mt-4 bg-primary-50 rounded-md p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium text-primary-700">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importation en cours...
              </>
            ) : (
              'Importer et analyser'
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-8">
        <h2 className="font-medium text-gray-900 mb-3">Comment ça marche ?</h2>
        <div className="bg-white shadow overflow-hidden rounded-md">
          <ul className="divide-y divide-gray-200">
            <li className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-100 rounded-full h-8 w-8 flex items-center justify-center text-primary-600 font-bold">
                  1
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Importez votre fichier Excel</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Votre fichier doit contenir au moins une colonne avec vos critères ou mots-clés.
                  </p>
                </div>
              </div>
            </li>
            <li className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-100 rounded-full h-8 w-8 flex items-center justify-center text-primary-600 font-bold">
                  2
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Sélectionnez la colonne à analyser</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Indiquez quelle colonne contient les critères que vous souhaitez faire correspondre.
                  </p>
                </div>
              </div>
            </li>
            <li className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-100 rounded-full h-8 w-8 flex items-center justify-center text-primary-600 font-bold">
                  3
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Obtenez les meilleures correspondances</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Notre système utilisera l'API Meta Marketing et l'IA pour trouver les meilleures correspondances.
                  </p>
                </div>
              </div>
            </li>
            <li className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-100 rounded-full h-8 w-8 flex items-center justify-center text-primary-600 font-bold">
                  4
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Exportez les résultats</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Téléchargez un fichier Excel avec toutes les correspondances et leurs scores.
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;