export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  organization?: string;
  jobTitle?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  organization?: string;
  jobTitle?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  organization?: string;
  jobTitle?: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}
