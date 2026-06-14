import { useState, useEffect } from 'react'
import { fetchCompetitions, joinCompetition, fetchLeaderboard } from '../api'

function Competitions() {
  const [competitions, setCompetitions] = useState([])
  const [selectedCompId, setSelectedCompId] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loadingComps, setLoadingComps] = useState(true)
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)

  // Curated badges / achievements display
  const badgesList = [
    { name: 'Algorithmic Ace', desc: 'Finished top 3 in Data Structures Weekly Challenge.', icon: '🌳', xp: 500 },
    { name: 'React Veteran', desc: 'Participated in 5 Daily React challenges.', icon: '⚡', xp: 250 },
    { name: 'Focused Guru', desc: 'Finished any competition with >95% focus.', icon: '🎯', xp: 400 }
  ]

  const loadLeaderboardData = (compId) => {
    setLoadingLeaderboard(true)
    fetchLeaderboard(compId)
      .then(data => {
        setLeaderboard(data)
        setLoadingLeaderboard(false)
      })
      .catch(err => {
        console.error(err)
        setLoadingLeaderboard(false)
      })
  }

  const loadCompetitionsData = () => {
    setLoadingComps(true)
    setError(null)
    fetchCompetitions()
      .then(data => {
        setCompetitions(data)
        if (data.length > 0) {
          const active = data.find(c => c.active) || data[0]
          setSelectedCompId(active.id)
          loadLeaderboardData(active.id)
        }
        setLoadingComps(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to fetch competitions catalog. Make sure the API is online.')
        setLoadingComps(false)
      })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCompetitionsData()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleCompSelect = (compId) => {
    setSelectedCompId(compId)
    loadLeaderboardData(compId)
  }

  const handleJoin = async (compId) => {
    setJoining(true)
    try {
      await joinCompetition(compId)
      // Refresh competitions list
      const updatedComps = competitions.map(c => 
        c.id === compId ? { ...c, participant_count: c.participant_count + 1 } : c
      )
      setCompetitions(updatedComps)
      loadLeaderboardData(compId)
      // Notify App to sync layout
      window.dispatchEvent(new Event('profile-updated'))
    } catch (err) {
      console.error(err)
    } finally {
      setJoining(false)
    }
  }

  const selectedComp = competitions.find(c => c.id === selectedCompId)

  if (loadingComps) {
    return (
      <div className="page competitions-page">
        <div className="quiz-loader">
          <div className="spinner"></div>
          <p>Loading active league challenges and ranking tables...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page competitions-page">
      <div className="dashboard-header-container">
        <h1>League Competitions</h1>
        <p className="dashboard-subtitle">Participate in daily and subject challenges, improve your ranking, and earn experience badges.</p>
      </div>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      <div className="competitions-layout">
        {/* Left Side: Challenges List */}
        <div className="challenges-section">
          <h3>Active Challenges</h3>
          <div className="challenges-list">
            {competitions.map((comp) => (
              <div 
                key={comp.id} 
                className={`challenge-card glass-card ${selectedCompId === comp.id ? 'active-challenge' : ''} ${!comp.active ? 'inactive-challenge' : ''}`}
                onClick={() => handleCompSelect(comp.id)}
              >
                <div className="challenge-card-header">
                  <span className="challenge-type-badge">{comp.type}</span>
                  <span className={`status-badge ${comp.active ? 'active' : 'expired'}`}>
                    {comp.active ? '● Active' : 'Expired'}
                  </span>
                </div>
                <h4 className="challenge-title">{comp.title}</h4>
                <p className="challenge-subject">Subject: {comp.subject}</p>
                <div className="challenge-footer">
                  <span className="participants-count">👥 {comp.participant_count} participating</span>
                  {comp.active && (
                    <button 
                      className="btn btn-secondary btn-join-comp"
                      disabled={joining}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(comp.id);
                      }}
                    >
                      Join Challenge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Badges / Rewards Board */}
          <div className="rewards-section glass-card">
            <h3>Your Achievements & Badges</h3>
            <div className="badges-list">
              {badgesList.map((badge, idx) => (
                <div key={idx} className="badge-item">
                  <span className="badge-icon-box">{badge.icon}</span>
                  <div className="badge-details">
                    <h4>{badge.name}</h4>
                    <p>{badge.desc}</p>
                    <span className="badge-xp">+{badge.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Leaderboard */}
        <div className="leaderboard-section glass-card">
          {selectedComp ? (
            <>
              <div className="leaderboard-header">
                <h3>Rankings: {selectedComp.title}</h3>
                <p className="leaderboard-subtitle">Sorted by quiz score and engagement focus rate.</p>
              </div>

              {loadingLeaderboard ? (
                <div className="leaderboard-loader">
                  <div className="spinner"></div>
                  <p>Fetching rankings...</p>
                </div>
              ) : (
                <div className="leaderboard-table">
                  <div className="table-header-row">
                    <span className="col-rank">Rank</span>
                    <span className="col-name">Student</span>
                    <span className="col-score">Score</span>
                    <span className="col-focus">Focus %</span>
                  </div>

                  <div className="table-body">
                    {leaderboard.map((player) => {
                      const isMe = player.name.includes('(You)')
                      return (
                        <div 
                          key={player.rank} 
                          className={`table-row ${isMe ? 'row-highlight' : ''}`}
                        >
                          <span className="col-rank">
                            {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : player.rank}
                          </span>
                          <span className="col-name">{player.name}</span>
                          <span className="col-score">{player.score} XP</span>
                          <span className="col-focus">{player.engagement_score}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="select-prompt">Select an active challenge to view its real-time ranking table.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Competitions
