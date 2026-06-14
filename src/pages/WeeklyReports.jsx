import { useState, useEffect } from 'react'
import { fetchWeeklyReports, generateWeeklyReport } from '../api'

export default function WeeklyReports() {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Report sub-tab state
  const [reportTab, setReportTab] = useState('weekly')

  const loadReports = async (selectLatest = true, showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true)
      }
      const data = await fetchWeeklyReports()
      const sorted = data.sort((a, b) => new Date(b.week_end) - new Date(a.week_end))
      setReports(sorted)
      if (sorted.length > 0 && selectLatest) {
        setSelectedReport(sorted[0])
      }
      setError(null)
    } catch (err) {
      console.error(err)
      setError('Failed to retrieve weekly reports. Please check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReports(true, false)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleReportChange = (e) => {
    const report = reports.find(r => r.id === e.target.value)
    if (report) {
      setSelectedReport(report)
    }
  }

  const handleGenerateReport = async () => {
    try {
      setGenerating(true)
      const newReport = await generateWeeklyReport()
      setReports(prev => [newReport, ...prev])
      setSelectedReport(newReport)
      setGenerating(false)
    } catch (err) {
      console.error(err)
      alert('Error generating report: ' + err.message)
      setGenerating(false)
    }
  }

  const handleDownloadPdf = () => {
    window.print()
  }

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/reports?id=${selectedReport?.id || ''}`
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 3000)
      })
      .catch(err => {
        console.error('Failed to copy link:', err)
      })
  }

  if (loading) {
    return (
      <div className="skeleton-container" style={{ padding: '2rem', textAlign: 'left' }}>
        <div className="skeleton-bar skeleton-animated skeleton-title" style={{ marginBottom: '1.5rem' }}></div>
        <div className="skeleton-bar skeleton-animated skeleton-subtitle" style={{ marginBottom: '3rem' }}></div>
        <div className="report-stats-grid" style={{ marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="skeleton-card skeleton-animated" style={{ height: '120px' }}></div>
          ))}
        </div>
      </div>
    )
  }

  if (error && reports.length === 0) {
    return (
      <div className="error-container card">
        <p className="error-message">{error}</p>
        <button className="btn btn-primary" onClick={() => loadReports(true, true)}>Retry</button>
      </div>
    )
  }

  // Aggregate monthly mockup variables from active reports
  const totalMonthlyHours = reports.reduce((acc, r) => acc + (r.study_hours || 0), 0)
  const totalQuizzes = reports.reduce((acc, r) => acc + (r.quizzes_attempted || 0), 0)
  const averageAccuracy = reports.length > 0 
    ? Math.round(reports.reduce((acc, r) => acc + (r.avg_score || 0), 0) / reports.length) 
    : 0

  return (
    <div className="weekly-reports-layout">
      {/* 1. Header Navigation and Tab bar */}
      <div className="weekly-report-selector-card card">
        <div className="planner-title-section">
          <h1>Dedicated Learning Reports</h1>
          <p className="section-subtitle-description">
            Monitor accuracy growth, focus scores, and AI recommendations over time.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="report-sub-tabs">
          <button 
            className={`report-tab-btn ${reportTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setReportTab('weekly')}
          >
            🗓️ Weekly Report
          </button>
          <button 
            className={`report-tab-btn ${reportTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setReportTab('monthly')}
          >
            📅 Monthly Report
          </button>
          <button 
            className={`report-tab-btn ${reportTab === 'trends' ? 'active' : ''}`}
            onClick={() => setReportTab('trends')}
          >
            📈 Performance Trends & AI
          </button>
        </div>
        
        {/* Actions panel */}
        {selectedReport && (
          <div className="planner-action-buttons">
            {reportTab === 'weekly' && reports.length > 0 && (
              <select 
                className="report-select-input" 
                value={selectedReport?.id || ''} 
                onChange={handleReportChange}
              >
                {reports.map(r => (
                  <option key={r.id} value={r.id}>
                    Week ending {r.week_end}
                  </option>
                ))}
              </select>
            )}
            
            <button className="btn btn-secondary" onClick={handleShareLink}>
              {copySuccess ? '✓ Link Copied' : '🔗 Share Link'}
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadPdf}>
              📥 Print / PDF
            </button>
            <button className="btn btn-primary" onClick={handleGenerateReport} disabled={generating}>
              {generating ? 'Compiling...' : '⚡ Sync Latest Data'}
            </button>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE TAB */}
      {reportTab === 'weekly' && selectedReport && (
        <div className="report-content-wrapper">
          {/* Key Stats Row */}
          <div className="report-stats-grid">
            <div className="report-stat-card">
              <span className="report-stat-card-title">Weekly Study Hours</span>
              <span className="report-stat-card-value">{selectedReport.study_hours} hrs</span>
              <span className={`report-stat-card-comparison ${selectedReport.study_hours_change >= 0 ? 'comparison-positive' : 'comparison-negative'}`}>
                {selectedReport.study_hours_change >= 0 ? `▲ +${selectedReport.study_hours_change} hrs` : `▼ ${selectedReport.study_hours_change} hrs`} vs last week
              </span>
            </div>

            <div className="report-stat-card">
              <span className="report-stat-card-title">Quiz Attempts</span>
              <span className="report-stat-card-value">{selectedReport.quizzes_attempted} attempts</span>
              <span className={`report-stat-card-comparison ${selectedReport.quizzes_attempted_change >= 0 ? 'comparison-positive' : 'comparison-negative'}`}>
                {selectedReport.quizzes_attempted_change >= 0 ? `▲ +${selectedReport.quizzes_attempted_change}` : `▼ ${selectedReport.quizzes_attempted_change}`} vs last week
              </span>
            </div>

            <div className="report-stat-card">
              <span className="report-stat-card-title font-small">Questions Solved</span>
              <span className="report-stat-card-value">{selectedReport.questions_solved} solved</span>
              <span className="report-stat-card-comparison comparison-neutral">
                Across focus courses
              </span>
            </div>

            <div className="report-stat-card">
              <span className="report-stat-card-title">Average Score Accuracy</span>
              <span className="report-stat-card-value">{selectedReport.avg_score}%</span>
              <span className={`report-stat-card-comparison ${selectedReport.avg_score_change >= 0 ? 'comparison-positive' : 'comparison-negative'}`}>
                {selectedReport.avg_score_change >= 0 ? `▲ +${selectedReport.avg_score_change}%` : `▼ ${selectedReport.avg_score_change}%`} vs last week
              </span>
            </div>
          </div>

          {/* Subject Analysis and AI Recommendations columns */}
          <div className="report-double-column">
            {/* Subject accuracy analysis */}
            <div className="report-subject-performance-card card">
              <h3>Subject Performance Analysis</h3>
              <p className="card-subtitle-text">Average scores registered during this week's assessments</p>
              
              <div className="report-subject-bars-list">
                {Object.entries(selectedReport.subject_performance).map(([subId, score]) => {
                  const subjectTitle = subId.toUpperCase().replace('_', ' ')
                  return (
                    <div key={subId} className="report-subject-row">
                      <div className="report-subject-row-header">
                        <span className="report-subject-row-title">{subjectTitle}</span>
                        <span className="report-subject-row-score">{score}%</span>
                      </div>
                      <div className="report-subject-bar-container">
                        <div 
                          className="report-subject-bar-fill" 
                          style={{ 
                            width: `${score}%`,
                            background: score >= 85 ? 'var(--success)' : score < 70 ? 'var(--danger)' : 'var(--primary)'
                          }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI Insights & Recommendations */}
            <div className="report-ai-insights-card card">
              <h3>AI Assessment Feedback & Guidance</h3>
              
              <div className="report-insight-group">
                <span className="report-insight-group-title strengths">✓ Core Strengths</span>
                <ul className="report-insight-list strengths-list">
                  {selectedReport.ai_insights.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="report-insight-group">
                <span className="report-insight-group-title improvements">⚠️ Areas of Focus</span>
                <ul className="report-insight-list improvements-list">
                  {selectedReport.ai_insights.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>

              <div className="report-insight-group">
                <span className="report-insight-group-title recommendations">💡 Suggested Study Actions</span>
                <ul className="report-insight-list recommendations-list">
                  {selectedReport.ai_insights.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportTab === 'monthly' && (
        <div className="report-content-wrapper">
          <div className="report-stats-grid">
            <div className="report-stat-card">
              <span className="report-stat-card-title">Monthly Study Time</span>
              <span className="report-stat-card-value">{totalMonthlyHours} hrs</span>
              <span className="report-stat-card-comparison comparison-neutral">Aggregated this month</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-card-title">Total Quizzes Done</span>
              <span className="report-stat-card-value">{totalQuizzes} quizzes</span>
              <span className="report-stat-card-comparison comparison-neutral">Practice sets evaluated</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-card-title">Average Monthly Accuracy</span>
              <span className="report-stat-card-value">{averageAccuracy}%</span>
              <span className="report-stat-card-comparison comparison-neutral">Targeting &gt;80% target</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-card-title">Reports Compiled</span>
              <span className="report-stat-card-value">{reports.length} report(s)</span>
              <span className="report-stat-card-comparison comparison-neutral">Continuous tracking</span>
            </div>
          </div>

          <div className="monthly-aggregator-card card">
            <h3>Monthly Performance Aggregator</h3>
            <p className="card-subtitle-text">Your learning hours and quiz accuracies aggregated over the past weeks.</p>
            
            {reports.length > 0 ? (
              <table className="premium-notion-table">
                <thead>
                  <tr>
                    <th>Week Ending</th>
                    <th>Quizzes Solved</th>
                    <th>Hours Invested</th>
                    <th>Average Score Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td>{r.week_end}</td>
                      <td><strong>{r.quizzes_attempted}</strong> attempts ({r.questions_solved} questions)</td>
                      <td>{r.study_hours} hrs</td>
                      <td>
                        <span className={`accuracy-indicator-text ${r.avg_score >= 80 ? 'green' : 'orange'}`}>
                          {r.avg_score}% Accuracy
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">Generate a weekly report first to start compiling monthly metrics.</p>
            )}
          </div>
        </div>
      )}

      {reportTab === 'trends' && selectedReport && (
        <div className="report-content-wrapper">
          <div className="report-subject-performance-card card">
            <h3>Subject Performance Trends</h3>
            <p className="card-subtitle-text">Accuracy trajectory across your active courses</p>
            
            <div className="subject-comparison-analysis-grid">
              {Object.entries(selectedReport.subject_performance).map(([subId, score]) => {
                const subjectTitle = subId.toUpperCase().replace('_', ' ')
                return (
                  <div key={subId} className="trend-analysis-meter">
                    <div className="meter-label-row">
                      <span>{subjectTitle}</span>
                      <strong>{score}% Accuracy</strong>
                    </div>
                    <div className="meter-bar-track">
                      <div className="meter-bar-fill" style={{ width: `${score}%` }}></div>
                    </div>
                    <span className="meter-rating-tag">
                      {score >= 85 ? '🌟 Exceling / High Focus' : score >= 70 ? '🎯 Good / Steady' : '⚠️ Requires Revision'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI recommendations card */}
          <div className="report-ai-insights-card card" style={{ marginTop: '2rem' }}>
            <h3>AI Recommendations & Personal Plan</h3>
            <div className="ai-personal-plan-box">
              <span className="brain-badge">🧠 Dynamic ML Path Plan</span>
              <p className="plan-intro">
                Based on this week's accuracy levels, the learning engine has formulated the following guidelines:
              </p>
              <ul className="plan-steps">
                {selectedReport.ai_insights.recommendations.map((rec, i) => (
                  <li key={i}>
                    <span className="step-num">{i + 1}</span>
                    <p>{rec}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
