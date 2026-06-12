function Dashboard() {
  return (
    <div className="page dashboard-page">
      <h1>Learning Dashboard</h1>
      
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Lessons Completed</h3>
          <p className="stat-value">24</p>
        </div>
        <div className="stat-card">
          <h3>Current Streak</h3>
          <p className="stat-value">7 days</p>
        </div>
        <div className="stat-card">
          <h3>Engagement Score</h3>
          <p className="stat-value">85%</p>
        </div>
        <div className="stat-card">
          <h3>Average Score</h3>
          <p className="stat-value">92%</p>
        </div>
      </div>

      <section className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <h4>Completed: React Fundamentals</h4>
            <p>Today at 2:30 PM - Score: 95%</p>
          </div>
          <div className="activity-item">
            <h4>Completed: State Management</h4>
            <p>Yesterday at 3:15 PM - Score: 88%</p>
          </div>
          <div className="activity-item">
            <h4>Completed: Component Lifecycle</h4>
            <p>2 days ago at 4:00 PM - Score: 91%</p>
          </div>
        </div>
      </section>

      <section className="recommendations">
        <h2>Recommended Next</h2>
        <div className="recommendation-card">
          <h3>Advanced React Patterns</h3>
          <p>Based on your progress, we recommend this intermediate course</p>
          <button className="btn btn-primary">Start Learning</button>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
