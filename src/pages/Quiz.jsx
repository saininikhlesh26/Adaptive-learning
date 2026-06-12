import { useState } from 'react'

function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [showScore, setShowScore] = useState(false)

  const questions = [
    {
      question: 'What is the primary purpose of React?',
      options: ['Build server-side applications', 'Build user interfaces with reusable components', 'Database management', 'Network security'],
      correct: 1,
    },
    {
      question: 'What does useState hook do?',
      options: ['Manages component styling', 'Adds state to functional components', 'Handles routing', 'Makes HTTP requests'],
      correct: 1,
    },
    {
      question: 'What is JSX?',
      options: ['JavaScript XML', 'Java Syntax Extension', 'JavaScript Object Notation', 'JSON Extension'],
      correct: 0,
    },
  ]

  const handleAnswerClick = (index) => {
    if (index === questions[currentQuestion].correct) {
      setScore(score + 1)
    }

    const nextQuestion = currentQuestion + 1
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion)
    } else {
      setShowScore(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestion(0)
    setScore(0)
    setShowScore(false)
  }

  return (
    <div className="page quiz-page">
      <h1>Assessment Quiz</h1>
      
      <div className="quiz-container">
        {showScore ? (
          <div className="score-section">
            <h2>Quiz Complete!</h2>
            <p className="final-score">
              You scored {score} out of {questions.length}
            </p>
            <p className="percentage">
              {((score / questions.length) * 100).toFixed(0)}%
            </p>
            <button className="btn btn-primary" onClick={restartQuiz}>Restart Quiz</button>
          </div>
        ) : (
          <div className="question-section">
            <div className="question-progress">
              Question {currentQuestion + 1} of {questions.length}
            </div>
            <h2>{questions[currentQuestion].question}</h2>
            <div className="options">
              {questions[currentQuestion].options.map((option, index) => (
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
