import axios from 'axios';
import Cookies from 'js-cookie';
import { LoginCredentials, RegisterCredentials, AuthResponse, User, UpdateProfileData, UpdatePasswordData } from '@/types/auth';

// Définir la base URL de l'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Configurer axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Service qui gère l'authentification
 */
class AuthService {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    this._handleAuthResponse(response.data);
    return response.data;
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    this._handleAuthResponse(response.data);
    return response.data;
  }

  /**
   * Déconnexion de l'utilisateur
   */
  logout(): void {
    Cookies.remove('token');
    localStorage.removeItem('user');
    // Dans une application réelle, vous pourriez également faire une requête au backend
    // pour invalider le token côté serveur
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    return !!Cookies.get('token');
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Obtenir le profil de l'utilisateur
   */
  async getProfile(): Promise<User> {
    const response = await api.get<{ success: boolean; data: User }>('/auth/me');
    return response.data.data;
  }

  /**
   * Mettre à jour le profil de l'utilisateur
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await api.put<{ success: boolean; data: User }>('/auth/me', data);
    const user = response.data.data;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  /**
   * Mettre à jour le mot de passe de l'utilisateur
   */
  async updatePassword(data: UpdatePasswordData): Promise<void> {
    await api.put('/auth/password', data);
  }

  /**
   * Gérer la réponse d'authentification
   */
  private _handleAuthResponse(data: AuthResponse): void {
    if (data.token) {
      Cookies.set('token', data.token, { expires: 30 }); // Expire dans 30 jours
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  }
}

export default new AuthService();

// Exporter l'instance d'API pour être utilisée par d'autres services
export { api };