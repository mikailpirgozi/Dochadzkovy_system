import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { 
  FileText, 
  Download, 
  Users, 
  Clock,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Filter,
  Settings,
  Mail,
  Printer
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'attendance' | 'productivity' | 'costs' | 'compliance' | 'custom';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  estimatedTime: string;
  features: string[];
}

interface AdvancedReportsProps {
  className?: string;
}

export const AdvancedReports: React.FC<AdvancedReportsProps> = ({ className = '' }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [reportConfig] = useState<Record<string, unknown>>({});
  const [generating, setGenerating] = useState(false);

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'detailed_attendance',
      name: 'Detailný dochádzka report',
      description: 'Kompletný prehľad dochádzky s GPS súradnicami, prestávkami a nadčasmi',
      type: 'attendance',
      icon: Clock,
      color: 'blue',
      estimatedTime: '2-5 min',
      features: [
        'GPS súradnice všetkých udalostí',
        'Analýza prestávok a nadčasov',
        'Geofence violations',
        'Časové rozdiely medzi udalosťami',
        'Export do Excel s grafmi'
      ]
    },
    {
      id: 'productivity_analysis',
      name: 'Analýza produktivity',
      description: 'Pokročilá analýza výkonnosti zamestnancov a tímov',
      type: 'productivity',
      icon: TrendingUp,
      color: 'green',
      estimatedTime: '3-7 min',
      features: [
        'Produktivita podľa hodín/dní/mesiacov',
        'Porovnanie medzi oddeleniami',
        'Trendy a predpovede',
        'Benchmarking vs priemer odvetvia',
        'Odporúčania na zlepšenie'
      ]
    },
    {
      id: 'cost_breakdown',
      name: 'Detailná analýza nákladov',
      description: 'Kompletný breakdown nákladov na pracovnú silu s optimalizačnými návrhmi',
      type: 'costs',
      icon: DollarSign,
      color: 'yellow',
      estimatedTime: '1-3 min',
      features: [
        'Náklady na základné mzdy vs nadčasy',
        'Náklady na oddelenie/projekt',
        'ROI analýza produktivity',
        'Predpoveď budúcich nákladov',
        'Optimalizačné príležitosti'
      ]
    },
    {
      id: 'compliance_audit',
      name: 'Compliance audit report',
      description: 'Audit dodržiavania pracovných zákonov a firemných pravidiel',
      type: 'compliance',
      icon: FileText,
      color: 'red',
      estimatedTime: '5-10 min',
      features: [
        'Kontrola dodržiavania pracovného času',
        'Analýza prestávok podľa zákonov',
        'Overtime compliance check',
        'Geofence violations audit',
        'Regulatory compliance report'
      ]
    },
    {
      id: 'employee_performance',
      name: 'Individuálne výkonnostné reporty',
      description: 'Detailné reporty pre každého zamestnanca osobne',
      type: 'productivity',
      icon: Users,
      color: 'purple',
      estimatedTime: '1-2 min/osoba',
      features: [
        'Osobné produktivitné metriky',
        'Porovnanie s tímovým priemerom',
        'Trendy dochádzky a výkonnosti',
        'Personalizované odporúčania',
        'Goal tracking a achievements'
      ]
    },
    {
      id: 'custom_report',
      name: 'Vlastný report',
      description: 'Vytvorte si vlastný report podľa vašich potrieb',
      type: 'custom',
      icon: Settings,
      color: 'gray',
      estimatedTime: 'Závisí od konfigurácie',
      features: [
        'Vlastné filtre a kritériá',
        'Konfigurovateľné stĺpce',
        'Vlastné výpočty a agregácie',
        'Scheduled reports',
        'Email delivery'
      ]
    }
  ];

  const handleGenerateReport = async (templateId: string) => {
    try {
      setGenerating(true);
      setSelectedTemplate(templateId);
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would call the API
      console.log('Generating report:', templateId, reportConfig);
      
      // Simulate download
      alert('Report bol vygenerovaný a stiahnutý!');
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Chyba pri generovaní reportu');
    } finally {
      setGenerating(false);
      setSelectedTemplate(null);
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-600 bg-blue-100 border-blue-200',
      green: 'text-green-600 bg-green-100 border-green-200',
      yellow: 'text-yellow-600 bg-yellow-100 border-yellow-200',
      red: 'text-red-600 bg-red-100 border-red-200',
      purple: 'text-purple-600 bg-purple-100 border-purple-200',
      gray: 'text-gray-600 bg-gray-100 border-gray-200',
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pokročilé reporty</h2>
          <p className="text-gray-600 mt-1">Generujte detailné reporty a analýzy</p>
        </div>
      </div>

      {/* Report Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTemplates.map((template) => {
          const IconComponent = template.icon;
          const isGenerating = generating && selectedTemplate === template.id;
          
          return (
            <Card key={template.id} className={`p-6 hover:shadow-lg transition-all duration-200 border-2 ${getColorClasses(template.color)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${getColorClasses(template.color)}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Funkcie:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {template.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <div className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                      {feature}
                    </li>
                  ))}
                  {template.features.length > 3 && (
                    <li className="text-xs text-gray-500">
                      +{template.features.length - 3} ďalších funkcií
                    </li>
                  )}
                </ul>
              </div>

              {/* Generation Time */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>Čas generovania:</span>
                <span className="font-medium">{template.estimatedTime}</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  onClick={() => handleGenerateReport(template.id)}
                  disabled={generating}
                  className="w-full"
                  variant={template.type === 'custom' ? 'outline' : 'default'}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generuje sa...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {template.type === 'custom' ? 'Konfigurovať' : 'Generovať'}
                    </>
                  )}
                </Button>

                {template.type !== 'custom' && (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Printer className="h-4 w-4 mr-1" />
                      Tlač
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Reports */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Nedávne reporty</h3>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="space-y-3">
          {/* Simulated recent reports */}
          {[
            { name: 'Dochádzka report - Október 2024', type: 'attendance', date: '2024-11-01', size: '2.4 MB' },
            { name: 'Produktivita analýza - Q3 2024', type: 'productivity', date: '2024-10-15', size: '1.8 MB' },
            { name: 'Nákladová analýza - September', type: 'costs', date: '2024-10-01', size: '956 KB' },
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">{report.name}</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(report.date).toLocaleDateString('sk-SK')} • {report.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
