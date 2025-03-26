import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import authService from '@/services/authService';
import { RegisterCredentials } from '@/types/auth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    name: '',
    email: '',
    password: '',
    organization: '',
    jobTitle: ''
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Mutation pour l'inscription
  const { mutate: register, isLoading } = useMutation(
    (data: RegisterCredentials) => authService.register(data),
    {
      onSuccess: () => {
        toast.success('Inscription réussie');
        navigate('/dashboard');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Erreur lors de l\'inscription');
      }
    }
  );
  
  // Gestion du changement des champs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setCredentials({
        ...credentials,
        [name]: value
      });
    }
  };
  
  // Soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier que les mots de passe correspondent
    if (credentials.password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    register(credentials);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer un nouveau compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              connectez-vous à votre compte existant
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">Nom complet</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Nom complet"
                value={credentials.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Adresse email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Adresse email"
                value={credentials.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="organization" className="sr-only">Organisation</label>
              <input
                id="organization"
                name="organization"
                type="text"
                autoComplete="organization"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Organisation (optionnel)"
                value={credentials.organization}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="jobTitle" className="sr-only">Fonction</label>
              <input
                id="jobTitle"
                name="jobTitle"
                type="text"
                autoComplete="organization-title"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Fonction (optionnel)"
                value={credentials.jobTitle}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={credentials.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirmer le mot de passe</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Inscription en cours...' : 'S\'inscrire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;