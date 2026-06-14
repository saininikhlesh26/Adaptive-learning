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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
    const timer = setTimeout(() => {
      syncAuth()
    }, 0)
    window.addEventListener('profile-updated', loadProfile)
    return () => {
      window.removeEventListener('profile-updated', loadProfile)
      clearTimeout(timer)
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileMenuOpen(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [location.pathname])

  const handleLogoutClick = async () => {
    await logout()
    syncAuth()
  }

  const isActive = (path) => location.pathname === path ? 'active-link' : ''

  return (
    <div className="app-container">
      {/* Sticky Premium Navbar */}
      <header className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Adaptive AI</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-menu-desktop">
            <Link to="/" className={`nav-link ${isActive('/')}`}>Home</Link>
            {authState && (
              <>
                <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
                <Link to="/subjects" className={`nav-link ${isActive('/subjects')}`}>Subjects</Link>
                <Link to="/quiz" className={`nav-link ${isActive('/quiz')}`}>Quizzes</Link>
                <Link to="/competitions" className={`nav-link ${isActive('/competitions')}`}>Competitions</Link>
                <Link to="/reports" className={`nav-link ${isActive('/reports')}`}>Reports</Link>
                <Link to="/timetable" className={`nav-link ${isActive('/timetable')}`}>Timetable</Link>
                <Link to="/profile" className={`nav-link ${isActive('/profile')}`}>Profile</Link>
                {profile?.role === 'admin' && (
                  <Link to="/admin" className={`nav-link admin-nav-link ${isActive('/admin')}`}>Admin</Link>
                )}
              </>
            )}
          </nav>

          {/* Auth Action Buttons */}
          <div className="nav-actions-desktop">
            {authState ? (
              <div className="nav-profile-group">
                <Link to="/profile" className="nav-profile-trigger">
                  <img 
                    src={profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                    alt="Profile" 
                    className="nav-avatar" 
                  />
                  <span className="nav-username">{profile ? `${profile.first_name}` : 'Student'}</span>
                </Link>
                <button className="btn btn-secondary btn-nav-logout" onClick={handleLogoutClick}>
                  Sign Out
                </button>
              </div>
            ) : (
              <Link to="/auth" className="btn btn-primary nav-login-btn">
                Login / Register
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button 
            className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <nav className="mobile-nav-links">
            <Link to="/" className={`mobile-nav-link ${isActive('/')}`}>Home</Link>
            {authState ? (
              <>
                <Link to="/dashboard" className={`mobile-nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
                <Link to="/subjects" className={`mobile-nav-link ${isActive('/subjects')}`}>Subjects</Link>
                <Link to="/quiz" className={`mobile-nav-link ${isActive('/quiz')}`}>Quizzes</Link>
                <Link to="/competitions" className={`mobile-nav-link ${isActive('/competitions')}`}>Competitions</Link>
                <Link to="/reports" className={`mobile-nav-link ${isActive('/reports')}`}>Reports</Link>
                <Link to="/timetable" className={`mobile-nav-link ${isActive('/timetable')}`}>Timetable</Link>
                <Link to="/profile" className={`mobile-nav-link ${isActive('/profile')}`}>Profile</Link>
                {profile?.role === 'admin' && (
                  <Link to="/admin" className={`mobile-nav-link ${isActive('/admin')}`}>Admin Panel</Link>
                )}
                <div className="mobile-drawer-footer">
                  <div className="mobile-profile-info">
                    <img 
                      src={profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                      alt="Profile" 
                      className="nav-avatar" 
                    />
                    <span>{profile ? `${profile.first_name} ${profile.last_name}` : 'Student'}</span>
                  </div>
                  <button className="btn btn-secondary btn-mobile-logout" onClick={handleLogoutClick}>
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="mobile-drawer-auth">
                <Link to="/auth" className="btn btn-primary mobile-login-btn">
                  Login / Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="content-wrapper">
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

        <footer className="footer">
          <div className="footer-container">
            <p>&copy; 2026 Adaptive Learning Platform. All rights reserved.</p>
          </div>
        </footer>
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
