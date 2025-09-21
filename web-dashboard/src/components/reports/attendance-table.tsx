import { Clock, User, Mail, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EmployeeReport } from '@/lib/types';
// import { formatTime, formatDuration } from '@/lib/utils';

interface AttendanceTableProps {
  data: EmployeeReport[];
  isLoading?: boolean;
}

export function AttendanceTable({ data, isLoading }: AttendanceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Žiadne dáta pre vybraté obdobie
            </h3>
            <p className="text-gray-500">
              Zmeňte dátumový rozsah alebo skontrolujte, či majú zamestnanci záznamy dochádzky.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPunctualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getHoursColor = (hours: number, average: number) => {
    if (hours > average) return 'text-green-600';
    if (hours < average * 0.8) return 'text-red-600';
    return 'text-gray-900';
  };

  const averageHours = data.length > 0 
    ? data.reduce((sum, emp) => sum + emp.totalHours, 0) / data.length 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          Prehľad zamestnancov ({data.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zamestnanec
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Celkové hodiny
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pracovné dni
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priemer/deň
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Punktualita
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Udalosti
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.name}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${getHoursColor(employee.totalHours, averageHours)}`}>
                        {employee.totalHours.toFixed(1)}h
                      </span>
                      {employee.totalHours > averageHours ? (
                        <TrendingUp className="h-4 w-4 ml-1 text-green-500" />
                      ) : employee.totalHours < averageHours * 0.8 ? (
                        <TrendingDown className="h-4 w-4 ml-1 text-red-500" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.workingDays}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.averageHoursPerDay.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getPunctualityColor(employee.punctualityScore)}>
                      {employee.punctualityScore.toFixed(0)}%
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.events.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(1)}h
              </div>
              <div className="text-gray-500">Celkové hodiny</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {averageHours.toFixed(1)}h
              </div>
              <div className="text-gray-500">Priemer na zamestnanca</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.reduce((sum, emp) => sum + emp.workingDays, 0)}
              </div>
              <div className="text-gray-500">Celkové pracovné dni</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.length > 0 
                  ? (data.reduce((sum, emp) => sum + emp.punctualityScore, 0) / data.length).toFixed(0)
                  : 0}%
              </div>
              <div className="text-gray-500">Priemerná punktualita</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
