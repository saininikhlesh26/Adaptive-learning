import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboardStats, fetchProfile, fetchRecommendations, fetchSubjects } from '../api'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [bookmarkedSubjects, setBookmarkedSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = () => {
    setLoading(true)
    setError(null)

    Promise.all([
      fetchProfile(),
      fetchDashboardStats(),
      fetchRecommendations().catch(() => null),
      fetchSubjects().catch(() => [])
    ])
      .then(([profileData, statsData, recData, subjectsData]) => {
        setProfile(profileData)
        setStats(statsData)
        setRecommendations(recData)
        
        // Filter bookmarked subjects from catalog
        const bookmarked = subjectsData.filter(s => s.is_bookmarked)
        setBookmarkedSubjects(bookmarked)
        
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to fetch dashboard metrics. Is the API server online?')
        setLoading(false)
      })
  }

  // --- SKELETON LOADERS RENDERING (Phase 1) ---
  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="dashboard-header-container">
          <div className="skeleton-bar skeleton-title skeleton-animated"></div>
          <div className="skeleton-bar skeleton-subtitle skeleton-animated"></div>
        </div>

        <div className="dashboard-grid">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="stat-card skeleton-card skeleton-animated" style={{ height: '100px' }}></div>
          ))}
        </div>

        <div className="dashboard-charts-row">
          <div className="chart-card glass-card skeleton-card skeleton-animated" style={{ height: '280px' }}></div>
          <div className="chart-card glass-card skeleton-card skeleton-animated" style={{ height: '280px' }}></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page dashboard-page">
        <div className="dashboard-header-container">
          <h1>Learning Dashboard</h1>
        </div>
        <div className="quiz-container error-container glass-card">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={loadDashboardData}>Retry</button>
        </div>
      </div>
    )
  }

  // --- SVG CHART GENERATORS ---

  // 1. Weekly Progress (Bar Chart)
  const renderWeeklyBarChart = () => {
    const data = stats.weekly_progress || []
    if (data.length === 0) return <p className="text-muted">No weekly progress data available.</p>

    const width = 450
    const height = 200
    const padding = 30
    const chartHeight = height - padding * 2
    const chartWidth = width - padding * 2

    const maxVal = Math.max(...data.map(d => d.completed), 3) // minimum scale height of 3
    const barWidth = 32
    const spacing = (chartWidth - barWidth * data.length) / (data.length - 1)

    return (
      <svg className="custom-svg-chart" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 1, 2, 3].map(i => {
          const y = padding + (chartHeight / 3) * i
          const label = Math.round(maxVal - (maxVal / 3) * i)
          return (
            <g key={i}>
              <line 
                x1={padding} 
                y1={y} 
                x2={width - padding} 
                y2={y} 
                className="chart-grid-line"
              />
              <text x={padding - 10} y={y + 4} className="chart-axis-text axis-y">{label}</text>
            </g>
          )
        })}

        {/* Vertical Bars */}
        {data.map((d, idx) => {
          const x = padding + idx * (barWidth + spacing)
          const barHeight = d.completed > 0 ? (d.completed / maxVal) * chartHeight : 4
          const y = height - padding - barHeight
          
          return (
            <g key={idx} className="chart-bar-group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                className={`chart-bar-rect ${d.completed > 0 ? 'active-bar' : 'empty-bar'}`}
              />
              {d.completed > 0 && (
                <text x={x + barWidth/2} y={y - 6} className="chart-bar-val">{d.completed}</text>
              )}
              <text x={x + barWidth/2} y={height - padding + 15} className="chart-axis-text axis-x">{d.day}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  // 2. Subject Performance (Polar / Radar Area Chart)
  const renderSubjectRadarChart = () => {
    const data = stats.subject_progress || []
    if (data.length === 0) return <p className="text-muted">No subject scores recorded yet.</p>

    const cx = 110
    const cy = 110
    const rMax = 70
    const size = 220
    const numPoints = data.length

    // Helper to compute coordinates
    const getCoordinates = (index, value) => {
      const angle = (index * 2 * Math.PI) / numPoints - Math.PI / 2
      const x = cx + rMax * (value / 100) * Math.cos(angle)
      const y = cy + rMax * (value / 100) * Math.sin(angle)
      return { x, y }
    }

    // Grid webs (Concentric circles/polygons)
    const grids = [0.25, 0.5, 0.75, 1.0].map((scale, gIdx) => {
      const points = data.map((_, idx) => {
        const coords = getCoordinates(idx, scale * 100)
        return `${coords.x},${coords.y}`
      }).join(' ')
      return <polygon key={gIdx} points={points} className="radar-grid-polygon" />
    })

    // Spokes and labels
    const spokes = data.map((d, idx) => {
      const outer = getCoordinates(idx, 100)
      const labelPos = getCoordinates(idx, 120) // push labels further out
      const align = labelPos.x < cx ? 'end' : (labelPos.x > cx ? 'start' : 'middle')
      
      return (
        <g key={idx}>
          <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} className="radar-spoke" />
          <text 
            x={labelPos.x} 
            y={labelPos.y + 4} 
            textAnchor={align}
            className="radar-label-text"
          >
            {d.subject.length > 12 ? `${d.subject.slice(0, 10)}...` : d.subject}
          </text>
        </g>
      )
    })

    // Filled score shape
    const scorePoints = data.map((d, idx) => {
      // Use average score if completed > 0, else a small baseline
      const score = d.completed > 0 ? d.avg_score : 20
      const coords = getCoordinates(idx, score)
      return `${coords.x},${coords.y}`
    }).join(' ')

    return (
      <svg className="custom-svg-chart radar-chart" viewBox={`0 0 ${size} ${size}`}>
        {grids}
        {spokes}
        {scorePoints && (
          <polygon points={scorePoints} className="radar-score-polygon" />
        )}
        {/* Draw dots at vertices */}
        {data.map((d, idx) => {
          const score = d.completed > 0 ? d.avg_score : 20
          const coords = getCoordinates(idx, score)
          return (
            <circle 
              key={idx} 
              cx={coords.x} 
              cy={coords.y} 
              r={4} 
              className="radar-score-dot"
              title={`${d.subject}: ${score}%`}
            />
          )
        })}
      </svg>
    )
  }

  // 3. Engagement Trends (Bezier Line Graph)
  const renderEngagementTrendsChart = () => {
    const data = stats.performance_trends || []
    if (data.length === 0) {
      return (
        <div className="empty-trends-box">
          <p className="text-muted">Take a few quizzes to start compiling your score trends.</p>
        </div>
      )
    }

    const width = 450
    const height = 200
    const padding = 35
    const chartHeight = height - padding * 2
    const chartWidth = width - padding * 2

    // Plot coordinates
    const points = data.map((d, idx) => {
      const x = padding + (chartWidth / Math.max(data.length - 1, 1)) * idx
      const y = height - padding - (d.score / 100) * chartHeight
      return { x, y, score: d.score, label: d.quiz_title, eng: d.engagement }
    })

    // Build SVG Path
    let pathD = ''
    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y} `
      for (let i = 1; i < points.length; i++) {
        // Linear segments (simplest for pure SVG compatibility)
        pathD += `L ${points[i].x} ${points[i].y} `
      }
    }

    return (
      <svg className="custom-svg-chart line-chart" viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal grids */}
        {[0, 25, 50, 75, 100].map((yVal, i) => {
          const y = height - padding - (yVal / 100) * chartHeight
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" />
              <text x={padding - 8} y={y + 4} className="chart-axis-text axis-y">{yVal}%</text>
            </g>
          )
        })}

        {/* Trend line */}
        {pathD && (
          <path d={pathD} className="trend-line-path" />
        )}

        {/* Nodes and tooltip labels */}
        {points.map((pt, idx) => (
          <g key={idx} className="line-node-group">
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r={5} 
              className={`trend-node-circle ${pt.eng?.toLowerCase() || 'focused'}`}
            />
            {/* Draw brief index underneath */}
            <text x={pt.x} y={height - padding + 15} className="chart-axis-text axis-x">#{idx + 1}</text>
            
            {/* Floating text values on top of node */}
            <text x={pt.x} y={pt.y - 10} className="chart-node-label-val">{Math.round(pt.score)}%</text>
          </g>
        ))}
      </svg>
    )
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-header-container">
        <h1>Welcome Back, {profile?.first_name || "Student"}!</h1>
        <p className="dashboard-subtitle">
          {profile?.role === 'admin' 
            ? 'Administrator account overview panel.' 
            : `Track your study streak, review weak areas, and unlock recommended guides.`
          }
        </p>

        {profile && (
          <div className="profile-quick-stats">
            <span className="profile-quick-badge">
              🎯 <strong>Goal:</strong> {profile.weekly_goal} hrs/week
            </span>
            <span className="profile-quick-badge">
              📚 <strong>Pace:</strong> {profile.preferred_pace}
            </span>
            <span className="profile-quick-badge">
              💡 <strong>Style:</strong> {profile.learning_style}
            </span>
            {profile.enable_reminders && (
              <span className="profile-quick-badge reminders-active">
                🔔 Alerts Active
              </span>
            )}
          </div>
        )}
      </div>

      {/* Overview stats metrics row */}
      <div className="dashboard-grid">
        <div className="stat-card glass-card">
          <h3>Lessons Completed</h3>
          <p className="stat-value">{stats.lessons_completed}</p>
        </div>
        <div className="stat-card glass-card">
          <h3>Learning Streak</h3>
          <p className="stat-value">{stats.streak_days} days</p>
        </div>
        <div className="stat-card glass-card">
          <h3>Engagement Score</h3>
          <p className="stat-value">{stats.engagement_score}%</p>
        </div>
        <div className="stat-card glass-card">
          <h3>Average Quiz Score</h3>
          <p className="stat-value">{stats.average_score}%</p>
        </div>
      </div>

      {/* Main Row: SVG Charts */}
      <div className="dashboard-charts-row">
        <div className="chart-card glass-card">
          <h3>Weekly Study Progress</h3>
          <p className="chart-subtitle-desc">Completed quizzes by calendar day (Mon-Sun)</p>
          <div className="chart-render-box">
            {renderWeeklyBarChart()}
          </div>
        </div>

        <div className="chart-card glass-card">
          <h3>Subject Mastery Breakdown</h3>
          <p className="chart-subtitle-desc">Mastery radar scores per active learning topic</p>
          <div className="chart-render-box radar-render">
            {renderSubjectRadarChart()}
          </div>
        </div>
      </div>

      {/* Bottom Row split: Trends, Bookmarks, and AI Recommendation */}
      <div className="dashboard-double-column">
        {/* Performance trends line chart */}
        <div className="column-card glass-card flex-2">
          <h3>Performance & Focus Trends</h3>
          <p className="chart-subtitle-desc">Score patterns over your last 10 quiz attempts</p>
          <div className="chart-render-box">
            {renderEngagementTrendsChart()}
          </div>
          
          <div className="trends-legend">
            <span className="legend-item"><span className="legend-dot focused"></span> Focused</span>
            <span className="legend-item"><span className="legend-dot struggling"></span> Struggling</span>
            <span className="legend-item"><span className="legend-dot bored"></span> Bored</span>
          </div>
        </div>

        {/* AI Recommendations & Weak/Strong areas */}
        <div className="column-card glass-card flex-1 recommendations-dashboard-card">
          <h3>AI Path Recommendations</h3>
          
          {recommendations ? (
            <div className="recommendation-content-box">
              <div className="rec-subject-header">
                <h4>Suggested Quiz:</h4>
                <span className={`difficulty-badge ${recommendations.recommended_difficulty?.toLowerCase()}`}>
                  {recommendations.recommended_difficulty}
                </span>
              </div>
              
              <h5 className="rec-quiz-title">
                {recommendations.quiz_details?.title || 'Loading next target...'}
              </h5>
              <p className="rec-reason-desc">
                {recommendations.reason}
              </p>

              {/* Weak / Strong Areas */}
              <div className="areas-list-box">
                {recommendations.weak_topics?.length > 0 && (
                  <div className="area-group">
                    <span className="area-title weak">⚠️ Weak Areas:</span>
                    <div className="area-badges-row">
                      {recommendations.weak_topics.map(t => (
                        <span key={t} className="area-badge weak">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {recommendations.strong_topics?.length > 0 && (
                  <div className="area-group">
                    <span className="area-title strong">🏆 Strong Areas:</span>
                    <div className="area-badges-row">
                      {recommendations.strong_topics.map(t => (
                        <span key={t} className="area-badge strong">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {recommendations.recommended_quiz_id && (
                <Link 
                  to="/quiz" 
                  className="btn btn-primary btn-block btn-start-rec-quiz"
                >
                  Start Recommended Path ⚡
                </Link>
              )}
            </div>
          ) : (
            <p className="text-muted">Complete an onboarding quiz to enable AI-powered learning path suggestions.</p>
          )}
        </div>
      </div>

      {/* Bookmarked Subjects List */}
      <section className="dashboard-bookmarks-section glass-card">
        <h3>Bookmarked Courses</h3>
        {bookmarkedSubjects.length === 0 ? (
          <div className="no-bookmarks-prompt">
            <p>You haven't bookmarked any subjects yet.</p>
            <Link to="/subjects" className="btn btn-secondary">Explore Subjects Catalog ❯</Link>
          </div>
        ) : (
          <div className="bookmarks-row-grid">
            {bookmarkedSubjects.map(sub => (
              <div key={sub.id} className="bookmark-pill-card glass-card">
                <div className="pill-header">
                  <span className="pill-title">{sub.title}</span>
                  <span className="pill-category">{sub.category}</span>
                </div>
                <div className="pill-body">
                  <span>Quizzes: <strong>{sub.quiz_count}</strong></span>
                  <Link to={`/quiz?subject_id=${sub.id}`} className="btn-start-pill">Launch</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity List */}
      <section className="recent-activity">
        <h2>Recent Activity History</h2>
        <div className="activity-list">
          {stats.recent_activity.map((activity, index) => (
            <div key={index} className="activity-item glass-card">
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
    </div>
  )
}

export default Dashboard
