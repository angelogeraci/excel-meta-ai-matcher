import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivateRoute from '@/components/auth/PrivateRoute';

// Pages publiques
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Pages protégées
import Dashboard from '@/pages/Dashboard';
import UploadPage from '@/pages/UploadPage';
import ResultsPage from '@/pages/ResultsPage';
import ProfilePage from '@/pages/auth/ProfilePage';
import VisualizationsPage from '@/pages/visualizations/VisualizationsPage';

// Composants de mise en page
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Routes protégées avec layout */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <Header onMenuClick={() => setSidebarOpen(true)} />
                  <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/upload" element={<UploadPage />} />
                      <Route path="/results/:fileId" element={<ResultsPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/visualizations/:fileId" element={<VisualizationsPage />} />
                      <Route path="/visualizations" element={<VisualizationsPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </PrivateRoute>
          } 
        />
        
        {/* Redirection pour toutes les autres routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;