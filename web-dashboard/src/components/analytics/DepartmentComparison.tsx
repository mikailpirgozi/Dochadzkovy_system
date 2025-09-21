import React from 'react';
import { Card } from '../ui/card';
import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface Department {
  departmentId: string;
  departmentName: string;
  averageHours: number;
  productivityScore: number;
  attendanceRate: number;
  overtimePercentage: number;
  employeeCount: number;
}

interface DepartmentComparisonProps {
  departments: Department[];
  className?: string;
}

export const DepartmentComparison: React.FC<DepartmentComparisonProps> = ({ 
  departments, 
  className = '' 
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getOvertimeColor = (percentage: number) => {
    if (percentage <= 5) return 'text-green-600';
    if (percentage <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBestPerformer = () => {
    return departments.reduce((best, current) => 
      current.productivityScore > best.productivityScore ? current : best
    );
  };

  const getWorstPerformer = () => {
    return departments.reduce((worst, current) => 
      current.productivityScore < worst.productivityScore ? current : worst
    );
  };

  if (departments.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Žiadne údaje o oddeleniach</p>
        </div>
      </Card>
    );
  }

  const bestPerformer = getBestPerformer();
  const worstPerformer = getWorstPerformer();

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Porovnanie oddelení</h3>
          <p className="text-sm text-gray-600">Výkonnosť a efektivita podľa oddelení</p>
        </div>
        <Users className="h-5 w-5 text-gray-400" />
      </div>

      {/* Department Cards */}
      <div className="space-y-4 mb-6">
        {departments.map((dept) => (
          <div key={dept.departmentId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{dept.departmentName}</h4>
                <p className="text-sm text-gray-600">{dept.employeeCount} zamestnancov</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(dept.productivityScore)}`}>
                {dept.productivityScore}% produktivita
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-lg font-bold text-gray-900">
                    {dept.averageHours.toFixed(1)}h
                  </span>
                </div>
                <div className="text-xs text-gray-500">Priemerné hodiny</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-lg font-bold text-gray-900">
                    {dept.attendanceRate}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">Dochádzka</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <AlertTriangle className={`h-4 w-4 mr-1 ${getOvertimeColor(dept.overtimePercentage)}`} />
                  <span className={`text-lg font-bold ${getOvertimeColor(dept.overtimePercentage)}`}>
                    {dept.overtimePercentage}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">Nadčasy</div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-lg font-bold text-gray-900">
                    {dept.employeeCount}
                  </span>
                </div>
                <div className="text-xs text-gray-500">Ľudia</div>
              </div>
            </div>

            {/* Progress Bar for Productivity */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Produktivita</span>
                <span>{dept.productivityScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    dept.productivityScore >= 90 ? 'bg-green-500' :
                    dept.productivityScore >= 75 ? 'bg-blue-500' :
                    dept.productivityScore >= 60 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${dept.productivityScore}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center mb-2">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            <h5 className="font-semibold text-green-800">Najlepšie oddelenie</h5>
          </div>
          <p className="text-green-700">
            <strong>{bestPerformer.departmentName}</strong> s produktivitou {bestPerformer.productivityScore}%
          </p>
          <p className="text-sm text-green-600 mt-1">
            Priemerné hodiny: {bestPerformer.averageHours.toFixed(1)}h • 
            Dochádzka: {bestPerformer.attendanceRate}%
          </p>
        </div>

        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h5 className="font-semibold text-red-800">Potrebuje pozornosť</h5>
          </div>
          <p className="text-red-700">
            <strong>{worstPerformer.departmentName}</strong> s produktivitou {worstPerformer.productivityScore}%
          </p>
          <p className="text-sm text-red-600 mt-1">
            Nadčasy: {worstPerformer.overtimePercentage}% • 
            Odporučenie: Optimalizácia procesov
          </p>
        </div>
      </div>

      {/* Department Ranking */}
      <div className="mt-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Rebríček oddelení</h4>
        <div className="space-y-2">
          {departments
            .sort((a, b) => b.productivityScore - a.productivityScore)
            .map((dept, index) => (
              <div key={dept.departmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-800' :
                    index === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{dept.departmentName}</span>
                    <div className="text-sm text-gray-600">
                      {dept.employeeCount} ľudí • {dept.averageHours.toFixed(1)}h priemer
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{dept.productivityScore}%</div>
                  <div className={`text-sm ${getOvertimeColor(dept.overtimePercentage)}`}>
                    {dept.overtimePercentage}% nadčasy
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </Card>
  );
};
