import { useState, useEffect } from 'react'
import { fetchDashboardStats } from '../api'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardStats()
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to fetch dashboard metrics. Is the API server online?')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="quiz-loader">
          <div className="spinner"></div>
          <p>Loading student learning metrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page dashboard-page">
        <h1>Learning Dashboard</h1>
        <div className="quiz-container error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={() => { setLoading(true); setError(null); fetchDashboardStats().then(data=>{setStats(data); setLoading(false);}).catch(err=>{setError(err.message); setLoading(false);}) }}>Retry</button>
        </div>
      </div>
    )
  }

  // Determine dynamic recommendation text based on engagement and score
  const getRecommendation = () => {
    if (!stats) return null
    if (stats.engagement_score < 70) {
      return {
        title: "Advanced React Design Patterns",
        difficulty: "Hard",
        desc: "Based on your high efficiency but low focus, we recommend a challenging topic to keep you engaged."
      }
    } else if (stats.average_score < 80) {
      return {
        title: "React Hooks Deep Dive",
        difficulty: "Medium",
        desc: "Review core functional components and state synchronization to improve your assessment scores."
      }
    } else {
      return {
        title: "Python FastAPI Fundamentals",
        difficulty: "Medium",
        desc: "Excellent overall performance! Explore backend systems integration to expand your full-stack capabilities."
      }
    }
  }

  const rec = getRecommendation()

  return (
    <div className="page dashboard-page">
      <h1>Learning Dashboard</h1>
      
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Lessons Completed</h3>
          <p className="stat-value">{stats.lessons_completed}</p>
        </div>
        <div className="stat-card">
          <h3>Current Streak</h3>
          <p className="stat-value">{stats.streak_days} days</p>
        </div>
        <div className="stat-card">
          <h3>Engagement Score</h3>
          <p className="stat-value">{stats.engagement_score}%</p>
        </div>
        <div className="stat-card">
          <h3>Average Score</h3>
          <p className="stat-value">{stats.average_score}%</p>
        </div>
      </div>

      <section className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {stats.recent_activity.map((activity, index) => (
            <div key={index} className="activity-item">
              <div className="activity-header">
                <h4>{activity.title}</h4>
                <span className={`activity-badge ${activity.engagement?.toLowerCase() || 'focused'}`}>
                  {activity.engagement || 'Focused'}
                </span>
              </div>
              <p>{activity.description}</p>
            </div>
          ))}
        </div>
      </section>

      {rec && (
        <section className="recommendations">
          <h2>Recommended Next</h2>
          <div className="recommendation-card">
            <div className="rec-header">
              <h3>{rec.title}</h3>
              <span className={`difficulty-badge ${rec.difficulty.toLowerCase()}`}>{rec.difficulty}</span>
            </div>
            <p>{rec.desc}</p>
            <a href="/quiz" className="btn btn-primary">Start Learning</a>
          </div>
        </section>
      )}
    </div>
  )
}

export default Dashboard
