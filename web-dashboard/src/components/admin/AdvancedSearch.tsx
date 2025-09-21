import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { AdvancedSearchService, type AdvancedFilter, type AdvancedSearch as AdvancedSearchType } from '../../lib/bulk-operations';
import { 
  Search, 
  Plus, 
  Trash2, 
  Download,
  Users,
  Clock,
  SortAsc,
  SortDesc,
  Settings
} from 'lucide-react';

interface AdvancedSearchProps {
  entityType: 'employees' | 'attendance';
  onResults?: (results: any[]) => void;
  className?: string;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ 
  entityType, 
  onResults,
  className = '' 
}) => {
  const [filters, setFilters] = useState<AdvancedFilter[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const availableFilters = AdvancedSearchService.getAvailableFilters(entityType);

  const addFilter = () => {
    setFilters([...filters, {
      field: availableFilters[0].field,
      operator: 'equals',
      value: '',
      logicalOperator: filters.length > 0 ? 'AND' : undefined
    }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<AdvancedFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const executeSearch = async () => {
    try {
      setLoading(true);
      
      const searchParams: AdvancedSearchType = {
        filters,
        sortBy: sortBy || undefined,
        sortOrder,
        pagination: {
          page: currentPage,
          pageSize
        }
      };

      let searchResults;
      if (entityType === 'employees') {
        searchResults = await AdvancedSearchService.searchEmployees(searchParams);
      } else {
        searchResults = await AdvancedSearchService.searchAttendance(searchParams);
      }

      setResults(searchResults.results);
      setTotalCount(searchResults.totalCount);
      
      if (onResults) {
        onResults(searchResults.results);
      }
    } catch (error) {
      console.error('Error executing search:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters([]);
    setResults([]);
    setTotalCount(0);
    setCurrentPage(1);
  };

  const exportResults = () => {
    // TODO: Implement export functionality
    console.log('Exporting search results...');
  };

  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'string':
        return [
          { value: 'equals', label: 'Rovná sa' },
          { value: 'contains', label: 'Obsahuje' },
          { value: 'starts_with', label: 'Začína s' },
          { value: 'ends_with', label: 'Končí s' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Rovná sa' },
          { value: 'greater_than', label: 'Väčšie ako' },
          { value: 'less_than', label: 'Menšie ako' },
          { value: 'between', label: 'Medzi' }
        ];
      case 'date':
        return [
          { value: 'equals', label: 'Presný dátum' },
          { value: 'greater_than', label: 'Po dátume' },
          { value: 'less_than', label: 'Pred dátumom' },
          { value: 'between', label: 'Medzi dátumami' }
        ];
      case 'boolean':
        return [
          { value: 'equals', label: 'Je' }
        ];
      case 'select':
        return [
          { value: 'equals', label: 'Rovná sa' },
          { value: 'in', label: 'Je v zozname' },
          { value: 'not_in', label: 'Nie je v zozname' }
        ];
      default:
        return [{ value: 'equals', label: 'Rovná sa' }];
    }
  };

  const renderFilterValue = (filter: AdvancedFilter, index: number) => {
    const field = availableFilters.find(f => f.field === filter.field);
    
    if (field?.type === 'select' && field.options) {
      return (
        <select
          value={filter.value}
          onChange={(e) => updateFilter(index, { value: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Vyberte...</option>
          {field.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    
    if (field?.type === 'boolean') {
      return (
        <select
          value={filter.value}
          onChange={(e) => updateFilter(index, { value: e.target.value === 'true' })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">Vyberte...</option>
          <option value="true">Áno</option>
          <option value="false">Nie</option>
        </select>
      );
    }
    
    if (field?.type === 'date') {
      return (
        <input
          type="date"
          value={filter.value}
          onChange={(e) => updateFilter(index, { value: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      );
    }
    
    return (
      <input
        type={field?.type === 'number' ? 'number' : 'text'}
        value={filter.value}
        onChange={(e) => updateFilter(index, { value: e.target.value })}
        placeholder="Zadajte hodnotu..."
        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
      />
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Builder */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Pokročilé vyhľadávanie</h3>
            <p className="text-sm text-gray-600">
              {entityType === 'employees' ? 'Vyhľadávanie zamestnancov' : 'Vyhľadávanie dochádzky'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={addFilter} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Pridať filter
            </Button>
            {filters.length > 0 && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Vymazať
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {filters.length > 0 && (
          <div className="space-y-3 mb-6">
            {filters.map((filter, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {index > 0 && (
                  <select
                    value={filter.logicalOperator}
                    onChange={(e) => updateFilter(index, { logicalOperator: e.target.value as 'AND' | 'OR' })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="AND">A</option>
                    <option value="OR">ALEBO</option>
                  </select>
                )}
                
                <select
                  value={filter.field}
                  onChange={(e) => updateFilter(index, { field: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {availableFilters.map(field => (
                    <option key={field.field} value={field.field}>
                      {field.label}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {getOperatorOptions(availableFilters.find(f => f.field === filter.field)?.type || 'string').map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                
                {renderFilterValue(filter, index)}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeFilter(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Search Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Zoradiť podľa:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Bez zoradenia</option>
                {availableFilters.map(field => (
                  <option key={field.field} value={field.field}>
                    {field.label}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Počet na stránku:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={executeSearch} disabled={loading}>
              <Search className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Vyhľadať
            </Button>
            
            {results.length > 0 && (
              <Button variant="outline" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Výsledky vyhľadávania ({totalCount})
            </h3>
            <div className="flex items-center space-x-2">
              {entityType === 'employees' ? (
                <Users className="h-5 w-5 text-gray-400" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {entityType === 'employees' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Meno
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pozícia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oddelenie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Zamestnanec
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Typ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dátum a čas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Poloha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QR overené
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Akcie
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.slice(0, pageSize).map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {entityType === 'employees' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.firstName} {item.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.position || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.department || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.isActive ? 'Aktívny' : 'Neaktívny'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.user?.firstName} {item.user?.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.timestamp).toLocaleString('sk-SK')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.location ? `${item.location.latitude?.toFixed(4)}, ${item.location.longitude?.toFixed(4)}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.qrVerified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.qrVerified ? 'Overené' : 'Neoverené'}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Zobrazených {Math.min(pageSize, results.length)} z {totalCount} výsledkov
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Predchádzajúca
                </Button>
                <span className="text-sm text-gray-600">
                  Stránka {currentPage} z {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                >
                  Nasledujúca
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

