import { useState } from 'react';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UpdateProfileData, UpdatePasswordData } from '@/types/auth';
import authService from '@/services/authService';

const ProfilePage = () => {
  const { authState, updateProfile, loadUser } = useAuth();
  const { user } = authState;
  
  // État pour les formulaires
  const [profileData, setProfileData] = useState<UpdateProfileData>({
    name: user?.name || '',
    email: user?.email || '',
    organization: user?.organization || '',
    jobTitle: user?.jobTitle || ''
  });
  
  const [passwordData, setPasswordData] = useState<UpdatePasswordData>({
    currentPassword: '',
    newPassword: ''
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Mutation pour la mise à jour du profil
  const { mutate: updateProfileMutation, isLoading: isUpdatingProfile } = useMutation(
    (data: UpdateProfileData) => updateProfile(data),
    {
      onSuccess: () => {
        toast.success('Profil mis à jour avec succès');
        loadUser(); // Recharger les données utilisateur
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du profil');
      }
    }
  );
  
  // Mutation pour la mise à jour du mot de passe
  const { mutate: updatePasswordMutation, isLoading: isUpdatingPassword } = useMutation(
    (data: UpdatePasswordData) => authService.updatePassword(data),
    {
      onSuccess: () => {
        toast.success('Mot de passe mis à jour avec succès');
        setPasswordData({
          currentPassword: '',
          newPassword: ''
        });
        setConfirmPassword('');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du mot de passe');
      }
    }
  );
  
  // Gestion du changement des champs du profil
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };
  
  // Gestion du changement des champs du mot de passe
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === 'confirmPassword') {
      setConfirmPassword(e.target.value);
    } else {
      setPasswordData({
        ...passwordData,
        [e.target.name]: e.target.value
      });
    }
  };
  
  // Soumission du formulaire de profil
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation(profileData);
  };
  
  // Soumission du formulaire de mot de passe
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier que les mots de passe correspondent
    if (passwordData.newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    updatePasswordMutation(passwordData);
  };
  
  // Formatage de la date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Jamais';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mon Profil</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Colonne de gauche - informations utilisateur */}
        <div className="md:col-span-1">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="bg-primary-100 text-primary-800 rounded-full w-16 h-16 flex items-center justify-center text-xl font-bold">
                {user.name.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Organisation:</span>
                <p className="font-medium">{user.organization || 'Non spécifiée'}</p>
              </div>
              <div>
                <span className="text-gray-500">Fonction:</span>
                <p className="font-medium">{user.jobTitle || 'Non spécifiée'}</p>
              </div>
              <div>
                <span className="text-gray-500">Rôle:</span>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <span className="text-gray-500">Dernière connexion:</span>
                <p className="font-medium">{formatDate(user.lastLogin)}</p>
              </div>
              <div>
                <span className="text-gray-500">Compte créé le:</span>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Colonne de droite - formulaires */}
        <div className="md:col-span-2 space-y-8">
          {/* Formulaire de modification du profil */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Modifier mes informations</h2>
            
            <form onSubmit={handleProfileSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    required
                    className="mt-1 form-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    required
                    className="mt-1 form-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                    Organisation
                  </label>
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    value={profileData.organization}
                    onChange={handleProfileChange}
                    className="mt-1 form-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                    Fonction
                  </label>
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    value={profileData.jobTitle}
                    onChange={handleProfileChange}
                    className="mt-1 form-input"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? 'Mise à jour...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Formulaire de modification du mot de passe */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Modifier mon mot de passe</h2>
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                    className="mt-1 form-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="mt-1 form-input"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="mt-1 form-input"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? 'Mise à jour...' : 'Modifier le mot de passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;