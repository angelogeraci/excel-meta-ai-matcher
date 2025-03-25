import { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  ArrowUpTrayIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';
import { ArrowRightIcon } from '@heroicons/react/20/solid';
import { ExcelFile } from '@/types';
import RecentFilesList from '@/components/dashboard/RecentFilesList';
import DashboardStats from '@/components/dashboard/DashboardStats';

// Simulons un service API (à remplacer par de vraies requêtes API)
const fetchRecentFiles = async (): Promise<ExcelFile[]> => {
  // Simulation d'une requête API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          name: 'campagne-facebook.xlsx',
          uploadedAt: '2025-03-20T10:30:00Z',
          columns: ['Campagne', 'Budget', 'Mots-clés', 'Audience'],
          rowCount: 145,
          status: 'completed'
        },
        {
          id: '2',
          name: 'mots-cles-marketing.xlsx',
          uploadedAt: '2025-03-19T08:15:00Z',
          columns: ['Catégorie', 'Mot-clé', 'Volume', 'Difficulté'],
          rowCount: 87,
          status: 'completed'
        },
        {
          id: '3',
          name: 'analyse-audience.xlsx',
          uploadedAt: '2025-03-18T15:45:00Z',
          columns: ['Segment', 'Age', 'Intérêt', 'Localisation'],
          rowCount: 212,
          status: 'processing'
        }
      ]);
    }, 500);
  });
};

const Dashboard = () => {
  const { data: recentFiles, isLoading } = useQuery('recentFiles', fetchRecentFiles);

  const stats = [
    { name: 'Fichiers traités', value: '15', icon: DocumentTextIcon, color: 'bg-blue-100 text-blue-800' },
    { name: 'Correspondances trouvées', value: '1,245', icon: CheckCircleIcon, color: 'bg-green-100 text-green-800' },
    { name: 'Score moyen', value: '87%', icon: ClockIcon, color: 'bg-yellow-100 text-yellow-800' }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="mt-1 text-sm text-gray-500">
            Aperçu de vos fichiers Excel et des correspondances avec Meta Marketing
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            to="/upload"
            className="btn btn-primary flex items-center"
          >
            <ArrowUpTrayIcon className="mr-2 h-5 w-5" aria-hidden="true" />
            Importer un fichier
          </Link>
        </div>
      </div>

      <DashboardStats stats={stats} />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Fichiers récents</h2>
          {/* Lien pour voir tous les fichiers, à implémenter plus tard si nécessaire */}
          <Link to="/upload" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center">
            Voir tous les fichiers
            <ArrowRightIcon className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="loading-spinner mx-auto" />
              <p className="mt-2 text-sm text-gray-500">Chargement des fichiers récents...</p>
            </div>
          ) : recentFiles && recentFiles.length > 0 ? (
            <RecentFilesList files={recentFiles} />
          ) : (
            <div className="p-6 text-center">
              <ExclamationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun fichier</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par importer un fichier Excel pour l'analyser.
              </p>
              <div className="mt-6">
                <Link to="/upload" className="btn btn-primary">
                  <ArrowUpTrayIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                  Importer un fichier
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;