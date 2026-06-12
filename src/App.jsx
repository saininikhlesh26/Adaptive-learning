import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import './App.css'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Quiz from './pages/Quiz'

function App() {
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
                <Link to="/profile" className="nav-links">Profile</Link>
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
