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

  // Tracking Refs
  const tabSwitchesRef = useRef(0)
  const clicksRef = useRef(0)
  const startTimeRef = useRef(0)
  const lastActivityRef = useRef(0)
  const inactivityAccumulatorRef = useRef(0)

  // Load quizzes, subjects, and user recommendations
  useEffect(() => {
    loadCatalogData()
  }, [])

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

  // Active tracking listeners
  useEffect(() => {
    if (!selectedQuiz || showScore) return

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
      if (idleTime > 4000) { // user idle for > 4s
        inactivityAccumulatorRef.current += 0.5
      }
    }, 500)

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
    
    // Check if user has weak grades in this subject to toggle hints
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
        // Struggling students get detailed explanation screen before next question
        setSelectedMultiOptions([optionIndex])
        setHasConfirmedAnswer(true)
      } else {
        // Focused/Bored users skip explanation screen instantly for speed
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
        // Fire custom profile update event to keep layout synchronized
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
        <div className="quiz-container error-container glass-card">
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
          <h1>Course Quizzes & Assessments</h1>
          <p className="dashboard-subtitle">Select a quiz to test your knowledge. The engine tracks behavioral stats to calibrate study recommendations.</p>
        </div>

        {/* Filter Toolbar */}
        <div className="search-filter-panel glass-card">
          <div className="form-group flex-1">
            <label>Filter by Subject</label>
            <select 
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
            <label>Filter by Difficulty</label>
            <select 
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
          <div className="empty-catalog-message glass-card">
            <h3>No quizzes match your filters</h3>
            <p>Try resetting the subject or difficulty options to view other assessments.</p>
          </div>
        ) : (
          <div className="quiz-grid">
            {filteredQuizzes.map((quiz) => (
              <div key={quiz.quiz_id} className="quiz-card glass-card">
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
                  <span className="quiz-subject-label">
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

  return (
    <div className="page quiz-page">
      <div className="dashboard-header-container">
        <h1>{selectedQuiz.title}</h1>
        <p className="dashboard-subtitle">Question {currentQuestion + 1} of {selectedQuiz.questions.length}</p>
      </div>

      <div className="quiz-active-container glass-card">
        {loading ? (
          <div className="quiz-loader">
            <div className="spinner"></div>
            <p>Grading responses and updating student recommendations...</p>
          </div>
        ) : showScore && result ? (
          /* SCORE RESULTS SCREEN */
          <div className="score-section">
            <h2>Assessment Finished!</h2>
            
            <div className="results-grid">
              <div className="result-metric-card">
                <h3>Score</h3>
                <p className="percentage">{result.percentage}%</p>
                <p className="final-score">
                  You scored {result.score} out of {result.total}
                </p>
              </div>

              <div className={`result-metric-card engagement-card ${result.engagement_level.toLowerCase()}`}>
                <h3>Engagement Level</h3>
                <p className="engagement-value">{result.engagement_level}</p>
                <p className="confidence-value">Confidence: {result.confidence}%</p>
              </div>
            </div>

            <div className="feedback-section">
              <h3>Personalized Path Feedback</h3>
              {result.engagement_level === 'Focused' && (
                <p className="feedback-text">
                  🌟 <strong>Outstanding focus!</strong> You were highly engaged throughout the assessment. 
                  Try unlocking a higher difficulty quiz or take a challenge in the **Competitions** menu!
                </p>
              )}
              {result.engagement_level === 'Struggling' && (
                <p className="feedback-text">
                  🧠 <strong>Support Enabled!</strong> You showed steady focus, but spent more time on some questions. 
                  We will enable inline hints and detailed explanations on your next beginner quizzes.
                </p>
              )}
              {result.engagement_level === 'Bored' && (
                <p className="feedback-text">
                  💤 <strong>Let's level up!</strong> We detected fast clicks or frequent distractions. 
                  We suggest switching to **Advanced** assessments or joining a **Competition Challenge** to test yourself.
                </p>
              )}
            </div>

            <div className="results-actions">
              <button className="btn btn-primary" onClick={handleRestart}>
                Browse Quizzes Catalog
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE QUESTIONS SCREEN */
          <div className="question-section-display">
            <div className="question-header-display">
              <span className={`difficulty-badge ${selectedQuiz.difficulty.toLowerCase()}`}>
                {selectedQuiz.difficulty}
              </span>
              <span className="question-type-badge">{q.type}</span>
            </div>

            <h2 className="question-text">{q.question}</h2>

            {/* Render choices */}
            <div className="options-container">
              {q.type === 'True/False' ? (
                // True/False buttons
                <div className="tf-options-row">
                  {['True', 'False'].map((label, idx) => (
                    <button
                      key={idx}
                      className={`option-btn option-btn-tf ${
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
                // Multi-select Checkboxes
                <div className="options-list">
                  {q.options.map((option, idx) => (
                    <label 
                      key={idx} 
                      className={`option-checkbox-label ${
                        selectedMultiOptions.includes(idx) ? 'checked' : ''
                      } ${hasConfirmedAnswer ? 'disabled-label' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedMultiOptions.includes(idx)}
                        disabled={hasConfirmedAnswer}
                        onChange={() => handleSelectOption(idx)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                // MCQ Radio buttons
                <div className="options-list">
                  {q.options.map((option, idx) => (
                    <button
                      key={idx}
                      className={`option-btn ${
                        hasConfirmedAnswer && selectedMultiOptions.includes(idx) ? 'selected' : ''
                      }`}
                      disabled={hasConfirmedAnswer}
                      onClick={() => handleSelectOption(idx)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Multi-select confirm button */}
            {isMulti && !hasConfirmedAnswer && (
              <div className="confirm-btn-container">
                <button
                  className="btn btn-primary"
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
                  <div className="hint-box glass-card">
                    <strong>💡 Hint:</strong> {q.hint}
                  </div>
                ) : (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-hint"
                    onClick={() => setShownHint(true)}
                  >
                    Request Hint 💡
                  </button>
                )}
              </div>
            )}

            {/* ADAPTIVE HELPERS: Post-explanation screen */}
            {hasConfirmedAnswer && (
              <div className="explanation-adaptive-container glass-card">
                <h3>Question Grading & Explanation</h3>
                <div className="grading-status-row">
                  {isMulti ? (
                    // Show partial grading feedback
                    <p className="grading-feedback-partial">
                      Answers recorded. Review the explanation below before moving on.
                    </p>
                  ) : (
                    // Show MCQ status
                    <p className={`grading-feedback ${selectedMultiOptions[0] === q.correct ? 'correct' : 'incorrect'}`}>
                      {selectedMultiOptions[0] === q.correct 
                        ? '✓ Correct Answer!' 
                        : `✗ Incorrect. Correct option was: ${q.options[q.correct]}`
                      }
                    </p>
                  )}
                </div>
                {q.explanation && (
                  <p className="explanation-text-display">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
                <button className="btn btn-primary next-question-btn" onClick={handleNextQuestionAfterExplanation}>
                  Next Question ❯
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Quiz
