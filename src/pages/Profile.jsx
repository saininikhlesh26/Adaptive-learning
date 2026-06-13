import { useState, useEffect } from 'react'
import { fetchProfile, updateProfile, fetchDashboardStats } from '../api'

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
  const [learningStyle, setLearningStyle] = useState('')
  const [preferredPace, setPreferredPace] = useState('')
  const [peakTime, setPeakTime] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    Promise.all([fetchProfile(), fetchDashboardStats()])
      .then(([profileData, statsData]) => {
        setProfile(profileData)
        setStats(statsData)

        // Initialize form fields
        setFirstName(profileData.first_name)
        setLastName(profileData.last_name)
        setEmail(profileData.email)
        setLearningStyle(profileData.learning_style)
        setPreferredPace(profileData.preferred_pace)
        setPeakTime(profileData.peak_time)
        setAvatarUrl(profileData.avatar_url || 'https://via.placeholder.com/120')

        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load profile details from the database. Is the backend server running?')
        setLoading(false)
      })
  }, [])

  const handleSave = (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      learning_style: learningStyle,
      preferred_pace: preferredPace,
      peak_time: peakTime,
      avatar_url: avatarUrl
    }

    updateProfile(payload)
      .then(() => {
        setProfile(prev => ({
          ...prev,
          ...payload
        }))
        setIsEditing(false)
        setSaving(false)
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
      <h1>Student Profile</h1>

      {error && <div className="error-banner">{error}</div>}

      <div className="profile-container">
        {isEditing ? (
          <form onSubmit={handleSave} className="profile-edit-form">
            <section className="profile-header">
              <div className="avatar">
                <img src={avatarUrl} alt="Student avatar" />
                <input
                  type="text"
                  placeholder="Avatar Image URL"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="form-input avatar-input"
                />
              </div>
              <div className="profile-info-edit">
                <div className="form-group-inline">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </section>

            <section className="engagement-metrics-edit">
              <h2>Learning Configurations</h2>
              <div className="form-group">
                <label>Learning Style</label>
                <input
                  type="text"
                  value={learningStyle}
                  onChange={(e) => setLearningStyle(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Preferred Pace</label>
                <input
                  type="text"
                  value={preferredPace}
                  onChange={(e) => setPreferredPace(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Peak Performance Time</label>
                <input
                  type="text"
                  value={peakTime}
                  onChange={(e) => setPeakTime(e.target.value)}
                  className="form-input"
                />
              </div>
            </section>

            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditing(false)
                  setError(null)
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="profile-header">
              <div className="avatar">
                <img src={profile.avatar_url || 'https://via.placeholder.com/120'} alt="Student avatar" />
              </div>
              <div className="profile-info">
                <h2>{profile.first_name} {profile.last_name}</h2>
                <p className="email">{profile.email}</p>
                <p className="join-date">Member since {profile.joined_date}</p>
              </div>
            </section>

            {stats && (
              <section className="learning-stats">
                <h2>Learning Statistics</h2>
                <div className="stats-grid">
                  <div className="stat">
                    <h3>Total Hours</h3>
                    <p className="value">156</p>
                  </div>
                  <div className="stat">
                    <h3>Assessments Taken</h3>
                    <p className="value">{stats.lessons_completed - 8}</p>
                  </div>
                  <div className="stat">
                    <h3>Current Streak</h3>
                    <p className="value">{stats.streak_days} days</p>
                  </div>
                  <div className="stat">
                    <h3>Avg. Engagement</h3>
                    <p className="value">{stats.engagement_score}%</p>
                  </div>
                </div>
              </section>
            )}

            <section className="engagement-metrics">
              <h2>Engagement Metrics</h2>
              <div className="metric-card">
                <h3>Learning Style</h3>
                <p>{profile.learning_style}</p>
              </div>
              <div className="metric-card">
                <h3>Preferred Pace</h3>
                <p>{profile.preferred_pace}</p>
              </div>
              <div className="metric-card">
                <h3>Peak Performance Time</h3>
                <p>{profile.peak_time}</p>
              </div>
            </section>

            <div className="actions">
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Profile
