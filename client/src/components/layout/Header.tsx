import { Bars3Icon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={onMenuClick}
          >
            <span className="sr-only">Ouvrir le menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <div className="flex items-center flex-shrink-0 ml-4 md:ml-0">
            <span className="block h-8 w-auto text-2xl font-bold text-metaBlue">
              Excel <span className="text-metaGreen">Meta</span> AI Matcher
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          <span className="text-sm text-gray-500">
            Propulsé par l'API Meta Marketing et l'IA
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;