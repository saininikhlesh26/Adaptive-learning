import { useNavigate } from 'react-router-dom'
import { isAuthenticated } from '../api'

function Home() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    if (isAuthenticated()) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  const handleExploreSubjects = () => {
    if (isAuthenticated()) {
      navigate('/subjects')
    } else {
      navigate('/auth')
    }
  }

  return (
    <div className="page home-page">
      {/* Premium Hero Section */}
      <section className="hero-section">
        <div className="hero-left">
          <span className="hero-badge">AI-Powered EdTech</span>
          <h1 className="hero-title">Adaptive Learning Platform</h1>
          <p className="hero-subtitle">
            AI-powered personalized learning, quiz practice, performance tracking, and smart recommendations.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-hero-primary" onClick={handleGetStarted}>
              Get Started
            </button>
            <button className="btn btn-secondary btn-hero-secondary" onClick={handleExploreSubjects}>
              Explore Subjects
            </button>
          </div>
        </div>
        
        <div className="hero-right">
          {/* Professional education illustration using clean, premium inline SVG */}
          <svg className="hero-svg" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background elements */}
            <circle cx="250" cy="200" r="160" fill="url(#hero-grad-bg)" opacity="0.4" />
            <circle cx="250" cy="200" r="120" fill="none" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="6 6" />
            
            {/* Main Board/Screen */}
            <rect x="90" y="80" width="320" height="220" rx="16" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="4" />
            <rect x="90" y="80" width="320" height="40" rx="16" fill="#F8FAFC" />
            <circle cx="120" cy="100" r="6" fill="#EF4444" />
            <circle cx="140" cy="100" r="6" fill="#F59E0B" />
            <circle cx="160" cy="100" r="6" fill="#10B981" />
            
            {/* Content Mockups */}
            {/* Left sidebar card */}
            <rect x="110" y="140" width="80" height="130" rx="8" fill="#F8FAFC" />
            <rect x="120" y="160" width="60" height="8" rx="4" fill="#E2E8F0" />
            <rect x="120" y="180" width="40" height="8" rx="4" fill="#E2E8F0" />
            <rect x="120" y="200" width="50" height="8" rx="4" fill="#E2E8F0" />
            <rect x="120" y="230" width="60" height="24" rx="6" fill="#4F46E5" opacity="0.15" />
            
            {/* Main chart card */}
            <rect x="205" y="140" width="185" height="130" rx="8" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="2" />
            
            {/* SVG mini chart representation */}
            <path d="M 220 230 L 250 200 L 280 220 L 310 170 L 340 190 L 370 150" fill="none" stroke="url(#hero-grad-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="370" cy="150" r="5" fill="#7C3AED" />
            
            {/* Mini Stat Card */}
            <rect x="290" y="210" width="90" height="50" rx="8" fill="#FFFFFF" filter="drop-shadow(0px 8px 16px rgba(15, 23, 42, 0.08))" />
            <rect x="300" y="222" width="40" height="6" rx="3" fill="#94A3B8" />
            <rect x="300" y="236" width="60" height="12" rx="4" fill="#10B981" opacity="0.2" />
            <text x="304" y="245" fill="#047857" fontSize="8" fontWeight="bold">94% Score</text>
            
            {/* Floating badges around illustration */}
            <g transform="translate(60, 260)">
              <rect width="90" height="36" rx="10" fill="#FFFFFF" filter="drop-shadow(0px 6px 12px rgba(79, 70, 229, 0.12))" />
              <text x="12" y="22" fill="#4F46E5" fontSize="11" fontWeight="bold">🤖 AI Recommended</text>
            </g>
            
            <g transform="translate(320, 60)">
              <rect width="110" height="36" rx="10" fill="#FFFFFF" filter="drop-shadow(0px 6px 12px rgba(124, 58, 237, 0.12))" />
              <text x="12" y="22" fill="#7C3AED" fontSize="11" fontWeight="bold">📈 Focus Tracker</text>
            </g>
            
            {/* Definitions for Gradients */}
            <defs>
              <linearGradient id="hero-grad-bg" x1="90" y1="80" x2="410" y2="300" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="hero-grad-accent" x1="220" y1="230" x2="370" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <h2 className="section-title">Key Platform Modules</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feat-icon-box orange">🎯</span>
            <h3>Real-Time ML Tracker</h3>
            <p>Analyzes your focus, mouse clicks, and inactivity rates to determine whether you are Focused, Struggling, or Bored.</p>
          </div>
          <div className="feature-card">
            <span className="feat-icon-box purple">⚡</span>
            <h3>Adaptive Quiz Helpers</h3>
            <p>Struggling students automatically unlock inline hints and details, while bored students get challenged with advanced content.</p>
          </div>
          <div className="feature-card">
            <span className="feat-icon-box blue">📊</span>
            <h3>Dynamic SVG Analytics</h3>
            <p>View your weekly progress metrics, subject area distributions, and performance trends using interactive, beautiful vector charts.</p>
          </div>
          <div className="feature-card">
            <span className="feat-icon-box indigo">🏆</span>
            <h3>Competitions & Challenges</h3>
            <p>Participate in Daily, Weekly, and Subject challenges, earn experience points (XP) and badges, and rank on global leaderboards.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
