import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExcelFile } from '@/types';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface RecentFilesListProps {
  files: ExcelFile[];
}

const RecentFilesList = ({ files }: RecentFilesListProps) => {
  
  // Fonction pour formater les dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  };

  // Fonction pour obtenir le statut visuel
  const getStatusBadge = (status: ExcelFile['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="badge badge-success">
            <CheckCircleIcon className="mr-1 h-4 w-4" />
            Complété
          </span>
        );
      case 'processing':
        return (
          <span className="badge badge-warning">
            <ClockIcon className="mr-1 h-4 w-4" />
            En traitement
          </span>
        );
      case 'error':
        return (
          <span className="badge badge-error">
            <ExclamationCircleIcon className="mr-1 h-4 w-4" />
            Erreur
          </span>
        );
      default:
        return (
          <span className="badge badge-info">
            <ClockIcon className="mr-1 h-4 w-4" />
            Téléchargé
          </span>
        );
    }
  };

  return (
    <ul className="divide-y divide-gray-200">
      {files.map((file) => (
        <li key={file.id}>
          <Link
            to={`/results/${file.id}`}
            className="block hover:bg-gray-50"
          >
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="font-medium text-primary-600 truncate">{file.name}</p>
                  <p className="mt-1 flex items-center text-sm text-gray-500">
                    {file.rowCount} lignes • {file.columns.length} colonnes
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex items-center">
                  {getStatusBadge(file.status)}
                  <ChevronRightIcon className="ml-2 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    Colonnes disponibles: {file.columns.slice(0, 3).join(', ')}{file.columns.length > 3 ? '...' : ''}
                  </p>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                  <p>
                    Importé le {formatDate(file.uploadedAt)}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default RecentFilesList;