import { useState, useEffect } from 'react'
import { fetchWeeklyReports, generateWeeklyReport } from '../api'

export default function WeeklyReports() {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [generating, setGenerating] = useState(false)

  const loadReports = async (selectLatest = true, showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true)
      }
      const data = await fetchWeeklyReports()
      // Sort reports by date descending
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReports(true, false)
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
      // Reload reports and select the newly created one
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
      <div className="error-alert">
        <span>⚠️</span>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => loadReports()}>Retry</button>
      </div>
    )
  }

  return (
    <div className="weekly-reports-layout">
      {/* 1. Selector and Actions Panel */}
      <div className="weekly-report-selector-card glass-card">
        <div className="planner-title-section">
          <h1>Weekly Progress Reports</h1>
          <p className="sidebar-user-role" style={{ fontSize: '0.9rem', background: 'none', padding: 0 }}>
            {selectedReport ? `Week of ${selectedReport.week_start} to ${selectedReport.week_end}` : 'No reports generated yet'}
          </p>
        </div>
        
        <div className="planner-action-buttons">
          {reports.length > 0 && (
            <select 
              className="category-tab-btn" 
              value={selectedReport?.id || ''} 
              onChange={handleReportChange}
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px' }}
            >
              {reports.map(r => (
                <option key={r.id} value={r.id} style={{ background: '#1c1917', color: 'white' }}>
                  {r.week_end} (Ended)
                </option>
              ))}
            </select>
          )}
          
          <button 
            className="btn btn-secondary" 
            onClick={handleShareLink} 
            disabled={!selectedReport}
          >
            {copySuccess ? '✓ Copied Link' : '🔗 Share Report'}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleDownloadPdf} 
            disabled={!selectedReport}
          >
            📥 Print / Save PDF
          </button>
          
          <button 
            className="btn btn-ai-planner" 
            onClick={handleGenerateReport} 
            disabled={generating}
          >
            {generating ? 'Compiling...' : '⚡ Generate Latest'}
          </button>
        </div>
      </div>

      {selectedReport && (
        <>
          {/* 2. Key Stats Cards Row */}
          <div className="report-stats-grid">
            <div className="report-stat-card glass-card">
              <span className="report-stat-card-title">Study Time Allocation</span>
              <span className="report-stat-card-value">{selectedReport.study_hours} hrs</span>
              <span className={`report-stat-card-comparison ${selectedReport.study_hours_change >= 0 ? 'comparison-positive' : 'comparison-negative'}`}>
                {selectedReport.study_hours_change >= 0 ? `▲ +${selectedReport.study_hours_change}h` : `▼ ${selectedReport.study_hours_change}h`} vs last week
              </span>
            </div>

            <div className="report-stat-card glass-card">
              <span className="report-stat-card-title">Completed Assessments</span>
              <span className="report-stat-card-value">{selectedReport.quizzes_attempted} attempts</span>
              <span className={`report-stat-card-comparison ${selectedReport.quizzes_attempted_change >= 0 ? 'comparison-positive' : 'comparison-negative'}`}>
                {selectedReport.quizzes_attempted_change >= 0 ? `▲ +${selectedReport.quizzes_attempted_change}` : `▼ ${selectedReport.quizzes_attempted_change}`} vs last week
              </span>
            </div>

            <div className="report-stat-card glass-card">
              <span className="report-stat-card-title">Questions Evaluated</span>
              <span className="report-stat-card-value">{selectedReport.questions_solved} solved</span>
              <span className="report-stat-card-comparison comparison-neutral">
                Across focus subjects
              </span>
            </div>

            <div className="report-stat-card glass-card">
              <span className="report-stat-card-title">Average Assessment Accuracy</span>
              <span className="report-stat-card-value">{selectedReport.avg_score}%</span>
              <span className={`report-stat-card-comparison ${selectedReport.avg_score_change >= 0 ? 'comparison-positive' : 'comparison-negative'}`}>
                {selectedReport.avg_score_change >= 0 ? `▲ +${selectedReport.avg_score_change}%` : `▼ ${selectedReport.avg_score_change}%`} vs last week
              </span>
            </div>
          </div>

          {/* 3. Deep Analysis Columns */}
          <div className="report-double-column">
            {/* Subject bars list */}
            <div className="report-subject-performance-card glass-card">
              <h3>Subject Accuracy Breakdown</h3>
              <p className="sidebar-user-role" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'none', padding: 0, marginBottom: '1.5rem' }}>
                Your performance scaling across active subjects
              </p>
              
              <div className="report-subject-bars-list">
                {Object.entries(selectedReport.subject_performance).map(([subId, score]) => {
                  const subjectTitle = subId.toUpperCase().replace('_', ' ');
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

            {/* AI Insights Card */}
            <div className="report-ai-insights-card glass-card">
              <h3>Adaptive Learning AI Insights</h3>
              
              <div className="report-insight-group">
                <span className="report-insight-group-title strengths">✓ Core Strengths</span>
                <ul className="report-insight-list strengths-list">
                  {selectedReport.ai_insights.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="report-insight-group">
                <span className="report-insight-group-title improvements">⚠ Areas of Focus</span>
                <ul className="report-insight-list improvements-list">
                  {selectedReport.ai_insights.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>

              <div className="report-insight-group">
                <span className="report-insight-group-title recommendations">💡 Weekly Recommendations</span>
                <ul className="report-insight-list recommendations-list">
                  {selectedReport.ai_insights.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
