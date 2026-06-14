import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  fetchDashboardStats, 
  fetchProfile, 
  fetchRecommendations, 
  fetchSubjects,
  fetchTasks,
  updateTask,
  createTask,
  fetchGoals,
  fetchTimetable
} from '../api'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [bookmarkedSubjects, setBookmarkedSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [achievements, setAchievements] = useState([])
  const [timetable, setTimetable] = useState([])
  const [quickTaskTitle, setQuickTaskTitle] = useState('')
  const [subjects, setSubjects] = useState([])
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('overview')

  const loadDashboardData = (showLoader = false) => {
    if (showLoader) {
      setLoading(true)
    }
    setError(null)

    Promise.all([
      fetchProfile(),
      fetchDashboardStats(),
      fetchRecommendations().catch(() => null),
      fetchSubjects().catch(() => []),
      fetchTasks().catch(() => []),
      fetchGoals().catch(() => ({ goals: [], achievements: [] })),
      fetchTimetable().catch(() => [])
    ])
      .then(([profileData, statsData, recData, subjectsData, tasksData, goalsData, timetableData]) => {
        setProfile(profileData)
        setStats(statsData)
        setRecommendations(recData)
        setSubjects(subjectsData)
        setTasks(tasksData)
        setGoals(goalsData.goals || [])
        setAchievements(goalsData.achievements || [])
        setTimetable(timetableData)
        
        // Filter bookmarked subjects
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

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // --- SKELETON LOADERS ---
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
          <div className="chart-card skeleton-card skeleton-animated" style={{ height: '280px' }}></div>
          <div className="chart-card skeleton-card skeleton-animated" style={{ height: '280px' }}></div>
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
        <div className="error-container card">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={() => loadDashboardData(true)}>Retry</button>
        </div>
      </div>
    )
  }

  // --- SVG Chart Renderers ---
  const renderWeeklyBarChart = () => {
    const data = stats.weekly_progress || []
    if (data.length === 0) return <p className="text-muted">No weekly progress data available.</p>

    const width = 600
    const height = 240
    const padding = 40
    const chartHeight = height - padding * 2
    const chartWidth = width - padding * 2

    const maxVal = Math.max(...data.map(d => d.completed), 3)
    const barWidth = 40
    const spacing = (chartWidth - barWidth * data.length) / (data.length - 1)

    return (
      <svg className="custom-svg-chart bar-chart-canvas" viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal grid lines */}
        {[0, 1, 2, 3].map(i => {
          const y = padding + (chartHeight / 3) * i
          const label = Math.round(maxVal - (maxVal / 3) * i)
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" />
              <text x={padding - 12} y={y + 4} className="chart-axis-text axis-y">{label}</text>
            </g>
          )
        })}

        {/* Vertical Bars */}
        {data.map((d, idx) => {
          const x = padding + idx * (barWidth + spacing)
          const barHeight = d.completed > 0 ? (d.completed / maxVal) * chartHeight : 6
          const y = height - padding - barHeight
          
          return (
            <g key={idx} className="chart-bar-group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                className={`chart-bar-rect ${d.completed > 0 ? 'active-bar' : 'empty-bar'}`}
              />
              {d.completed > 0 && (
                <text x={x + barWidth/2} y={y - 8} className="chart-bar-val">{d.completed}</text>
              )}
              <text x={x + barWidth/2} y={height - padding + 18} className="chart-axis-text axis-x">{d.day}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  const getTodayTimetable = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    return timetable.filter(slot => slot.date === todayStr)
  }

  const handleToggleTask = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed'
    try {
      await updateTask(taskId, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      console.error(err)
    }
  }

  const handleQuickTaskSubmit = async (e) => {
    e.preventDefault()
    if (!quickTaskTitle.trim()) return
    try {
      const newTask = await createTask({ title: quickTaskTitle.trim(), priority: 'Medium' })
      setTasks(prev => [...prev, newTask])
      setQuickTaskTitle('')
    } catch (err) {
      console.error(err)
    }
  }

  // Count active/total quizzes and subjects
  const subjectsCount = subjects.length
  const quizCount = stats.lessons_completed || 0
  const avgScore = stats.average_score || 0
  const engagementScore = stats.engagement_score || 0

  return (
    <div className="page dashboard-page">
      {/* Header Profile Title Area */}
      <div className="dashboard-header-container">
        <div className="dashboard-welcome">
          <h1>Welcome Back, {profile?.first_name || "Student"}!</h1>
          <p className="dashboard-subtitle">
            Track your study streaks, review weak areas, and unlock recommended subject materials.
          </p>
        </div>
        
        {profile && (
          <div className="profile-quick-stats">
            <span className="profile-quick-badge">
              🎯 <strong>Goal:</strong> {profile.weekly_goal} hrs/week
            </span>
            <span className="profile-quick-badge">
              📚 <strong>Style:</strong> {profile.learning_style}
            </span>
            <span className="profile-quick-badge">
              ⚡ <strong>Streak:</strong> {stats.streak_days} days
            </span>
          </div>
        )}
      </div>

      {/* Modern Tab System to keep it clean */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tasks-goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks-goals')}
        >
          📅 Tasks & Goals
        </button>
        <button 
          className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 Achievements
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="dashboard-content-flow">
          
          {/* 1. TOP STATS ROW */}
          <div className="dashboard-grid">
            <div className="stat-card">
              <span className="stat-icon-label">📚</span>
              <div className="stat-meta">
                <h3>Subjects</h3>
                <p className="stat-value">{subjectsCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon-label">📝</span>
              <div className="stat-meta">
                <h3>Quizzes Taken</h3>
                <p className="stat-value">{quizCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon-label">📈</span>
              <div className="stat-meta">
                <h3>Average Score</h3>
                <p className="stat-value">{avgScore}%</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon-label">⚡</span>
              <div className="stat-meta">
                <h3>Engagement</h3>
                <p className="stat-value">{engagementScore}%</p>
              </div>
            </div>
          </div>

          {/* 2. SECOND SECTION: WEEKLY PROGRESS CHART */}
          <div className="dashboard-section-card">
            <div className="section-card-header">
              <h2>Weekly Progress Chart</h2>
              <span className="section-card-desc">Completed quizzes by calendar day (Mon-Sun)</span>
            </div>
            <div className="chart-container-large">
              {renderWeeklyBarChart()}
            </div>
          </div>

          {/* 3. THIRD SECTION: RECOMMENDED SUBJECTS */}
          <div className="dashboard-section-card">
            <div className="section-card-header">
              <h2>Recommended Subjects</h2>
              <span className="section-card-desc">Based on your dynamic AI learning recommendation</span>
            </div>
            
            {recommendations ? (
              <div className="rec-dashboard-layout">
                <div className="rec-info-banner">
                  <div className="rec-info-badge">
                    <span>AI Recommended Path</span>
                    <span className={`difficulty-badge ${recommendations.recommended_difficulty?.toLowerCase()}`}>
                      {recommendations.recommended_difficulty}
                    </span>
                  </div>
                  <h3>{recommendations.quiz_details?.title || 'Launch Next Subject Path'}</h3>
                  <p className="rec-reason">{recommendations.reason}</p>
                  
                  {/* Subject Badge Row */}
                  <div className="rec-subject-chips">
                    {recommendations.weak_topics?.length > 0 && (
                      <div className="chip-group">
                        <span className="chip-label text-red">Improvement Area:</span>
                        {recommendations.weak_topics.map(t => (
                          <span key={t} className="badge-chip badge-red">{t}</span>
                        ))}
                      </div>
                    )}
                    {recommendations.strong_topics?.length > 0 && (
                      <div className="chip-group">
                        <span className="chip-label text-green">Mastered:</span>
                        {recommendations.strong_topics.map(t => (
                          <span key={t} className="badge-chip badge-green">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {recommendations.recommended_quiz_id && (
                    <Link to="/quiz" className="btn btn-primary btn-rec-action">
                      Start Recommended Assessment ⚡
                    </Link>
                  )}
                </div>

                <div className="bookmarked-catalog-section">
                  <h4>Bookmarked Subjects</h4>
                  {bookmarkedSubjects.length === 0 ? (
                    <div className="empty-bookmarks">
                      <p>No bookmarked subjects yet.</p>
                      <Link to="/subjects" className="link-action">Browse Subjects Catalog ❯</Link>
                    </div>
                  ) : (
                    <div className="bookmark-quick-grid">
                      {bookmarkedSubjects.slice(0, 3).map(sub => (
                        <div key={sub.id} className="bookmark-mini-card">
                          <div className="b-meta">
                            <span className="b-title">{sub.title}</span>
                            <span className="b-cat">{sub.category}</span>
                          </div>
                          <Link to={`/quiz?subject_id=${sub.id}`} className="b-btn">Start</Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-recommendations-prompt">
                <p>Complete your onboarding quiz to trigger custom AI recommendations.</p>
                <Link to="/quiz" className="btn btn-secondary">Go to Quizzes</Link>
              </div>
            )}
          </div>

          {/* 4. FOURTH SECTION: UPCOMING TIMETABLE */}
          <div className="dashboard-section-card">
            <div className="section-card-header flex-header">
              <div>
                <h2>Upcoming Timetable Plan</h2>
                <span className="section-card-desc">Your planned study scheduler slots for today</span>
              </div>
              <Link to="/timetable" className="btn btn-secondary btn-sm">Manage Schedule</Link>
            </div>
            
            <div className="upcoming-timetable-list">
              {getTodayTimetable().length > 0 ? (
                getTodayTimetable().map(slot => (
                  <div key={slot.id} className="timetable-list-item">
                    <div className="t-time-box">
                      <span className="t-time">{slot.time_slot}</span>
                      <span className={`t-priority priority-${slot.priority.toLowerCase()}`}>
                        {slot.priority}
                      </span>
                    </div>
                    <div className="t-info-box">
                      <h4>{subjects.find(s => s.id === slot.subject_id)?.title || slot.subject_id.toUpperCase()}</h4>
                      <p>Topic: {slot.topic}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-timetable-state">
                  <p>No study sessions scheduled for today. Take it easy or set up goals!</p>
                  <Link to="/timetable" className="link-action">Go to Study Planner 📅</Link>
                </div>
              )}
            </div>
          </div>

          {/* 5. FIFTH SECTION: RECENT ACTIVITY */}
          <div className="dashboard-section-card">
            <div className="section-card-header">
              <h2>Recent Activity</h2>
              <span className="section-card-desc">Review your latest platform focus and quiz attempts</span>
            </div>
            
            <div className="recent-activity-list-premium">
              {stats.recent_activity && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((activity, index) => (
                  <div key={index} className="activity-item-premium">
                    <div className="act-header">
                      <h4>{activity.title}</h4>
                      <span className={`activity-badge ${activity.engagement?.toLowerCase() || 'focused'}`}>
                        {activity.engagement || 'Focused'}
                      </span>
                    </div>
                    <p className="act-desc">{activity.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted" style={{ padding: '1rem 0' }}>No recent learning activity.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'tasks-goals' && (
        <div className="dashboard-content-flow">
          <div className="dashboard-split-row">
            
            {/* Checklist Tracker */}
            <div className="dashboard-section-card flex-1">
              <div className="section-card-header flex-header">
                <div>
                  <h2>Checklist Tracker</h2>
                  <span className="section-card-desc">
                    {tasks.filter(t => t.status === 'Completed').length}/{tasks.length} tasks completed
                  </span>
                </div>
              </div>

              <div className="checklist-items-scrollable">
                {tasks.length > 0 ? (
                  tasks.map(task => (
                    <div key={task.id} className={`checklist-row ${task.status === 'Completed' ? 'checked' : ''}`}>
                      <div className="check-block">
                        <input 
                          type="checkbox" 
                          checked={task.status === 'Completed'} 
                          onChange={() => handleToggleTask(task.id, task.status)}
                          className="check-input"
                        />
                        <div className="check-text">
                          <span className="check-title">{task.title}</span>
                          {task.due_date && <span className="check-due">Due: {task.due_date}</span>}
                        </div>
                      </div>
                      <span className={`priority-badge-dot priority-${task.priority?.toLowerCase() || 'medium'}`}>
                        {task.priority || 'Medium'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-checklist-prompt">
                    <p>No study tasks on your checklist.</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleQuickTaskSubmit} className="quick-task-form">
                <input 
                  type="text" 
                  placeholder="Create quick checklist item..." 
                  value={quickTaskTitle}
                  onChange={e => setQuickTaskTitle(e.target.value)}
                  className="quick-task-input"
                />
                <button type="submit" className="btn btn-secondary">Add</button>
              </form>
            </div>

            {/* Active Study Goals */}
            <div className="dashboard-section-card flex-1">
              <div className="section-card-header">
                <h2>Active Study Goals</h2>
                <span className="section-card-desc">Track progress against your defined milestones</span>
              </div>

              <div className="goals-items-scrollable">
                {goals.length > 0 ? (
                  goals.map(goal => {
                    const percent = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                    return (
                      <div key={goal.id} className="goal-status-box">
                        <div className="goal-status-header">
                          <span className="g-title">{goal.title}</span>
                          <span className="g-percent">{percent}%</span>
                        </div>
                        <div className="goal-meter-container">
                          <div className="goal-meter-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="goal-status-meta">
                          <span>Target: {goal.target_value} ({goal.goal_type})</span>
                          {goal.deadline && <span>By: {goal.deadline}</span>}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="empty-goals-prompt">
                    <p>No active goals set. Define goals in your student profile page!</p>
                    <Link to="/profile" className="btn btn-secondary btn-sm">Set Goals</Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="dashboard-content-flow">
          <div className="dashboard-section-card">
            <div className="section-card-header">
              <h2>Achievements & Badges</h2>
              <span className="section-card-desc">Unlocked milestones and student recognition badges</span>
            </div>

            <div className="badges-showcase-grid">
              {achievements.length > 0 ? (
                achievements.map(badge => (
                  <div key={badge.id} className="badge-item-card">
                    <div className="badge-icon-wrap">{badge.icon}</div>
                    <h3>{badge.title}</h3>
                    <p>{badge.description}</p>
                  </div>
                ))
              ) : (
                <div className="empty-badges-prompt">
                  <span className="trophy-big">🏆</span>
                  <p>Start resolving quizzes and completing checklist targets to unlock badges!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard
