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

  const handleLearnMore = () => {
    if (isAuthenticated()) {
      navigate('/quiz')
    } else {
      navigate('/auth')
    }
  }

  return (
    <div className="page home-page">
      <section className="hero-section glass-card">
        <h1>Welcome to the Adaptive Learning Platform</h1>
        <p className="hero-desc">An intelligent student portal powered by ML classifiers that track engagement, reward partial knowledge, and recommend dynamic learning paths.</p>
        <div className="hero-buttons">
          <button className="btn btn-primary" onClick={handleGetStarted}>Get Started ⚡</button>
          <button className="btn btn-secondary" onClick={handleLearnMore}>Take Quizzes ❯</button>
        </div>
      </section>

      <section className="features-section">
        <h2>Key Platform Modules</h2>
        <div className="features-grid">
          <div className="feature-card glass-card">
            <span className="feat-icon">🎯</span>
            <h3>Real-Time ML Tracker</h3>
            <p>Analyzes your focus, mouse clicks, and inactivity rates to determine whether you are Focused, Struggling, or Bored.</p>
          </div>
          <div className="feature-card glass-card">
            <span className="feat-icon">⚡</span>
            <h3>Adaptive Quiz Helpers</h3>
            <p>Struggling students automatically unlock inline hints and details, while bored students get challenged with advanced content.</p>
          </div>
          <div className="feature-card glass-card">
            <span className="feat-icon">📊</span>
            <h3>Dynamic SVG Analytics</h3>
            <p>View your weekly progress metrics, subject area distributions, and performance trends using interactive, beautiful vector charts.</p>
          </div>
          <div className="feature-card glass-card">
            <span className="feat-icon">🏆</span>
            <h3>Competitions & Leaderboards</h3>
            <p>Participate in Daily, Weekly, and Subject challenges, earn experience points (XP) and badges, and rank on global leaderboards.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
