import { useState } from 'react';
import { RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';

interface ColumnSelectorProps {
  columns: string[];
  onSelect: (columnName: string) => void;
}

const ColumnSelector = ({ columns, onSelect }: ColumnSelectorProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (columnName: string) => {
    setSelected(columnName);
  };

  const handleSubmit = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Sélectionnez la colonne qui contient les critères/mots-clés à faire correspondre avec l'API Meta Marketing.
        Cette colonne sera utilisée pour générer des suggestions pertinentes.
      </p>

      <RadioGroup value={selected} onChange={handleSelect} className="mt-2">
        <RadioGroup.Label className="sr-only">
          Choisissez une colonne
        </RadioGroup.Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {columns.map((column) => (
            <RadioGroup.Option
              key={column}
              value={column}
              className={({ active, checked }) =>
                `${
                  active
                    ? 'ring-2 ring-primary-500 ring-offset-2'
                    : ''
                }
                ${
                  checked
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }
                relative flex cursor-pointer rounded-lg border px-5 py-4 shadow-sm focus:outline-none`
              }
            >
              {({ active, checked }) => (
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <div className="text-sm">
                      <RadioGroup.Label
                        as="p"
                        className={`font-medium ${
                          checked ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {column}
                      </RadioGroup.Label>
                    </div>
                  </div>
                  {checked && (
                    <div className="shrink-0 text-white">
                      <CheckCircleIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
              )}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected}
          className="btn btn-primary"
        >
          Analyser cette colonne
        </button>
      </div>
    </div>
  );
};

export default ColumnSelector;