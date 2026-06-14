import { useState, useEffect, useRef } from 'react'
import { fetchQuizzes, submitQuiz, fetchRecommendations, fetchSubjects } from '../api'

const getTimestamp = () => Date.now()

function Quiz() {
  const [quizzes, setQuizzes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [showScore, setShowScore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Filtering States
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All')
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState('All')

  // Multi-select and Explanation States
  const [selectedMultiOptions, setSelectedMultiOptions] = useState([])
  const [hasConfirmedAnswer, setHasConfirmedAnswer] = useState(false)
  const [shownHint, setShownHint] = useState(false)

  // Adaptive recommendation state
  const [isStrugglingUser, setIsStrugglingUser] = useState(false)

  // Elapsed Timer state
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  // Tracking Refs
  const tabSwitchesRef = useRef(0)
  const clicksRef = useRef(0)
  const startTimeRef = useRef(0)
  const lastActivityRef = useRef(0)
  const inactivityAccumulatorRef = useRef(0)

  const loadCatalogData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [quizzesData, subjectsData, recData] = await Promise.all([
        fetchQuizzes(),
        fetchSubjects(),
        fetchRecommendations().catch(() => null)
      ])
      
      setQuizzes(quizzesData)
      setSubjects(subjectsData)

      // Set subject filter from URL search param if present
      const queryParams = new URLSearchParams(window.location.search)
      const urlSubject = queryParams.get('subject_id')
      if (urlSubject) {
        setSelectedSubjectFilter(urlSubject)
      }

      // Check if user is graded as Struggling overall
      if (recData && recData.recommended_difficulty === 'Beginner') {
        setIsStrugglingUser(true)
      }

      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('Could not connect to the database. Please verify the backend API server is online.')
      setLoading(false)
    }
  }

  // Load quizzes, subjects, and user recommendations
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCatalogData()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Active tracking listeners & Visible Timer
  useEffect(() => {
    if (!selectedQuiz || showScore) {
      const timer = setTimeout(() => {
        setSecondsElapsed(0)
      }, 0)
      return () => clearTimeout(timer)
    }

    // Reset tracking counters
    tabSwitchesRef.current = 0
    clicksRef.current = 0
    startTimeRef.current = getTimestamp()
    lastActivityRef.current = getTimestamp()
    inactivityAccumulatorRef.current = 0

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchesRef.current += 1
      }
    }

    const handleDocClick = () => {
      clicksRef.current += 1
      lastActivityRef.current = getTimestamp()
    }

    const handleActivity = () => {
      lastActivityRef.current = getTimestamp()
    }

    // Inactivity check every 500ms
    const interval = setInterval(() => {
      const idleTime = getTimestamp() - lastActivityRef.current
      if (idleTime > 4000) {
        inactivityAccumulatorRef.current += 0.5
      }
    }, 500)

    // Elapsed visual timer interval (seconds)
    const visualTimer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1)
    }, 1000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('click', handleDocClick)
    document.addEventListener('mousemove', handleActivity)
    document.addEventListener('keydown', handleActivity)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('click', handleDocClick)
      document.removeEventListener('mousemove', handleActivity)
      document.removeEventListener('keydown', handleActivity)
      clearInterval(interval)
      clearInterval(visualTimer)
    }
  }, [selectedQuiz, showScore])

  const handleStartQuiz = (quiz) => {
    setSelectedQuiz(quiz)
    setCurrentQuestion(0)
    setUserAnswers([])
    setShowScore(false)
    setResult(null)
    setHasConfirmedAnswer(false)
    setSelectedMultiOptions([])
    setShownHint(false)
    
    fetchRecommendations()
      .then(rec => {
        const isWeak = rec.weak_topics.some(t => t.toLowerCase() === quiz.subject_id)
        if (isWeak || rec.recommended_difficulty === 'Beginner') {
          setIsStrugglingUser(true)
        } else {
          setIsStrugglingUser(false)
        }
      })
      .catch(() => {})
  }

  // Handle answers click
  const handleSelectOption = (optionIndex) => {
    const q = selectedQuiz.questions[currentQuestion]
    
    if (q.type === 'Multi-select') {
      if (selectedMultiOptions.includes(optionIndex)) {
        setSelectedMultiOptions(selectedMultiOptions.filter(idx => idx !== optionIndex))
      } else {
        setSelectedMultiOptions([...selectedMultiOptions, optionIndex])
      }
    } else {
      // MCQ or True/False - single choice
      if (isStrugglingUser) {
        setSelectedMultiOptions([optionIndex])
        setHasConfirmedAnswer(true)
      } else {
        const updated = [...userAnswers, optionIndex]
        setUserAnswers(updated)
        advanceQuiz(updated)
      }
    }
  }

  const handleConfirmMultiSelect = () => {
    if (isStrugglingUser) {
      setHasConfirmedAnswer(true)
    } else {
      const updated = [...userAnswers, selectedMultiOptions]
      setUserAnswers(updated)
      setSelectedMultiOptions([])
      advanceQuiz(updated)
    }
  }

  const handleNextQuestionAfterExplanation = () => {
    const ans = selectedQuiz.questions[currentQuestion].type === 'Multi-select' 
      ? selectedMultiOptions 
      : selectedMultiOptions[0]
      
    const updated = [...userAnswers, ans]
    setUserAnswers(updated)
    setHasConfirmedAnswer(false)
    setSelectedMultiOptions([])
    setShownHint(false)
    advanceQuiz(updated)
  }

  const advanceQuiz = (currentAnswersList) => {
    const nextQuestion = currentQuestion + 1
    if (nextQuestion < selectedQuiz.questions.length) {
      setCurrentQuestion(nextQuestion)
    } else {
      submitQuizResults(currentAnswersList)
    }
  }

  const submitQuizResults = (answersList) => {
    setLoading(true)
    const timeSpent = (getTimestamp() - startTimeRef.current) / 1000
    
    const metrics = {
      time_spent: Math.max(1, parseFloat(timeSpent.toFixed(1))),
      tab_switches: tabSwitchesRef.current,
      mouse_clicks: clicksRef.current,
      inactivity_duration: parseFloat(inactivityAccumulatorRef.current.toFixed(1))
    }

    submitQuiz(selectedQuiz.quiz_id, answersList, metrics)
      .then(res => {
        setResult(res)
        setShowScore(true)
        setLoading(false)
        window.dispatchEvent(new Event('profile-updated'))
      })
      .catch(err => {
        console.error(err)
        setError('Failed to submit quiz responses to the API.')
        setLoading(false)
      })
  }

  const handleRestart = () => {
    setSelectedQuiz(null)
    setShowScore(false)
    setResult(null)
    setHasConfirmedAnswer(false)
    setSelectedMultiOptions([])
    setShownHint(false)
  }

  // Format visual timer helper
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Filter quizzes catalog list
  const filteredQuizzes = quizzes.filter(q => {
    const matchesSub = selectedSubjectFilter === 'All' || q.subject_id === selectedSubjectFilter
    const matchesDiff = selectedDifficultyFilter === 'All' || q.difficulty === selectedDifficultyFilter
    return matchesSub && matchesDiff
  })

  if (loading && quizzes.length === 0) {
    return (
      <div className="page quiz-page">
        <div className="quiz-loader">
          <div className="spinner"></div>
          <p>Loading course assessment materials...</p>
        </div>
      </div>
    )
  }

  if (error && !selectedQuiz) {
    return (
      <div className="page quiz-page">
        <div className="dashboard-header-container">
          <h1>Subject Quizzes</h1>
        </div>
        <div className="error-container card">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={loadCatalogData}>Retry Connection</button>
        </div>
      </div>
    )
  }

  // Quiz listing view
  if (!selectedQuiz) {
    return (
      <div className="page quiz-page">
        <div className="dashboard-header-container">
          <h1>Assessments & Quizzes</h1>
          <p className="dashboard-subtitle">
            Select a quiz to test your skill level. The ML system adjusts future difficulties and paths based on your response behaviors.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="search-filter-panel">
          <div className="form-group flex-1">
            <label htmlFor="filter-subject">Filter by Subject</label>
            <select 
              id="filter-subject"
              value={selectedSubjectFilter} 
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>

          <div className="form-group flex-1">
            <label htmlFor="filter-difficulty">Filter by Difficulty</label>
            <select 
              id="filter-difficulty"
              value={selectedDifficultyFilter} 
              onChange={(e) => setSelectedDifficultyFilter(e.target.value)}
            >
              <option value="All">All Difficulties</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {filteredQuizzes.length === 0 ? (
          <div className="empty-catalog-message card">
            <h3>No quizzes match your filters</h3>
            <p>Try resetting the subject or difficulty options to view other assessments.</p>
          </div>
        ) : (
          <div className="quiz-grid">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.quiz_id} className="quiz-card">
                <div className="quiz-card-header">
                  <span className="subject-category-badge">{quiz.topic}</span>
                  <span className={`difficulty-badge ${quiz.difficulty.toLowerCase()}`}>
                    {quiz.difficulty}
                  </span>
                </div>
                <h3 className="quiz-title-display">{quiz.title}</h3>
                <p className="quiz-desc">{quiz.description}</p>
                <div className="quiz-meta-row">
                  <span>Questions: <strong>{quiz.questions.length}</strong></span>
                  <span>
                    Subject: <strong>{subjects.find(s => s.id === quiz.subject_id)?.title || quiz.subject_id}</strong>
                  </span>
                </div>
                <button className="btn btn-primary btn-block btn-quiz-card-start" onClick={() => handleStartQuiz(quiz)}>
                  Start Assessment ❯
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Active quiz playing view
  const q = selectedQuiz.questions[currentQuestion]
  const isMulti = q.type === 'Multi-select'
  const progressPercent = Math.round(((currentQuestion + 1) / selectedQuiz.questions.length) * 100)

  return (
    <div className="page quiz-page">
      <div className="quiz-play-layout">
        
        {/* Top bar with progress indicator, timer, and difficulty badge */}
        <div className="quiz-top-bar">
          <div className="bar-left">
            <span className={`difficulty-badge ${selectedQuiz.difficulty.toLowerCase()}`}>
              {selectedQuiz.difficulty} Difficulty
            </span>
            <span className="quiz-topic-text">{selectedQuiz.topic}</span>
          </div>

          <div className="bar-center">
            {/* Visual Progress Indicator */}
            <div className="progress-bar-wrap">
              <span className="progress-text">Question {currentQuestion + 1} of {selectedQuiz.questions.length}</span>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bar-right">
            {/* Timer Display */}
            <div className="timer-badge">
              <span className="timer-icon">⏱️</span>
              <span className="timer-val">{formatTime(secondsElapsed)}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="quiz-active-container card">
            <div className="quiz-loader">
              <div className="spinner"></div>
              <p>Grading responses and updating student recommendations...</p>
            </div>
          </div>
        ) : showScore && result ? (
          /* SCORE RESULTS SCREEN */
          <div className="quiz-active-container card">
            <div className="score-section">
              <span className="trophy-icon">🏆</span>
              <h2>Assessment Finished!</h2>
              
              <div className="results-grid">
                <div className="result-metric-card">
                  <h3>Score Achieved</h3>
                  <p className="percentage">{result.percentage}%</p>
                  <p className="final-score">
                    Correct answers: {result.score} / {result.total}
                  </p>
                </div>

                <div className={`result-metric-card engagement-card ${result.engagement_level.toLowerCase()}`}>
                  <h3>Engagement Profile</h3>
                  <p className="engagement-value">{result.engagement_level}</p>
                  <p className="confidence-value">Engine Confidence: {result.confidence}%</p>
                </div>
              </div>

              <div className="feedback-section">
                <h3>AI Recommendation Insights</h3>
                {result.engagement_level === 'Focused' && (
                  <p className="feedback-text">
                    🌟 <strong>High Focus!</strong> You maintained steady pacing and did not switch browser tabs. We recommend attempting **Advanced** difficulty challenges in this subject area!
                  </p>
                )}
                {result.engagement_level === 'Struggling' && (
                  <p className="feedback-text">
                    🧠 <strong>Adaptive Hints Enabled!</strong> You focused well but struggled with the timing. For your next quiz, we've unlocked interactive guides and hints to reinforce concepts.
                  </p>
                )}
                {result.engagement_level === 'Bored' && (
                  <p className="feedback-text">
                    💤 <strong>Pace Accelerated!</strong> We detected rapid clicking and signs of low engagement. We suggest testing yourself against a **Competition challenge**!
                  </p>
                )}
              </div>

              <div className="results-actions">
                <button className="btn btn-primary" onClick={handleRestart}>
                  Browse Quizzes Catalog
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTIONS SCREEN - Focused reading experience */
          <div className="quiz-active-container card">
            <div className="question-focused-block">
              <div className="question-number-badge">
                Question {currentQuestion + 1}
              </div>
              
              <h2 className="question-title-text">{q.question}</h2>

              {isMulti && (
                <p className="question-type-hint">Select all correct options that apply, then click "Confirm Selection".</p>
              )}

              {/* Render choices in a clean, spaced layout */}
              <div className="options-container">
                {q.type === 'True/False' ? (
                  <div className="tf-options-row">
                    {['True', 'False'].map((label, idx) => (
                      <button
                        key={idx}
                        className={`option-btn option-tf-btn ${
                          hasConfirmedAnswer && selectedMultiOptions.includes(idx) ? 'selected' : ''
                        }`}
                        disabled={hasConfirmedAnswer}
                        onClick={() => handleSelectOption(idx)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : isMulti ? (
                  <div className="options-list">
                    {q.options.map((option, idx) => (
                      <label 
                        key={idx} 
                        className={`option-checkbox-wrapper ${
                          selectedMultiOptions.includes(idx) ? 'checked' : ''
                        } ${hasConfirmedAnswer ? 'disabled-label' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMultiOptions.includes(idx)}
                          disabled={hasConfirmedAnswer}
                          onChange={() => handleSelectOption(idx)}
                          className="checkbox-control"
                        />
                        <span className="checkbox-text">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="options-list">
                    {q.options.map((option, idx) => (
                      <button
                        key={idx}
                        className={`option-btn ${
                          selectedMultiOptions.includes(idx) ? 'selected' : ''
                        }`}
                        disabled={hasConfirmedAnswer}
                        onClick={() => handleSelectOption(idx)}
                      >
                        <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                        <span className="option-text">{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-select confirm button */}
              {isMulti && !hasConfirmedAnswer && (
                <div className="confirm-btn-container">
                  <button
                    className="btn btn-primary btn-confirm-multi"
                    onClick={handleConfirmMultiSelect}
                    disabled={selectedMultiOptions.length === 0}
                  >
                    Confirm Selection
                  </button>
                </div>
              )}

              {/* ADAPTIVE HELPERS: Hint trigger for struggling students */}
              {isStrugglingUser && q.hint && !hasConfirmedAnswer && (
                <div className="hint-adaptive-container">
                  {shownHint ? (
                    <div className="hint-box-display">
                      <span className="hint-title">💡 Hint:</span>
                      <p>{q.hint}</p>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-hint-request"
                      onClick={() => setShownHint(true)}
                    >
                      Need a Hint? Click Here 💡
                    </button>
                  )}
                </div>
              )}

              {/* ADAPTIVE HELPERS: Post-explanation screen */}
              {hasConfirmedAnswer && (
                <div className="explanation-adaptive-container">
                  <div className="grading-banner">
                    {isMulti ? (
                      <p className="grading-feedback-partial">
                        Selection recorded. Review explanation before proceeding.
                      </p>
                    ) : (
                      <p className={`grading-feedback-flag ${selectedMultiOptions[0] === q.correct ? 'correct' : 'incorrect'}`}>
                        {selectedMultiOptions[0] === q.correct 
                          ? '✓ Correct Answer!' 
                          : `✗ Incorrect. Correct answer: ${q.options[q.correct]}`
                        }
                      </p>
                    )}
                  </div>
                  {q.explanation && (
                    <div className="explanation-text-display">
                      <h4>Explanation:</h4>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                  <button className="btn btn-primary next-question-btn" onClick={handleNextQuestionAfterExplanation}>
                    Next Question ❯
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Quiz
