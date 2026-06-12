function Profile() {
  return (
    <div className="page profile-page">
      <h1>Student Profile</h1>

      <div className="profile-container">
        <section className="profile-header">
          <div className="avatar">
            <img src="https://via.placeholder.com/120" alt="Student avatar" />
          </div>
          <div className="profile-info">
            <h2>John Doe</h2>
            <p className="email">john.doe@example.com</p>
            <p className="join-date">Member since January 2026</p>
          </div>
        </section>

        <section className="learning-stats">
          <h2>Learning Statistics</h2>
          <div className="stats-grid">
            <div className="stat">
              <h3>Total Hours</h3>
              <p className="value">156</p>
            </div>
            <div className="stat">
              <h3>Courses Completed</h3>
              <p className="value">8</p>
            </div>
            <div className="stat">
              <h3>Current Streak</h3>
              <p className="value">7 days</p>
            </div>
            <div className="stat">
              <h3>Avg. Engagement</h3>
              <p className="value">85%</p>
            </div>
          </div>
        </section>

        <section className="engagement-metrics">
          <h2>Engagement Metrics</h2>
          <div className="metric-card">
            <h3>Learning Style</h3>
            <p>Visual Learner with strong problem-solving abilities</p>
          </div>
          <div className="metric-card">
            <h3>Preferred Pace</h3>
            <p>Moderate pace with occasional deep dives</p>
          </div>
          <div className="metric-card">
            <h3>Peak Performance Time</h3>
            <p>Evenings (6 PM - 9 PM)</p>
          </div>
        </section>

        <section className="actions">
          <button className="btn btn-primary">Edit Profile</button>
          <button className="btn btn-secondary">Download Report</button>
        </section>
      </div>
    </div>
  )
}

export default Profile
