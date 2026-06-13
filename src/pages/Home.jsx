import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/dashboard')
  }

  const handleLearnMore = () => {
    navigate('/quiz')
  }

  return (
    <div className="page home-page">
      <section className="hero-section">
        <h1>Welcome to Adaptive Learning</h1>
        <p>An intelligent learning platform that adapts to your pace</p>
        <div className="hero-buttons">
          <button className="btn btn-primary" onClick={handleGetStarted}>Get Started</button>
          <button className="btn btn-secondary" onClick={handleLearnMore}>Learn More</button>
        </div>
      </section>

      <section className="features-section">
        <h2>Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Adaptive Content</h3>
            <p>Content adjusts to your learning pace and style</p>
          </div>
          <div className="feature-card">
            <h3>Engagement Tracking</h3>
            <p>Real-time monitoring of your engagement levels</p>
          </div>
          <div className="feature-card">
            <h3>Smart Recommendations</h3>
            <p>Personalized learning path recommendations</p>
          </div>
          <div className="feature-card">
            <h3>Progress Analytics</h3>
            <p>Detailed analytics and performance insights</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
