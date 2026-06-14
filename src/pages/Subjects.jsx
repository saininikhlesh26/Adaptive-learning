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

function Subjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [filterBookmarkedOnly, setFilterBookmarkedOnly] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadSubjects()
  }, [])

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

  const handleBookmarkToggle = async (e, subjectId) => {
    e.stopPropagation() // Prevent card click trigger
    try {
      const res = await toggleBookmark(subjectId)
      setSubjects(subjects.map(s => 
        s.id === subjectId ? { ...s, is_bookmarked: res.is_bookmarked } : s
      ))
      // Fire custom profile update event to keep layout synchronized
      window.dispatchEvent(new Event('profile-updated'))
    } catch (err) {
      console.error('Error toggling bookmark:', err)
    }
  }

  const handleBrowseQuizzes = (subjectId) => {
    navigate(`/quiz?subject_id=${subjectId}`)
  }

  // Filter subjects based on search text, category, and bookmarks toggle
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
      <div className="search-filter-panel glass-card">
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
            <div key={n} className="skeleton-card skeleton-animated"></div>
          ))}
        </div>
      ) : error ? (
        <div className="quiz-container error-container glass-card">
          <p className="error-message">{error}</p>
          <button className="btn btn-primary" onClick={loadSubjects}>Retry</button>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="empty-catalog-message glass-card">
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
          {filteredSubjects.map((sub) => (
            <div 
              key={sub.id} 
              className={`subject-card glass-card ${sub.is_bookmarked ? 'bookmarked-card' : ''}`}
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

              {/* Progress metrics inside the card */}
              <div className="subject-progress-summary">
                <div className="prog-stat">
                  <span className="prog-label">Quizzes:</span>
                  <span className="prog-val">{sub.quiz_count}</span>
                </div>
                {sub.completions > 0 && (
                  <>
                    <div className="prog-stat">
                      <span className="prog-label">Completed:</span>
                      <span className="prog-val text-success">{sub.completions}</span>
                    </div>
                    <div className="prog-stat">
                      <span className="prog-label">Avg Score:</span>
                      <span className="prog-val text-info">{sub.avg_score}%</span>
                    </div>
                  </>
                )}
              </div>

              <div className="subject-card-footer">
                <button 
                  className="btn btn-primary btn-block btn-subject-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseQuizzes(sub.id);
                  }}
                >
                  Start Quizzes ❯
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Subjects
