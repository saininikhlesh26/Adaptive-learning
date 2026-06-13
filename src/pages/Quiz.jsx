import { useState, useEffect, useRef } from 'react'
import { fetchQuizzes, submitQuiz } from '../api'

const getTimestamp = () => Date.now()

function Quiz() {
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState([])
  const [showScore, setShowScore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Tracking Refs
  const tabSwitchesRef = useRef(0)
  const clicksRef = useRef(0)
  const startTimeRef = useRef(0)
  const lastActivityRef = useRef(0)
  const inactivityAccumulatorRef = useRef(0)

  // Fetch quizzes
  useEffect(() => {
    fetchQuizzes()
      .then(data => {
        setQuizzes(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Could not connect to the backend server. Please make sure the FastAPI server is running.')
        setLoading(false)
      })
  }, [])

  // Tracking listeners
  useEffect(() => {
    if (!selectedQuiz || showScore) return

    // Reset trackers
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
    setError(null)
  }

  const handleAnswerClick = (optionIndex) => {
    const updatedAnswers = [...userAnswers, optionIndex]
    setUserAnswers(updatedAnswers)

    const nextQuestion = currentQuestion + 1
    if (nextQuestion < selectedQuiz.questions.length) {
      setCurrentQuestion(nextQuestion)
    } else {
      // Completed last question. Submit!
      setLoading(true)
      const timeSpent = (getTimestamp() - startTimeRef.current) / 1000
      
      const metrics = {
        time_spent: Math.max(1, parseFloat(timeSpent.toFixed(1))),
        tab_switches: tabSwitchesRef.current,
        mouse_clicks: clicksRef.current,
        inactivity_duration: parseFloat(inactivityAccumulatorRef.current.toFixed(1))
      }

      submitQuiz(selectedQuiz.quiz_id, updatedAnswers, metrics)
        .then(res => {
          setResult(res)
          setShowScore(true)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setError('Failed to submit quiz responses to the API.')
          setLoading(false)
        })
    }
  }

  const handleRestart = () => {
    setSelectedQuiz(null)
    setShowScore(false)
    setResult(null)
  }

  // Render loading state
  if (loading && quizzes.length === 0) {
    return (
      <div className="page quiz-page">
        <div className="quiz-loader">
          <div className="spinner"></div>
          <p>Loading assessment details...</p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error && !selectedQuiz) {
    return (
      <div className="page quiz-page">
        <h1>Assessment Quiz</h1>
        <div className="quiz-container error-container">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={() => { setLoading(true); setError(null); fetchQuizzes().then(data=>{setQuizzes(data); setLoading(false);}).catch(err=>{setError(err.message); setLoading(false);}) }}>Retry Connection</button>
        </div>
      </div>
    )
  }

  // Render list of quizzes to select from
  if (!selectedQuiz) {
    return (
      <div className="page quiz-page">
        <h1>Select an Assessment Quiz</h1>
        <p className="subtitle">Each quiz tracks your answers and engagement status to calibrate your study recommendations.</p>
        
        <div className="quiz-grid">
          {quizzes.map((quiz) => (
            <div key={quiz.quiz_id} className="quiz-card">
              <div className="quiz-card-header">
                <h3>{quiz.title}</h3>
                <span className={`difficulty-badge ${quiz.difficulty.toLowerCase()}`}>
                  {quiz.difficulty}
                </span>
              </div>
              <p className="quiz-desc">{quiz.description}</p>
              <div className="quiz-meta">
                <span><strong>Questions:</strong> {quiz.questions.length}</span>
              </div>
              <button className="btn btn-primary" onClick={() => handleStartQuiz(quiz)}>
                Start Assessment
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page quiz-page">
      <h1>Quiz: {selectedQuiz.title}</h1>

      <div className="quiz-container">
        {loading ? (
          <div className="quiz-loader">
            <div className="spinner"></div>
            <p>Analyzing quiz metrics and grading responses...</p>
          </div>
        ) : showScore && result ? (
          <div className="score-section">
            <h2>Quiz Complete!</h2>
            
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
              <h3>Personalized Feedback & Recommendations</h3>
              {result.engagement_level === 'Focused' && (
                <p className="feedback-text">
                  🌟 <strong>Excellent focus!</strong> You were highly engaged throughout the assessment. 
                  We recommend proceeding to the next course or trying a **Hard** difficulty quiz to challenge yourself.
                </p>
              )}
              {result.engagement_level === 'Struggling' && (
                <p className="feedback-text">
                  🧠 <strong>Keep going!</strong> You showed steady focus, but you spent a longer time answering 
                  or missed a few key concepts. We suggest reviewing the fundamental study guide on this topic.
                </p>
              )}
              {result.engagement_level === 'Bored' && (
                <p className="feedback-text">
                  💤 <strong>Let's mix it up!</strong> We detected frequent distractions, tab switching, or rapid 
                  clicking. Try taking shorter study blocks or tackling more advanced material that matches your skill level!
                </p>
              )}
            </div>

            <div className="results-actions">
              <button className="btn btn-primary" onClick={handleRestart}>
                Choose Another Quiz
              </button>
            </div>
          </div>
        ) : (
          <div className="question-section">
            <div className="question-header">
              <div className="question-progress">
                Question {currentQuestion + 1} of {selectedQuiz.questions.length}
              </div>
              <div className="difficulty-tag text-muted">
                Difficulty: {selectedQuiz.difficulty}
              </div>
            </div>
            <h2>{selectedQuiz.questions[currentQuestion].question}</h2>
            <div className="options">
              {selectedQuiz.questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  className="option-btn"
                  onClick={() => handleAnswerClick(index)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Quiz
