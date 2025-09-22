import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Filter } from 'lucide-react';
import { getStatusColor, getStatusText } from '../lib/utils';
import { dashboardApi } from '../lib/api';
import { apiCache } from '../lib/cache';
import { useDebounce } from '../hooks/useDebounce';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  currentStatus: string;
  lastSeen?: string;
  workingHours?: number;
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'EMPLOYEE',
    password: ''
  });
  const [editEmployee, setEditEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'EMPLOYEE'
  });

  const fetchEmployees = useCallback(async () => {
    console.log('🔄 Fetching employees...');
    try {
      const response = await dashboardApi.getEmployees();
      console.log('✅ API Response:', response);
      console.log('📊 Response structure:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        // Map backend response to frontend interface
        const mappedEmployees = response.data.users.map((user: Record<string, unknown>) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          currentStatus: user.currentAttendanceStatus || 'CLOCKED_OUT',
          lastSeen: user.lastEventTime || user.updatedAt,
          workingHours: 0 // Will be calculated from attendance events
        }));
        console.log('👥 Mapped employees:', mappedEmployees);
        setEmployees(mappedEmployees);
      } else {
        console.warn('⚠️ Invalid response format:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      // Show error to user
      alert('Chyba pri načítavaní zamestnancov: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch function to prevent excessive API calls
  const debouncedFetchEmployees = useDebounce(fetchEmployees, 500);

  useEffect(() => {
    fetchEmployees();
    
    // Auto-refresh every 2 minutes (reduced from 30 seconds)
    const interval = setInterval(debouncedFetchEmployees, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [debouncedFetchEmployees]);

  const handleAddEmployee = async () => {
    try {
      const response = await dashboardApi.createEmployee(newEmployee);
      
      if (response.success) {
        // Add new employee to the list
        const createdEmployee = {
          id: response.data.id,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          role: response.data.role,
          isActive: response.data.isActive,
          currentStatus: response.data.isActive ? 'CLOCKED_OUT' : 'inactive',
          lastSeen: response.data.createdAt,
          workingHours: 0
        };
        
        setEmployees([...employees, createdEmployee]);
        setShowAddModal(false);
        setNewEmployee({
          firstName: '',
          lastName: '',
          email: '',
          role: 'EMPLOYEE',
          password: ''
        });
        
        // Invalidate cache to refresh employee list
        apiCache.delete('employees');
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Neznáma chyba';
      alert('Chyba pri vytváraní zamestnanca: ' + errorMessage);
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditEmployee({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;
    
    try {
      const response = await dashboardApi.updateEmployee(editingEmployee.id, editEmployee);
      
      if (response.success) {
        // Update employee in the list
        setEmployees(employees.map(emp => 
          emp.id === editingEmployee.id 
            ? {
                ...emp,
                firstName: response.data.firstName,
                lastName: response.data.lastName,
                email: response.data.email,
                role: response.data.role
              }
            : emp
        ));
        setShowEditModal(false);
        setEditingEmployee(null);
        
        // Invalidate cache to refresh employee list
        apiCache.delete('employees');
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Neznáma chyba';
      alert('Chyba pri aktualizácii zamestnanca: ' + errorMessage);
    }
  };

  const handleDeactivateEmployee = async (employee: Employee) => {
    if (!confirm(`Naozaj chcete deaktivovať zamestnanca ${employee.firstName} ${employee.lastName}?`)) {
      return;
    }
    
    try {
      const response = await dashboardApi.updateEmployee(employee.id, { isActive: false });
      
      if (response.success) {
        // Update employee status in the list
        setEmployees(employees.map(emp => 
          emp.id === employee.id 
            ? {
                ...emp,
                isActive: false,
                currentStatus: 'inactive'
              }
            : emp
        ));
        
        // Invalidate cache to refresh employee list
        apiCache.delete('employees');
      }
    } catch (error) {
      console.error('Error deactivating employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Neznáma chyba';
      alert('Chyba pri deaktivácii zamestnanca: ' + errorMessage);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || employee.currentStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zamestnanci</h1>
          <p className="text-gray-600">Spravujte používateľov a ich oprávnenia</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Pridať zamestnanca
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Hľadať zamestnancov..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Všetci</option>
                <option value="CLOCKED_IN">V práci</option>
                <option value="CLOCKED_OUT">Mimo práce</option>
                <option value="ON_BREAK">Na obede</option>
                <option value="BUSINESS_TRIP">Služobná cesta</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Zoznam zamestnancov ({filteredEmployees.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zamestnanec
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pozícia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Posledná aktivita
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hodiny dnes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcie
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(employee.currentStatus)}`}>
                      {getStatusText(employee.currentStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.lastSeen ? new Date(employee.lastSeen).toLocaleString('sk-SK') : 'Nikdy'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.workingHours ? `${employee.workingHours.toFixed(1)}h` : '0h'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditEmployee(employee)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Upraviť
                    </button>
                    <button 
                      onClick={() => handleDeactivateEmployee(employee)}
                      className="text-red-600 hover:text-red-900"
                      disabled={!employee.isActive}
                    >
                      {employee.isActive ? 'Deaktivovať' : 'Deaktivovaný'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Žiadni zamestnanci</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Žiadni zamestnanci nevyhovujú filtrom.'
                  : 'Začnite pridaním prvého zamestnanca.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pridať nového zamestnanca</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meno</label>
                  <input
                    type="text"
                    value={newEmployee.firstName}
                    onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Zadajte meno"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priezvisko</label>
                  <input
                    type="text"
                    value={newEmployee.lastName}
                    onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Zadajte priezvisko"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Zadajte email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Heslo</label>
                  <input
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Zadajte heslo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rola</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EMPLOYEE">Zamestnanec</option>
                    <option value="COMPANY_ADMIN">Administrátor</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleAddEmployee}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Pridať
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upraviť zamestnanca</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meno</label>
                  <input
                    type="text"
                    value={editEmployee.firstName}
                    onChange={(e) => setEditEmployee({...editEmployee, firstName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priezvisko</label>
                  <input
                    type="text"
                    value={editEmployee.lastName}
                    onChange={(e) => setEditEmployee({...editEmployee, lastName: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editEmployee.email}
                    onChange={(e) => setEditEmployee({...editEmployee, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rola</label>
                  <select
                    value={editEmployee.role}
                    onChange={(e) => setEditEmployee({...editEmployee, role: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EMPLOYEE">Zamestnanec</option>
                    <option value="COMPANY_ADMIN">Administrátor</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Zrušiť
                </button>
                <button
                  onClick={handleUpdateEmployee}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Uložiť
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
