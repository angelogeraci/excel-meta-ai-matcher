import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '@/services/authService';
import { User, AuthState, LoginCredentials, RegisterCredentials, UpdateProfileData } from '@/types/auth';

// Définir l'interface pour le contexte d'authentification
interface AuthContextProps {
  authState: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  loadUser: () => Promise<void>;
}

// Créer le contexte
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Hook personnalisé pour utiliser le contexte
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Composant Provider pour envelopper l'application
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null
  });

  // Charger l'utilisateur depuis le localStorage au montage du composant
  useEffect(() => {
    loadUser();
  }, []);

  // Fonction pour charger l'utilisateur
  const loadUser = async (): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      if (authService.isAuthenticated()) {
        // Si le token est présent, tenter de récupérer le profil de l'utilisateur
        try {
          const user = await authService.getProfile();
          setAuthState({
            isAuthenticated: true,
            user,
            loading: false,
            error: null
          });
        } catch (error) {
          // Si la récupération du profil échoue, déconnecter l'utilisateur
          console.error('Erreur lors du chargement de l\'utilisateur:', error);
          authService.logout();
          setAuthState({
            isAuthenticated: false,
            user: null,
            loading: false,
            error: 'Session expirée. Veuillez vous reconnecter.'
          });
        }
      } else {
        // Aucun token, l'utilisateur n'est pas connecté
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: 'Erreur lors du chargement de l\'utilisateur'
      });
    }
  };

  // Fonction de connexion
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const response = await authService.login(credentials);
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error.response?.data?.message || 'Erreur lors de la connexion'
      });
      throw error;
    }
  };

  // Fonction d'inscription
  const register = async (credentials: RegisterCredentials): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const response = await authService.register(credentials);
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false,
        error: error.response?.data?.message || 'Erreur lors de l\'inscription'
      });
      throw error;
    }
  };

  // Fonction de déconnexion
  const logout = (): void => {
    authService.logout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null
    });
  };

  // Fonction de mise à jour du profil
  const updateProfile = async (data: UpdateProfileData): Promise<void> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const updatedUser = await authService.updateProfile(data);
      setAuthState({
        isAuthenticated: true,
        user: updatedUser,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Erreur de mise à jour du profil:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Erreur lors de la mise à jour du profil'
      }));
      throw error;
    }
  };

  // Valeur du contexte à fournir
  const contextValue: AuthContextProps = {
    authState,
    login,
    register,
    logout,
    updateProfile,
    loadUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;