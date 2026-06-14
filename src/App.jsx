import { useState, useEffect, lazy, Suspense } from 'react'
import { Link, Route, BrowserRouter as Router, Routes, Navigate, useLocation } from 'react-router-dom'
import './App.css'
import { fetchProfile, isAuthenticated, logout } from './api'

// Lazy load pages for performance optimization
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Profile = lazy(() => import('./pages/Profile'))
const Subjects = lazy(() => import('./pages/Subjects'))
const Competitions = lazy(() => import('./pages/Competitions'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Auth = lazy(() => import('./pages/Auth'))
const WeeklyReports = lazy(() => import('./pages/WeeklyReports'))
const Timetable = lazy(() => import('./pages/Timetable'))


// Protected Route Wrapper
const ProtectedRoute = ({ children, authState }) => {
  return authState ? children : <Navigate to="/auth" replace />
}

// Admin Route Wrapper
const AdminRoute = ({ children, authState, profile }) => {
  if (!authState) return <Navigate to="/auth" replace />
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function MainAppContent() {
  const [authState, setAuthState] = useState(isAuthenticated())
  const [profile, setProfile] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()

  const syncAuth = () => {
    const authed = isAuthenticated()
    setAuthState(authed)
    if (authed) {
      loadProfile()
    } else {
      setProfile(null)
    }
  }

  const loadProfile = () => {
    fetchProfile()
      .then(data => setProfile(data))
      .catch(err => console.error('Error fetching profile for navigation:', err))
  }

  useEffect(() => {
    syncAuth()
    window.addEventListener('profile-updated', loadProfile)
    return () => {
      window.removeEventListener('profile-updated', loadProfile)
    }
  }, [])

  const handleLogoutClick = async () => {
    await logout()
    syncAuth()
  }

  const isActive = (path) => location.pathname === path ? 'active-link' : ''

  // Don't show sidebar on landing page (/) or auth page (/auth)
  const showSidebar = authState && location.pathname !== '/' && location.pathname !== '/auth'

  return (
    <div className={`app-container ${showSidebar ? 'has-sidebar' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {showSidebar && (
        <aside className="sidebar glass-card">
          <div className="sidebar-header">
            <Link to="/dashboard" className="sidebar-logo">
              <span className="logo-icon">⚡</span>
              <span className="logo-text">Adaptive AI</span>
            </Link>
            <button 
              className="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title="Toggle Sidebar"
            >
              {sidebarCollapsed ? '❯' : '❮'}
            </button>
          </div>

          <nav className="sidebar-menu">
            <Link to="/dashboard" className={`menu-item ${isActive('/dashboard')}`}>
              <span className="menu-icon">📊</span>
              <span className="menu-text">Dashboard</span>
            </Link>
            <Link to="/subjects" className={`menu-item ${isActive('/subjects')}`}>
              <span className="menu-icon">📚</span>
              <span className="menu-text">Subjects Catalog</span>
            </Link>
            <Link to="/quiz" className={`menu-item ${isActive('/quiz')}`}>
              <span className="menu-icon">📝</span>
              <span className="menu-text">Assessments</span>
            </Link>
            <Link to="/competitions" className={`menu-item ${isActive('/competitions')}`}>
              <span className="menu-icon">🏆</span>
              <span className="menu-text">Competitions</span>
            </Link>
            <Link to="/timetable" className={`menu-item ${isActive('/timetable')}`}>
              <span className="menu-icon">📅</span>
              <span className="menu-text">Study Planner</span>
            </Link>
            <Link to="/reports" className={`menu-item ${isActive('/reports')}`}>
              <span className="menu-icon">📈</span>
              <span className="menu-text">Weekly Reports</span>
            </Link>
            <Link to="/profile" className={`menu-item ${isActive('/profile')}`}>
              <span className="menu-icon">👤</span>
              <span className="menu-text">Student Profile</span>
            </Link>
            
            {profile?.role === 'admin' && (
              <Link to="/admin" className={`menu-item admin-menu-item ${isActive('/admin')}`}>
                <span className="menu-icon">⚙️</span>
                <span className="menu-text">Admin Panel</span>
              </Link>
            )}
          </nav>

          <div className="sidebar-footer">
            <Link to="/profile" className="sidebar-profile-card">
              <img 
                src={profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                alt="User avatar" 
                className="sidebar-avatar" 
              />
              <div className="sidebar-user-info">
                <p className="sidebar-username">{profile ? `${profile.first_name} ${profile.last_name.charAt(0)}.` : 'Loading...'}</p>
                <span className="sidebar-user-role">{profile?.role === 'admin' ? 'Administrator' : 'Student'}</span>
              </div>
            </Link>
            <button className="btn btn-secondary btn-logout" onClick={handleLogoutClick} title="Logout">
              <span className="logout-icon">🚪</span>
              <span className="menu-text">Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main content wrapper */}
      <div className="content-wrapper">
        {!showSidebar && (
          <nav className="navbar glass-card">
            <div className="nav-container">
              <Link to="/" className="nav-logo">
                Adaptive Quiz Platform
              </Link>
              <div className="nav-actions">
                {authState ? (
                  <>
                    <Link to="/dashboard" className="btn btn-secondary nav-btn-dash">Dashboard</Link>
                    <button className="btn btn-primary nav-btn-out" onClick={handleLogoutClick}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <Link to="/" className="nav-links">Home</Link>
                    <Link to="/auth" className="btn btn-primary nav-btn-in">Get Started</Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}

        <main className="main-content">
          <Suspense fallback={
            <div className="suspense-loader">
              <div className="spinner"></div>
              <p>Loading application resources...</p>
            </div>
          }>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth onAuthSuccess={syncAuth} />} />

              {/* Protected Student Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute authState={authState}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/subjects" element={
                <ProtectedRoute authState={authState}>
                  <Subjects />
                </ProtectedRoute>
              } />
              <Route path="/quiz" element={
                <ProtectedRoute authState={authState}>
                  <Quiz />
                </ProtectedRoute>
              } />
              <Route path="/competitions" element={
                <ProtectedRoute authState={authState}>
                  <Competitions />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute authState={authState}>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/timetable" element={
                <ProtectedRoute authState={authState}>
                  <Timetable />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute authState={authState}>
                  <WeeklyReports />
                </ProtectedRoute>
              } />

              {/* Protected Admin Routes */}
              <Route path="/admin" element={
                <AdminRoute authState={authState} profile={profile}>
                  <AdminPanel />
                </AdminRoute>
              } />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to={authState ? "/dashboard" : "/"} replace />} />
            </Routes>
          </Suspense>
        </main>

        {!showSidebar && (
          <footer className="footer">
            <p>&copy; 2026 Adaptive Learning Platform. All rights reserved.</p>
          </footer>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <MainAppContent />
    </Router>
  )
}

export default App
