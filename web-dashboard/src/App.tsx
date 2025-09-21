import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './components/layout/dashboard-layout'
import { DashboardPage } from './pages/DashboardPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { LiveMapPage } from './pages/LiveMapPage'
import { ReportsPage } from './pages/ReportsPage'
import { AlertsPage } from './pages/AlertsPage'
import { SettingsPage } from './pages/SettingsPage'
import { AdvancedAnalyticsPage } from './pages/AdvancedAnalyticsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AuthGuard } from './components/auth/AuthGuard'
import { ErrorBoundary } from './components/ui/error-boundary'
import { setAuthData, getAuthData } from './lib/utils'
import api from './lib/api'

// Login Component
function LoginPage() {
  const [formData, setFormData] = useState({
    companySlug: 'test-firma',
    email: 'admin@test.sk',
    password: 'admin123'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check if already logged in
  useEffect(() => {
    const authData = getAuthData()
    if (authData) {
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password,
        companySlug: formData.companySlug,
      }, {
        headers: {
          'x-company-slug': formData.companySlug,
        }
      })

      const data = response.data

      if (data.success) {
        // Use the new auth utility functions
        setAuthData(data.data.tokens.accessToken, data.data.user, formData.companySlug)
        setIsLoggedIn(true)
      } else {
        setError(data.error || 'Prihlásenie zlyhalo')
      }
    } catch (err: unknown) {
      let errorMessage = 'Chyba pripojenia k serveru'
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        errorMessage = axiosError.response?.data?.error || errorMessage
      }
      setError(errorMessage)
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">📱 Dochádzka Pro</h1>
          <p className="text-gray-600 mt-2">Admin Dashboard</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Slug
            </label>
            <input
              type="text"
              value={formData.companySlug}
              onChange={(e) => setFormData({ ...formData, companySlug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="test-firma"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@test.sk"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-600 text-center">
          <p>Test credentials už sú vyplnené ↑</p>
        </div>
      </div>
    </div>
  )
}


function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <DashboardPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/statistics" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <StatisticsPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/employees" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <EmployeesPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/live-map" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <LiveMapPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/reports" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <ReportsPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/alerts" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <AlertsPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/settings" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/advanced-analytics" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <AdvancedAnalyticsPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="/admin" element={
          <AuthGuard>
            <DashboardLayout>
              <ErrorBoundary>
                <AdminDashboardPage />
              </ErrorBoundary>
            </DashboardLayout>
          </AuthGuard>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App