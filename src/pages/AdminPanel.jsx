import { useState, useEffect } from 'react'
import { fetchAdminMetrics, adminCreateQuiz, createSubject, fetchSubjects } from '../api'

function AdminPanel() {
  const [metrics, setMetrics] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('metrics')

  // Subject Form State
  const [subId, setSubId] = useState('')
  const [subTitle, setSubTitle] = useState('')
  const [subCategory, setSubCategory] = useState('Academic')
  const [subDesc, setSubDesc] = useState('')
  const [subTopics, setSubTopics] = useState('')
  const [subSuccess, setSubSuccess] = useState(false)

  // Quiz Form State
  const [quizId, setQuizId] = useState('')
  const [quizTitle, setQuizTitle] = useState('')
  const [quizSubject, setQuizSubject] = useState('')
  const [quizDifficulty, setQuizDifficulty] = useState('Beginner')
  const [quizTopic, setQuizTopic] = useState('')
  const [quizDesc, setQuizDesc] = useState('')
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correct: 0, type: 'MCQ', hint: '', explanation: '' }
  ])
  const [quizSuccess, setQuizSuccess] = useState(false)

  const loadAdminData = () => {
    setLoading(true)
    Promise.all([fetchAdminMetrics(), fetchSubjects()])
      .then(([metricsData, subjectsList]) => {
        setMetrics(metricsData)
        setSubjects(subjectsList)
        if (subjectsList.length > 0) {
          setQuizSubject(subjectsList[0].id)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to fetch admin metrics. Please verify you are authenticated as an Admin.')
        setLoading(false)
      })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAdminData()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Quiz questions dynamic adding/updating helpers
  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions]
    updated[index][field] = value
    setQuestions(updated)
  }

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions]
    updated[qIndex].options[optIndex] = value
    setQuestions(updated)
  }

  const handleAddQuestion = () => {
    setQuestions([...questions, { 
      question: '', 
      options: ['', '', '', ''], 
      correct: 0, 
      type: 'MCQ', 
      hint: '', 
      explanation: '' 
    }])
  }

  const handleRemoveQuestion = (index) => {
    if (questions.length === 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSubjectSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubSuccess(false)
    
    try {
      const topicList = subTopics.split(',').map(t => t.trim()).filter(Boolean)
      await createSubject({
        id: subId.toLowerCase().replace(/\s+/g, '_'),
        title: subTitle,
        category: subCategory,
        description: subDesc,
        topics: topicList
      })
      setSubSuccess(true)
      // Clear fields
      setSubId('')
      setSubTitle('')
      setSubDesc('')
      setSubTopics('')
      loadAdminData()
    } catch (err) {
      setError(err.message || 'Failed to create subject.')
    }
  }

  const handleQuizSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setQuizSuccess(false)

    try {
      // Format questions' correct answers based on type
      const formattedQuestions = questions.map(q => {
        let correctValue;
        
        if (q.type === 'True/False') {
          // ensure it's 0 (True) or 1 (False)
          correctValue = parseInt(q.correct)
        } else if (q.type === 'Multi-select') {
          // If correct is input as comma separated string e.g. "0,2"
          if (typeof q.correct === 'string') {
            correctValue = q.correct.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
          } else if (Array.isArray(q.correct)) {
            correctValue = q.correct.map(n => parseInt(n))
          } else {
            correctValue = [parseInt(q.correct)]
          }
        } else {
          correctValue = parseInt(q.correct)
        }
        
        return {
          ...q,
          correct: correctValue,
          options: q.type === 'True/False' ? ['True', 'False'] : q.options.filter(Boolean)
        }
      })

      await adminCreateQuiz({
        quiz_id: quizId.toLowerCase().replace(/\s+/g, '_'),
        title: quizTitle,
        difficulty: quizDifficulty,
        subject_id: quizSubject,
        topic: quizTopic || 'General',
        description: quizDesc,
        questions: formattedQuestions
      })

      setQuizSuccess(true)
      // Reset quiz form
      setQuizId('')
      setQuizTitle('')
      setQuizTopic('')
      setQuizDesc('')
      setQuestions([{ question: '', options: ['', '', '', ''], correct: 0, type: 'MCQ', hint: '', explanation: '' }])
      loadAdminData()
    } catch (err) {
      setError(err.message || 'Failed to create quiz.')
    }
  }

  if (loading) {
    return (
      <div className="page admin-page">
        <div className="quiz-loader">
          <div className="spinner"></div>
          <p>Verifying admin keys and loading platform database statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page admin-page">
      <div className="dashboard-header-container">
        <h1>Administrator Dashboard</h1>
        <p className="dashboard-subtitle">Manage quizzes, subject catalogs, and view system-wide engagement metrics.</p>
      </div>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Admin Tab Controls */}
      <div className="category-tabs-container">
        <button 
          className={`category-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          📈 System Analytics
        </button>
        <button 
          className={`category-tab-btn ${activeTab === 'subject' ? 'active' : ''}`}
          onClick={() => setActiveTab('subject')}
        >
          📂 Add Subject
        </button>
        <button 
          className={`category-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          ✍️ Construct Quiz
        </button>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'metrics' && metrics && (
        <div className="admin-tab-content">
          <div className="dashboard-grid">
            <div className="stat-card">
              <h3>Registered Students</h3>
              <p className="stat-value">{metrics.total_users}</p>
            </div>
            <div className="stat-card">
              <h3>Active Quizzes</h3>
              <p className="stat-value">{metrics.total_quizzes}</p>
            </div>
            <div className="stat-card">
              <h3>Active Subjects</h3>
              <p className="stat-value">{metrics.total_subjects}</p>
            </div>
            <div className="stat-card">
              <h3>Total Assessments Submitted</h3>
              <p className="stat-value">{metrics.total_submissions}</p>
            </div>
          </div>

          <div className="admin-layout-row">
            <div className="admin-layout-card glass-card">
              <h3>Global Performance & Engagement</h3>
              <div className="metrics-summary-list">
                <div className="metric-row">
                  <span>Global Average Score:</span>
                  <strong className="text-info">{metrics.global_average_score}%</strong>
                </div>
                <div className="metric-row">
                  <span>Focused Students Sessions:</span>
                  <strong className="text-success">{metrics.engagement_distribution.Focused}</strong>
                </div>
                <div className="metric-row">
                  <span>Struggling Students Sessions:</span>
                  <strong className="text-warning">{metrics.engagement_distribution.Struggling}</strong>
                </div>
                <div className="metric-row">
                  <span>Bored Students Sessions:</span>
                  <strong className="text-danger">{metrics.engagement_distribution.Bored}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Tab */}
      {activeTab === 'subject' && (
        <div className="admin-tab-content glass-card">
          <h3>Create a New Subject Catalog</h3>
          {subSuccess && <div className="success-alert">✓ Subject created successfully!</div>}
          
          <form onSubmit={handleSubjectSubmit} className="admin-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>Subject ID * (Lowercase short name, e.g. "c_prog")</label>
                <input 
                  type="text" 
                  value={subId} 
                  onChange={(e) => setSubId(e.target.value)} 
                  placeholder="e.g. c_prog" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Display Title *</label>
                <input 
                  type="text" 
                  value={subTitle} 
                  onChange={(e) => setSubTitle(e.target.value)} 
                  placeholder="e.g. C Programming" 
                  required 
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Category *</label>
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                  <option value="Academic">Academic</option>
                  <option value="Programming">Programming</option>
                  <option value="Placement Preparation">Placement Preparation</option>
                  <option value="AI & ML">AI & ML</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Data Science">Data Science</option>
                </select>
              </div>
              <div className="form-group">
                <label>Subtopics (Comma-separated list)</label>
                <input 
                  type="text" 
                  value={subTopics} 
                  onChange={(e) => setSubTopics(e.target.value)} 
                  placeholder="e.g. Variables, Pointers, Memory Allocation" 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea 
                value={subDesc} 
                onChange={(e) => setSubDesc(e.target.value)} 
                rows="3" 
                placeholder="Brief summary of the subject's curriculum..." 
                required
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary">Create Subject Catalog</button>
          </form>
        </div>
      )}

      {/* Add Quiz Tab */}
      {activeTab === 'quiz' && (
        <div className="admin-tab-content glass-card">
          <h3>Construct a New Assessment Quiz</h3>
          {quizSuccess && <div className="success-alert">✓ Assessment Quiz created and seeded successfully!</div>}

          <form onSubmit={handleQuizSubmit} className="admin-form">
            <div className="form-row-2">
              <div className="form-group">
                <label>Quiz Unique ID *</label>
                <input 
                  type="text" 
                  value={quizId} 
                  onChange={(e) => setQuizId(e.target.value)} 
                  placeholder="e.g. python_basics" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Quiz Display Title *</label>
                <input 
                  type="text" 
                  value={quizTitle} 
                  onChange={(e) => setQuizTitle(e.target.value)} 
                  placeholder="e.g. Python Fundamentals Quiz" 
                  required 
                />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label>Subject Catalog *</label>
                <select value={quizSubject} onChange={(e) => setQuizSubject(e.target.value)} required>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Difficulty *</label>
                <select value={quizDifficulty} onChange={(e) => setQuizDifficulty(e.target.value)}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="form-group">
                <label>Target Topic *</label>
                <input 
                  type="text" 
                  value={quizTopic} 
                  onChange={(e) => setQuizTopic(e.target.value)} 
                  placeholder="e.g. Variables" 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea 
                value={quizDesc} 
                onChange={(e) => setQuizDesc(e.target.value)} 
                rows="2" 
                placeholder="A short description of what concepts this quiz covers..." 
                required
              ></textarea>
            </div>

            {/* Questions Builder */}
            <div className="questions-builder-section">
              <h4>Quiz Questions ({questions.length})</h4>
              
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="question-builder-card glass-card">
                  <div className="q-card-header">
                    <h5>Question #{qIdx + 1}</h5>
                    {questions.length > 1 && (
                      <button 
                        type="button" 
                        className="btn-remove-q"
                        onClick={() => handleRemoveQuestion(qIdx)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Question Text *</label>
                    <input 
                      type="text" 
                      value={q.question} 
                      onChange={(e) => handleQuestionChange(qIdx, 'question', e.target.value)} 
                      placeholder="e.g. Which of the following is a mutable datatype?" 
                      required 
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Question Type *</label>
                      <select 
                        value={q.type} 
                        onChange={(e) => handleQuestionChange(qIdx, 'type', e.target.value)}
                      >
                        <option value="MCQ">Multiple Choice (MCQ)</option>
                        <option value="True/False">True / False</option>
                        <option value="Multi-select">Multi-select (Multiple correct options)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Correct Answer Index *</label>
                      {q.type === 'True/False' ? (
                        <select 
                          value={q.correct} 
                          onChange={(e) => handleQuestionChange(qIdx, 'correct', e.target.value)}
                        >
                          <option value={0}>True (Index 0)</option>
                          <option value={1}>False (Index 1)</option>
                        </select>
                      ) : q.type === 'Multi-select' ? (
                        <input 
                          type="text" 
                          value={q.correct} 
                          onChange={(e) => handleQuestionChange(qIdx, 'correct', e.target.value)} 
                          placeholder="e.g. 0,2 (comma separated indices)" 
                          required 
                        />
                      ) : (
                        <select 
                          value={q.correct} 
                          onChange={(e) => handleQuestionChange(qIdx, 'correct', e.target.value)}
                        >
                          <option value={0}>Option 1 (Index 0)</option>
                          <option value={1}>Option 2 (Index 1)</option>
                          <option value={2}>Option 3 (Index 2)</option>
                          <option value={3}>Option 4 (Index 3)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {q.type !== 'True/False' && (
                    <div className="form-row-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="form-group">
                          <label>Option {oIdx + 1} *</label>
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)} 
                            placeholder={`Option ${oIdx + 1}`} 
                            required 
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Question Hint</label>
                      <input 
                        type="text" 
                        value={q.hint} 
                        onChange={(e) => handleQuestionChange(qIdx, 'hint', e.target.value)} 
                        placeholder="Helpful hint for struggling students" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Detailed Explanation</label>
                      <input 
                        type="text" 
                        value={q.explanation} 
                        onChange={(e) => handleQuestionChange(qIdx, 'explanation', e.target.value)} 
                        placeholder="Detailed answer explanation" 
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button 
                type="button" 
                className="btn btn-secondary btn-add-q" 
                onClick={handleAddQuestion}
              >
                + Add Another Question
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-block">Seed Quiz to Catalog</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
