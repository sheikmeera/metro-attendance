import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { BottomNav } from './components/BottomNav'
import { Toast } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginPage } from './pages/LoginPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminLogs } from './pages/AdminLogs'
import { AdminEmployees } from './pages/AdminEmployees'
import { AdminSites } from './pages/AdminSites'
import { AdminEmployeeDetail } from './pages/AdminEmployeeDetail'
import { SiteDetail } from './pages/SiteDetail'
import { UserDashboard } from './pages/UserDashboard'
import { UserHistory } from './pages/UserHistory'
import { UserReport } from './pages/UserReport'
import { UserSites } from './pages/UserSites'
import { Settings } from './pages/Settings'

export default function App() {
  const { currentUser, toast, sidebarCollapsed } = useApp()

  if (!currentUser) {
    return (
      <div className="layout-auth">
        <LoginPage />
        {toast && <Toast message={toast.message} type={toast.type} />}
      </div>
    )
  }

  const isEmployee = currentUser.role !== 'admin'

  return (
    <div className={`layout${isEmployee ? ' employee-view' : ''}`}>
      <Sidebar />
      {toast && <Toast message={toast.message} type={toast.type} />}
      <main className={`main-content${sidebarCollapsed ? ' sidebar-collapsed' : ''}${isEmployee ? ' has-bottom-nav' : ''}`}>
        <Routes>
          {currentUser.role === 'admin' ? (
            <>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/attendance" element={<AdminLogs />} />
              <Route path="/sites" element={<AdminSites />} />
              <Route path="/sites/:id" element={<SiteDetail />} />
              <Route path="/employees" element={<AdminEmployees />} />
              <Route path="/employees/:id" element={<AdminEmployeeDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          ) : (
            <>
              <Route path="/" element={<UserDashboard />} />
              <Route path="/report" element={<UserReport />} />
              <Route path="/history" element={<UserHistory />} />
              <Route path="/sites" element={<UserSites />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
      </main>
      {isEmployee && <BottomNav />}
    </div>
  )
}
