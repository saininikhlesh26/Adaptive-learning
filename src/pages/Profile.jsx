import { useState, useEffect } from 'react'
import { fetchProfile, updateProfile, fetchDashboardStats } from '../api'

const CURATED_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150"
]

const ALL_INTERESTS = [
  { id: 'math', label: 'Mathematics' },
  { id: 'physics', label: 'Physics' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'english', label: 'English' },
  { id: 'aptitude', label: 'Aptitude' },
  { id: 'logical_reasoning', label: 'Logical Reasoning' },
  { id: 'c_prog', label: 'C Programming' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'data_structures', label: 'Data Structures' },
  { id: 'algorithms', label: 'Algorithms' },
  { id: 'dbms', label: 'DBMS' },
  { id: 'os', label: 'OS' },
  { id: 'cn', label: 'CN' },
  { id: 'react', label: 'React' },
  { id: 'node_js', label: 'Node.js' },
  { id: 'ml', label: 'Machine Learning' },
  { id: 'ai', label: 'AI' },
  { id: 'data_science', label: 'Data Science' },
  { id: 'cyber_security', label: 'Cyber Security' }
]

function Profile() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Edit Form Fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [educationLevel, setEducationLevel] = useState('Undergraduate')
  const [learningStyle, setLearningStyle] = useState('Visual Learner')
  const [preferredPace, setPreferredPace] = useState('Moderate pace')
  const [peakTime, setPeakTime] = useState('Evenings (6 PM - 9 PM)')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [weeklyGoal, setWeeklyGoal] = useState(10)
  const [subjectFocus, setSubjectFocus] = useState('Computer Science')
  const [enableReminders, setEnableReminders] = useState(true)
  const [learningInterests, setLearningInterests] = useState([])
  const [learningGoals, setLearningGoals] = useState('')

  useEffect(() => {
    loadProfileAndStats()
  }, [])

  const loadProfileAndStats = () => {
    setLoading(true)
    Promise.all([fetchProfile(), fetchDashboardStats()])
      .then(([profileData, statsData]) => {
        setProfile(profileData)
        setStats(statsData)

        // Initialize form fields
        setFirstName(profileData.first_name || '')
        setLastName(profileData.last_name || '')
        setEmail(profileData.email || '')
        setEducationLevel(profileData.education_level || 'Undergraduate')
        setLearningStyle(profileData.learning_style || 'Visual Learner')
        setPreferredPace(profileData.preferred_pace || 'Moderate pace')
        setPeakTime(profileData.peak_time || 'Evenings (6 PM - 9 PM)')
        setAvatarUrl(profileData.avatar_url || CURATED_AVATARS[0])
        setWeeklyGoal(profileData.weekly_goal || 10)
        setSubjectFocus(profileData.subject_focus || 'Computer Science')
        setEnableReminders(profileData.enable_reminders !== undefined ? profileData.enable_reminders : true)
        setLearningInterests(profileData.learning_interests || [])
        setLearningGoals(profileData.learning_goals || '')

        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load profile details from the database. Is the backend server running?')
        setLoading(false)
      })
  }

  const handleInterestToggle = (interestId) => {
    if (learningInterests.includes(interestId)) {
      setLearningInterests(learningInterests.filter(id => id !== interestId))
    } else {
      setLearningInterests([...learningInterests, interestId])
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (learningInterests.length === 0) {
      setError('Please select at least one learning interest.')
      setSaving(false)
      return
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      education_level: educationLevel,
      learning_style: learningStyle,
      preferred_pace: preferredPace,
      peak_time: peakTime,
      avatar_url: avatarUrl,
      weekly_goal: parseInt(weeklyGoal, 10),
      subject_focus: subjectFocus,
      enable_reminders: enableReminders,
      learning_interests: learningInterests,
      learning_goals: learningGoals
    }

    updateProfile(payload)
      .then(() => {
        setProfile(prev => ({
          ...prev,
          ...payload
        }))
        setIsEditing(false)
        setSaving(false)
        
        // Notify App.jsx root that profile changed, updating navbar in real-time!
        window.dispatchEvent(new Event('profile-updated'))
      })
      .catch(err => {
        console.error(err)
        setError('Failed to update student profile data.')
        setSaving(false)
      })
  }

  if (loading) {
    return (
      <div className="page profile-page">
        <div className="quiz-loader">
          <div className="spinner"></div>
          <p>Loading student profile info...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page profile-page">
      <div className="dashboard-header-container">
        <h1>Student Profile</h1>
        <p className="dashboard-subtitle">Customize your onboarding details, learning preferences, and visual avatar.</p>
      </div>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      <div className="profile-container">
        {isEditing ? (
          <form onSubmit={handleSave} className="profile-edit-form glass-card">
            <section className="profile-edit-header-section">
              <h3>Edit Profile Information</h3>
              <div className="avatar-curated-selector-container">
                <label>Select Avatar Portrait</label>
                <div className="avatar-curated-grid">
                  {CURATED_AVATARS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Avatar options ${idx + 1}`}
                      className={`curated-avatar-option ${avatarUrl === url ? 'selected-avatar' : ''}`}
                      onClick={() => setAvatarUrl(url)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Education Level *</label>
                  <select
                    value={educationLevel}
                    onChange={(e) => setEducationLevel(e.target.value)}
                  >
                    <option value="School">Secondary School</option>
                    <option value="High School">High School</option>
                    <option value="Undergraduate">Undergraduate Degree</option>
                    <option value="Graduate">Postgraduate Degree</option>
                    <option value="Professional">Professional Practitioner</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Learning Goals & Statement</label>
                <textarea
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  rows="2"
                  placeholder="e.g. Master algorithms, improve calculus, prepare for jobs..."
                ></textarea>
              </div>

              <div className="form-group">
                <label>Update Learning Interests * (Pick at least 1)</label>
                <div className="interests-grid-scroll">
                  {ALL_INTERESTS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`interest-tag-btn ${learningInterests.includes(opt.id) ? 'active' : ''}`}
                      onClick={() => handleInterestToggle(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="engagement-metrics-edit">
              <h3>Preferences & Goals</h3>
              
              <div className="form-row-3">
                <div className="form-group">
                  <label>Learning Style</label>
                  <select value={learningStyle} onChange={(e) => setLearningStyle(e.target.value)}>
                    <option value="Visual Learner">Visual Learner</option>
                    <option value="Auditory Learner">Auditory Learner</option>
                    <option value="Read/Write Learner">Read/Write Learner</option>
                    <option value="Kinesthetic Learner">Kinesthetic Learner</option>
                    <option value="Structured Learner">Structured Learner</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Preferred Pace</label>
                  <select value={preferredPace} onChange={(e) => setPreferredPace(e.target.value)}>
                    <option value="Self-paced">Self-paced (Slow)</option>
                    <option value="Moderate pace">Moderate pace</option>
                    <option value="Fast pace">Fast pace</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Peak Time</label>
                  <input
                    type="text"
                    value={peakTime}
                    onChange={(e) => setPeakTime(e.target.value)}
                    placeholder="e.g. Evenings (6 PM - 9 PM)"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Weekly Goal (Study hours target)</label>
                  <input
                    type="number"
                    value={weeklyGoal}
                    onChange={(e) => setWeeklyGoal(e.target.value)}
                    min="1"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label>Primary Focus Subject</label>
                  <input
                    type="text"
                    value={subjectFocus}
                    onChange={(e) => setSubjectFocus(e.target.value)}
                    placeholder="e.g. Fullstack Development"
                  />
                </div>
              </div>

              <div className="form-group toggle-reminder-container">
                <label className="switch-label">
                  <input
                    type="checkbox"
                    checked={enableReminders}
                    onChange={(e) => setEnableReminders(e.target.checked)}
                  />
                  <span className="switch-text">Enable real-time focus notifications during quizzes</span>
                </label>
              </div>
            </section>

            <div className="profile-actions-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving changes...' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false)
                  setError(null)
                  loadProfileAndStats()
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-display-layout">
            {/* Header section card */}
            <div className="profile-display-card glass-card">
              <div className="profile-header-display-box">
                <img 
                  src={profile.avatar_url || CURATED_AVATARS[0]} 
                  alt="Student Profile Avatar" 
                  className="profile-display-avatar"
                />
                <div className="profile-display-name-box">
                  <h2>{profile.first_name} {profile.last_name}</h2>
                  <span className={`user-role-badge ${profile.role}`}>{profile.role === 'admin' ? '⚙️ Administrator' : '🎓 Student'}</span>
                  <p className="profile-display-email">{profile.email}</p>
                  <p className="profile-display-joined">Joined: {profile.joined_date || 'January 2026'}</p>
                </div>
              </div>
              
              <div className="profile-display-onboarding-info">
                <div className="onboard-info-block">
                  <h4>Education Level</h4>
                  <p>{profile.education_level}</p>
                </div>
                {profile.learning_goals && (
                  <div className="onboard-info-block">
                    <h4>Learning Goals</h4>
                    <p className="goals-text-box">"{profile.learning_goals}"</p>
                  </div>
                )}
                <div className="onboard-info-block">
                  <h4>Interests Catalog</h4>
                  <div className="interests-display-row">
                    {profile.learning_interests && profile.learning_interests.length > 0 ? (
                      profile.learning_interests.map(id => {
                        const opt = ALL_INTERESTS.find(o => o.id === id)
                        return (
                          <span key={id} className="interest-display-badge">
                            {opt ? opt.label : id}
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-muted">No selected interests</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="profile-edit-btn-container">
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  Edit Profile Configurations
                </button>
              </div>
            </div>

            {/* Quick stats and details cards */}
            <div className="profile-details-column">
              {stats && (
                <div className="learning-stats-card glass-card">
                  <h3>Cumulative Learning Stats</h3>
                  <div className="stats-grid">
                    <div className="stat-card shadow-none">
                      <h4>Streaks</h4>
                      <p className="stat-value">{stats.streak_days} days</p>
                    </div>
                    <div className="stat-card shadow-none">
                      <h4>Completed Quizzes</h4>
                      <p className="stat-value">{stats.lessons_completed}</p>
                    </div>
                    <div className="stat-card shadow-none">
                      <h4>Avg Score</h4>
                      <p className="stat-value">{stats.average_score}%</p>
                    </div>
                    <div className="stat-card shadow-none">
                      <h4>Engagement Focus</h4>
                      <p className="stat-value">{stats.engagement_score}%</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="preferences-display-card glass-card">
                <h3>Preferences Setup</h3>
                <div className="preferences-display-grid">
                  <div className="preference-item">
                    <span className="pref-label">Learning Style:</span>
                    <strong className="pref-value">{profile.learning_style}</strong>
                  </div>
                  <div className="preference-item">
                    <span className="pref-label">Preferred Pace:</span>
                    <strong className="pref-value">{profile.preferred_pace}</strong>
                  </div>
                  <div className="preference-item">
                    <span className="pref-label">Peak Performance Time:</span>
                    <strong className="pref-value">{profile.peak_time}</strong>
                  </div>
                  <div className="preference-item">
                    <span className="pref-label">Weekly Goal:</span>
                    <strong className="pref-value">{profile.weekly_goal} hours</strong>
                  </div>
                  <div className="preference-item">
                    <span className="pref-label">Subject Focus:</span>
                    <strong className="pref-value">{profile.subject_focus}</strong>
                  </div>
                  <div className="preference-item">
                    <span className="pref-label">Quiz Reminder Alerts:</span>
                    <strong className="pref-value">{profile.enable_reminders ? '🔔 Enabled' : '🔕 Muted'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
