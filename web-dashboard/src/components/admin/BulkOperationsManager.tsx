import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { BulkOperationsService, type BulkOperation } from '../../lib/bulk-operations';
import { 
  Upload, 
  Download, 
  Calendar, 
  CheckSquare, 
  XSquare,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  FileText,
  Filter
} from 'lucide-react';

interface BulkOperationsManagerProps {
  className?: string;
}

export const BulkOperationsManager: React.FC<BulkOperationsManagerProps> = ({ className = '' }) => {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [loading, setLoading] = useState(true);
  // const [selectedOperation] = useState<string | null>(null);
  // const [showImportModal] = useState(false);

  useEffect(() => {
    loadOperations();
    
    // Set up polling for active operations
    const interval = setInterval(() => {
      const activeOperations = operations.filter(op => 
        op.status === 'processing' || op.status === 'pending'
      );
      
      if (activeOperations.length > 0) {
        loadOperations();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [operations]);

  const loadOperations = async () => {
    try {
      setLoading(true);
      const ops = await BulkOperationsService.getBulkOperations();
      setOperations(ops);
    } catch (error) {
      console.error('Error loading operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'import': return Upload;
      case 'export': return Download;
      case 'update': return Calendar;
      case 'approve': return CheckSquare;
      case 'reject': return XSquare;
      case 'delete': return Trash2;
      default: return FileText;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'failed': return AlertCircle;
      case 'processing': return RefreshCw;
      case 'pending': return Clock;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Dokončené';
      case 'failed': return 'Zlyhalo';
      case 'processing': return 'Spracováva sa';
      case 'pending': return 'Čaká';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'import': return 'Import';
      case 'export': return 'Export';
      case 'update': return 'Aktualizácia';
      case 'approve': return 'Schválenie';
      case 'reject': return 'Zamietnutie';
      case 'delete': return 'Vymazanie';
      default: return type;
    }
  };

  const handleCancelOperation = async (operationId: string) => {
    try {
      await BulkOperationsService.cancelBulkOperation(operationId);
      await loadOperations();
    } catch (error) {
      console.error('Error canceling operation:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      alert('Podporované sú len CSV súbory');
      return;
    }

    try {
      const text = await file.text();
      const validation = BulkOperationsService.validateEmployeeCSV(text);
      
      if (!validation.isValid) {
        alert(`CSV súbor obsahuje chyby:\n${validation.errors.join('\n')}`);
        return;
      }

      // Show import preview/confirmation modal
      // setShowImportModal(true);
      
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Nepodarilo sa načítať súbor');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bulk operácie</h2>
          <p className="text-gray-600 mt-1">Spravujte hromadné operácie a importy</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={loadOperations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Obnoviť
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Import zamestnancov</h3>
              <p className="text-sm text-gray-600 mt-1">CSV súbor</p>
            </div>
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="block w-full text-center py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Vybrať súbor
            </label>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Export reportov</h3>
              <p className="text-sm text-gray-600 mt-1">Excel/CSV</p>
            </div>
            <Download className="h-8 w-8 text-green-600" />
          </div>
          <Button className="w-full mt-4" variant="outline">
            Exportovať
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Hromadné rozvrhy</h3>
              <p className="text-sm text-gray-600 mt-1">Zmeny pre viacerých</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
          <Button className="w-full mt-4" variant="outline">
            Spravovať
          </Button>
        </Card>

        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Schvaľovanie opráv</h3>
              <p className="text-sm text-gray-600 mt-1">Hromadné schválenie</p>
            </div>
            <CheckSquare className="h-8 w-8 text-orange-600" />
          </div>
          <Button className="w-full mt-4" variant="outline">
            Spracovať
          </Button>
        </Card>
      </div>

      {/* Operations History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">História operácií</h3>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select className="text-sm border border-gray-300 rounded px-3 py-1">
              <option value="all">Všetky operácie</option>
              <option value="import">Importy</option>
              <option value="export">Exporty</option>
              <option value="update">Aktualizácie</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : operations.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Žiadne bulk operácie</p>
          </div>
        ) : (
          <div className="space-y-3">
            {operations.map((operation) => {
              const OperationIcon = getOperationIcon(operation.type);
              const StatusIcon = getStatusIcon(operation.status);
              
              return (
                <div key={operation.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <OperationIcon className="h-5 w-5 text-gray-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {getTypeLabel(operation.type)} #{operation.id.slice(-8)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {operation.processedItems}/{operation.totalItems} spracovaných
                          {operation.failedItems > 0 && (
                            <span className="text-red-600 ml-2">
                              ({operation.failedItems} zlyhalo)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(operation.status)}`}>
                        <StatusIcon className={`h-4 w-4 mr-1 ${operation.status === 'processing' ? 'animate-spin' : ''}`} />
                        {getStatusLabel(operation.status)}
                      </div>
                      
                      {operation.status === 'processing' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelOperation(operation.id)}
                        >
                          Zrušiť
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {operation.status === 'processing' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progres</span>
                        <span>{operation.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${operation.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Operation Details */}
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Vytvorené:</span>
                      <span>{new Date(operation.createdAt).toLocaleString('sk-SK')}</span>
                    </div>
                    {operation.completedAt && (
                      <div className="flex justify-between">
                        <span>Dokončené:</span>
                        <span>{new Date(operation.completedAt).toLocaleString('sk-SK')}</span>
                      </div>
                    )}
                    {operation.error && (
                      <div className="text-red-600 mt-2">
                        Chyba: {operation.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
