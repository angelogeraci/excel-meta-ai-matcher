import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PrivateRouteProps {
  children: ReactNode;
}

/**
 * Composant de route protégée qui vérifie si l'utilisateur est authentifié
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 */
const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { authState, loadUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authState.user && !authState.loading) {
      loadUser();
    }
  }, [authState.user, authState.loading]);

  // Afficher un indicateur de chargement pendant la vérification de l'authentification
  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Rediriger vers la page de connexion si l'utilisateur n'est pas authentifié
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Afficher le contenu protégé si l'utilisateur est authentifié
  return <>{children}</>;
};

export default PrivateRoute;