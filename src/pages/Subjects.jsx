import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSubjects, toggleBookmark } from '../api'

const CATEGORIES = [
  'All',
  'Academic',
  'Programming',
  'Placement Preparation',
  'AI & ML',
  'Web Development',
  'Data Science'
]

const SUBJECT_TOPICS = {
  'math': ['Linear Algebra', 'Calculus', 'Probability & Stats', 'Discrete Math'],
  'english': ['Grammar Rules', 'Reading Comprehension', 'Vocabulary', 'Sentence Correction'],
  'python': ['Data Types', 'Loops & Functions', 'OOP Principles', 'File Handling'],
  'java': ['Syntax & Classes', 'Inheritance', 'Exception Handling', 'Collections Framework'],
  'dbms': ['ER Diagrams', 'SQL Queries', 'Normalization', 'Indexing & Transactions'],
  'ai': ['Search Algorithms', 'Knowledge Rep', 'Neural Nets', 'NLP Basics'],
  'ml': ['Linear Regression', 'Decision Trees', 'SVM & Clustering', 'Evaluation Metrics'],
  'physics': ['Classical Mechanics', 'Electromagnetism', 'Optics', 'Thermodynamics'],
  'chemistry': ['Atomic Structure', 'Organic Reactions', 'Thermodynamics', 'Chemical Bonding'],
  'aptitude': ['Quantitative Methods', 'Ratio & Proportion', 'Time & Work', 'Percentages'],
  'logical_reasoning': ['Syllogisms', 'Blood Relations', 'Data Sufficiency', 'Arrangements'],
  'c_prog': ['Pointers', 'Memory Management', 'Arrays & Structs', 'Preprocessor'],
  'cpp': ['Templates', 'Polymorphism', 'STL containers', 'Pointers & Refs'],
  'javascript': ['ES6+ Features', 'Async/Await', 'DOM Manipulation', 'Closures'],
  'data_structures': ['Arrays & Lists', 'Trees & BSTs', 'Heaps & Graphs', 'Hashing'],
  'algorithms': ['Sorting & Searching', 'Dynamic Programming', 'Greedy Methods', 'Divide & Conquer'],
  'os': ['Process Management', 'Virtual Memory', 'CPU Scheduling', 'Deadlocks'],
  'cn': ['OSI Layers', 'TCP/IP Protocol', 'Routing Algorithms', 'DNS & HTTP'],
  'react': ['Components & Props', 'Hooks (useState, useEffect)', 'State Management', 'Routing'],
  'node_js': ['Express APIs', 'Event Loop', 'Middleware', 'FS Module'],
  'data_science': ['Data Cleaning', 'Exploratory Data Analysis', 'Pandas & Numpy', 'Visualizations'],
  'cyber_security': ['Cryptography', 'Network Security', 'OWASP Top 10', 'Penetration Testing']
}

function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterBookmarkedOnly, setFilterBookmarkedOnly] = useState(false)
  const navigate = useNavigate()

  const loadSubjects = () => {
    setLoading(true)
    fetchSubjects()
      .then(data => {
        setSubjects(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to fetch subjects catalog. Make sure the API is online.')
        setLoading(false)
      })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubjects()
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  const handleBookmarkToggle = async (e, subjectId) => {
    e.stopPropagation()
    try {
      const res = await toggleBookmark(subjectId)
      setSubjects(subjects.map(s => 
        s.id === subjectId ? { ...s, is_bookmarked: res.is_bookmarked } : s
      ))
      window.dispatchEvent(new Event('profile-updated'))
    } catch (err) {
      console.error('Error toggling bookmark:', err)
    }
  }

  const handleBrowseQuizzes = (subjectId) => {
    navigate(`/quiz?subject_id=${subjectId}`)
  }

  const filteredSubjects = subjects.filter((sub) => {
    const matchesSearch = sub.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || sub.category === selectedCategory
    const matchesBookmark = !filterBookmarkedOnly || sub.is_bookmarked
    return matchesSearch && matchesCategory && matchesBookmark
  })

  return (
    <div className="page subjects-page">
      <div className="dashboard-header-container">
        <h1>Subjects Catalog</h1>
        <p className="dashboard-subtitle">Browse study topics, bookmark your focus areas, and launch target assessments.</p>
      </div>

      {/* Filters and Search Panel */}
      <div className="search-filter-panel">
        <div className="search-box-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search subjects or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="bookmark-filter-toggle">
          <label className="switch-label">
            <input
              type="checkbox"
              checked={filterBookmarkedOnly}
              onChange={(e) => setFilterBookmarkedOnly(e.target.checked)}
              className="switch-checkbox"
            />
            <span className="switch-text">Show Bookmarked Only ⭐️</span>
          </label>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs-container">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton-card skeleton-animated" style={{ height: '300px' }}></div>
          ))}
        </div>
      ) : error ? (
        <div className="error-container card">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={loadSubjects}>Retry</button>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="empty-catalog-message card">
          <h3>No subjects match your filters</h3>
          <p>Try resetting the search query or category tabs to browse other topics.</p>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setFilterBookmarkedOnly(false);
            }}
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="subjects-grid">
          {filteredSubjects.map((sub) => {
            const topics = SUBJECT_TOPICS[sub.id] || ['Core concepts', 'Practice sets', 'Advanced review']
            
            // Calculate dummy progress percent based on completions for visual dashboard look
            const progressPercent = sub.completions > 0 ? Math.min(100, Math.round((sub.completions / Math.max(sub.quiz_count, 1)) * 100)) : 0

            return (
              <div 
                key={sub.id} 
                className={`subject-card ${sub.is_bookmarked ? 'bookmarked-card' : ''}`}
                onClick={() => handleBrowseQuizzes(sub.id)}
              >
                <div className="subject-card-header">
                  <span className="subject-category-badge">{sub.category}</span>
                  <button
                    className={`bookmark-btn ${sub.is_bookmarked ? 'active' : ''}`}
                    onClick={(e) => handleBookmarkToggle(e, sub.id)}
                    title={sub.is_bookmarked ? "Remove Bookmark" : "Bookmark Subject"}
                  >
                    {sub.is_bookmarked ? '★' : '☆'}
                  </button>
                </div>

                <h3 className="subject-title">{sub.title}</h3>
                <p className="subject-desc">{sub.description}</p>

                {/* Topics Badges */}
                <div className="subject-topics-container">
                  <span className="topics-label">Topics:</span>
                  <div className="topics-list">
                    {topics.map(topic => (
                      <span key={topic} className="topic-badge">{topic}</span>
                    ))}
                  </div>
                </div>

                {/* Progress bar and metrics */}
                <div className="subject-progress-section">
                  <div className="prog-header">
                    <span className="prog-label">Progress:</span>
                    <span className="prog-percent">{progressPercent}% Completed</span>
                  </div>
                  <div className="prog-bar-container">
                    <div className="prog-bar-fill" style={{ width: `${progressPercent || 5}%`, backgroundColor: progressPercent > 0 ? 'var(--primary)' : '#CBD5E1' }}></div>
                  </div>
                  <div className="prog-stats-row">
                    <span>Quizzes: <strong>{sub.quiz_count}</strong></span>
                    {sub.completions > 0 && (
                      <span>Avg Score: <strong>{sub.avg_score}%</strong></span>
                    )}
                  </div>
                </div>

                <div className="subject-card-footer">
                  <button 
                    className="btn btn-primary btn-block btn-subject-card"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseQuizzes(sub.id);
                    }}
                  >
                    Launch Subject Practice ❯
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Subjects
