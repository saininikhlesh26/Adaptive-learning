import { useState, useEffect } from 'react'
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Quiz from './pages/Quiz'
import { fetchProfile } from './api'

function App() {
  const [profile, setProfile] = useState(null)

  const loadProfile = () => {
    fetchProfile()
      .then(data => setProfile(data))
      .catch(err => console.error('Error fetching profile for navbar:', err))
  }

  useEffect(() => {
    loadProfile()
    
    // Listen for custom profile update events to sync in real-time
    window.addEventListener('profile-updated', loadProfile)
    return () => {
      window.removeEventListener('profile-updated', loadProfile)
    }
  }, [])

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              Adaptive Learning
            </Link>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/" className="nav-links">Home</Link>
              </li>
              <li className="nav-item">
                <Link to="/dashboard" className="nav-links">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link to="/quiz" className="nav-links">Quiz</Link>
              </li>
              <li className="nav-item">
                <Link to="/profile" className="nav-profile-badge">
                  <img 
                    src={profile?.avatar_url || "https://via.placeholder.com/32"} 
                    alt="Student avatar" 
                    className="nav-avatar" 
                  />
                  <span>{profile ? profile.first_name : "Profile"}</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2026 Adaptive Learning Platform. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
