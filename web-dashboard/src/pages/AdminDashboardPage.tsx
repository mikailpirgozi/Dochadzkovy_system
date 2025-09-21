import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BulkOperationsManager } from '../components/admin/BulkOperationsManager';
import { AdvancedSearch } from '../components/admin/AdvancedSearch';
import { AdvancedReports } from '../components/admin/AdvancedReports';
import { 
  Users, 
  FileText, 
  Search,
  Upload,
  BarChart3,
  Shield,
  Zap
} from 'lucide-react';

type AdminView = 'overview' | 'bulk-operations' | 'advanced-search' | 'reports' | 'analytics';

export function AdminDashboardPage() {
  const [activeView, setActiveView] = useState<AdminView>('overview');

  const adminSections = [
    {
      id: 'bulk-operations' as AdminView,
      name: 'Bulk operácie',
      description: 'Hromadné importy, exporty a aktualizácie',
      icon: Upload,
      color: 'blue',
      stats: { pending: 2, completed: 15, failed: 1 }
    },
    {
      id: 'advanced-search' as AdminView,
      name: 'Pokročilé vyhľadávanie',
      description: 'Komplexné filtre a vyhľadávanie v dátach',
      icon: Search,
      color: 'green',
      stats: { filters: 12, savedSearches: 5, recentSearches: 8 }
    },
    {
      id: 'reports' as AdminView,
      name: 'Pokročilé reporty',
      description: 'Detailné reporty s AI insights a predpoveďami',
      icon: FileText,
      color: 'purple',
      stats: { templates: 6, generated: 23, scheduled: 4 }
    },
    {
      id: 'analytics' as AdminView,
      name: 'Advanced Analytics',
      description: 'AI-powered analytics a prediktívne modely',
      icon: BarChart3,
      color: 'orange',
      stats: { insights: 8, predictions: 3, anomalies: 1 }
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-600 bg-blue-100 border-blue-200 hover:bg-blue-50',
      green: 'text-green-600 bg-green-100 border-green-200 hover:bg-green-50',
      purple: 'text-purple-600 bg-purple-100 border-purple-200 hover:bg-purple-50',
      orange: 'text-orange-600 bg-orange-100 border-orange-200 hover:bg-orange-50',
      red: 'text-red-600 bg-red-100 border-red-200 hover:bg-red-50',
    };
    return colorMap[color] || colorMap.blue;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-blue-100">
              Pokročilé nástroje pre správu dochádzky a analytics
            </p>
          </div>
          <Shield className="h-16 w-16 text-blue-200" />
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktívne operácie</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uložené vyhľadávania</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <Search className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Generované reporty</p>
              <p className="text-2xl font-bold text-gray-900">47</p>
            </div>
            <FileText className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI insights</p>
              <p className="text-2xl font-bold text-gray-900">15</p>
            </div>
            <Zap className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map((section) => {
          const IconComponent = section.icon;
          
          return (
            <Card 
              key={section.id}
              className={`p-6 cursor-pointer transition-all duration-200 border-2 ${getColorClasses(section.color)}`}
              onClick={() => setActiveView(section.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${getColorClasses(section.color)}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{section.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  </div>
                </div>
              </div>

              {/* Section Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                {Object.entries(section.stats).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-lg font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500 capitalize">{key}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button variant="outline" className="w-full">
                  Otvoriť {section.name}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'bulk-operations':
        return <BulkOperationsManager />;
      case 'advanced-search':
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Button
                variant={activeView === 'advanced-search' ? 'default' : 'outline'}
                onClick={() => setActiveView('advanced-search')}
              >
                <Users className="h-4 w-4 mr-2" />
                Zamestnanci
              </Button>
              <span className="text-gray-400">|</span>
              <AdvancedSearch entityType="employees" />
            </div>
          </div>
        );
      case 'reports':
        return <AdvancedReports />;
      case 'analytics':
        return (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Advanced Analytics
            </h3>
            <p className="text-gray-600 mb-4">
              Pokročilé analytics sú dostupné na samostatnej stránke
            </p>
            <Button onClick={() => window.open('/advanced-analytics', '_blank')}>
              Otvoriť Advanced Analytics
            </Button>
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        {activeView !== 'overview' && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setActiveView('overview')}
              className="mb-4"
            >
              ← Späť na prehľad
            </Button>
            
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <span>Admin Dashboard</span>
              <span>/</span>
              <span className="font-medium">
                {adminSections.find(s => s.id === activeView)?.name || activeView}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}
