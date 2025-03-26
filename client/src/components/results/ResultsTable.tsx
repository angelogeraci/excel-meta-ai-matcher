import { useState, useMemo } from 'react';
import { useTable, useRowSelect, useSortBy, Column } from 'react-table';
import { MatchResult, MetaSuggestion } from '@/types';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';

interface ResultsTableProps {
  results: MatchResult[];
  selectedRows: string[];
  onRowsSelect: (rows: string[]) => void;
  onSuggestionChange: (resultId: string, suggestionId: string) => void;
}

// Composant pour la cellule de score avec code couleur
const ScoreCell = ({ value }: { value: number }) => {
  let scoreClass = '';
  if (value >= 90) {
    scoreClass = 'score-excellent';
  } else if (value >= 70) {
    scoreClass = 'score-good';
  } else if (value >= 50) {
    scoreClass = 'score-average';
  } else {
    scoreClass = 'score-poor';
  }
  
  return (
    <span className={`score-pill ${scoreClass}`}>
      {value}%
    </span>
  );
};

// Composant pour la cellule de sélection de suggestion
const SuggestionCell = ({ 
  value, 
  row, 
  onSuggestionChange 
}: { 
  value: MetaSuggestion, 
  row: { original: MatchResult }, 
  onSuggestionChange: (resultId: string, suggestionId: string) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const result = row.original;
  
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{value.value}</div>
          <div className="text-xs text-gray-500">
            Audience: {(value.audience.size / 1000000).toFixed(1)}M utilisateurs
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-500 hover:text-gray-700"
        >
          Modifier
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1 max-h-60 overflow-auto">
            {result.metaSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => {
                  onSuggestionChange(result.id, suggestion.id);
                  setIsOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-sm ${
                  suggestion.id === value.id
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{suggestion.value}</span>
                  {suggestion.score && <ScoreCell value={suggestion.score} />}
                </div>
                <div className="text-xs text-gray-500">
                  Audience: {(suggestion.audience.size / 1000000).toFixed(1)}M utilisateurs
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Composant checkbox personnalisé pour sélectionner les lignes
const IndeterminateCheckbox = ({ 
  indeterminate, 
  ...rest 
}: { 
  indeterminate?: boolean,
  [x: string]: any 
}) => {
  const ref = React.useRef<HTMLInputElement>(null);
  
  React.useEffect(() => {
    if (ref.current && typeof indeterminate === 'boolean') {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);
  
  return <input type="checkbox" ref={ref} className="form-checkbox" {...rest} />;
};

const ResultsTable = ({
  results,
  selectedRows,
  onRowsSelect,
  onSuggestionChange
}: ResultsTableProps) => {
  // Définir les colonnes du tableau
  const columns = useMemo<Column<MatchResult>[]>(
    () => [
      {
        id: 'selection',
        Header: ({ getToggleAllRowsSelectedProps }) => (
          <div>
            <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
          </div>
        ),
        Cell: ({ row }) => (
          <div>
            <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
          </div>
        ),
        disableSortBy: true
      },
      {
        Header: 'Mot-clé Original',
        accessor: 'originalValue',
        Cell: ({ value }) => <div className="font-medium">{value}</div>
      },
      {
        Header: 'Meilleure Suggestion',
        accessor: 'selectedSuggestion',
        Cell: ({ value, row }) => (
          <SuggestionCell 
            value={value} 
            row={row} 
            onSuggestionChange={onSuggestionChange} 
          />
        ),
        disableSortBy: true
      },
      {
        Header: 'Score',
        accessor: 'matchScore',
        Cell: ({ value }) => <ScoreCell value={value} />
      },
      {
        Header: 'Statut',
        accessor: 'status',
        Cell: ({ value }) => {
          let statusText = '';
          let statusClass = '';
          
          switch(value) {
            case 'processed':
              statusText = 'Traité';
              statusClass = 'badge-success';
              break;
            case 'pending':
              statusText = 'En attente';
              statusClass = 'badge-warning';
              break;
            case 'failed':
              statusText = 'Échec';
              statusClass = 'badge-error';
              break;
            default:
              statusText = value;
              statusClass = 'badge-info';
          }
          
          return <span className={`badge ${statusClass}`}>{statusText}</span>;
        }
      }
    ],
    [onSuggestionChange]
  );
  
  // Initialiser react-table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    selectedFlatRows,
    state: { selectedRowIds }
  } = useTable(
    {
      columns,
      data: results,
      initialState: {
        selectedRowIds: selectedRows.reduce((acc, id) => ({ ...acc, [id]: true }), {})
      }
    },
    useSortBy,
    useRowSelect
  );
  
  // Mettre à jour les lignes sélectionnées
  React.useEffect(() => {
    const selectedIds = selectedFlatRows.map(row => row.original.id);
    onRowsSelect(selectedIds);
  }, [selectedRowIds, selectedFlatRows, onRowsSelect]);
  
  return (
    <div className="table-container">
      <table {...getTableProps()} className="table">
        <thead className="table-header">
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  className="table-header-cell"
                >
                  <div className="flex items-center">
                    {column.render('Header')}
                    {column.canSort && (
                      <span className="ml-2">
                        {column.isSorted ? (
                          column.isSortedDesc ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronUpIcon className="h-4 w-4" />
                          )
                        ) : (
                          <div className="h-4 w-4 opacity-0 group-hover:opacity-100">
                            <ChevronUpIcon className="h-2 w-4" />
                            <ChevronDownIcon className="h-2 w-4" />
                          </div>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()} className="table-body">
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr
                {...row.getRowProps()}
                className={`table-row ${row.isSelected ? 'table-row-selected' : ''}`}
              >
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()} className="table-cell">
                    {cell.render('Cell')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ResultsTable;