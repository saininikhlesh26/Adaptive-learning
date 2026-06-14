import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, isAuthenticated, checkBackendHealth } from '../api'

const INTEREST_OPTIONS = [
  { id: 'math', label: 'Mathematics' },
  { id: 'physics', label: 'Physics' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'english', label: 'English' },
  { id: 'aptitude', label: 'Aptitude' },
  { id: 'logical_reasoning', label: 'Logical Reasoning' },
  { id: 'c_prog', label: 'C Programming' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'data_structures', label: 'Data Structures' },
  { id: 'algorithms', label: 'Algorithms' },
  { id: 'dbms', label: 'DBMS' },
  { id: 'os', label: 'OS' },
  { id: 'cn', label: 'CN' },
  { id: 'react', label: 'React' },
  { id: 'node_js', label: 'Node.js' },
  { id: 'ml', label: 'Machine Learning' },
  { id: 'ai', label: 'AI' },
  { id: 'data_science', label: 'Data Science' },
  { id: 'cyber_security', label: 'Cyber Security' }
]

function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [educationLevel, setEducationLevel] = useState('Undergraduate')
  const [selectedInterests, setSelectedInterests] = useState([])
  const [learningGoals, setLearningGoals] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const [debugOpen, setDebugOpen] = useState(false)
  const [backendHealth, setBackendHealth] = useState(null)
  const [lastRequest, setLastRequest] = useState(null)

  useEffect(() => {
    const verifyHealth = async () => {
      const health = await checkBackendHealth();
      setBackendHealth(health);
    };
    verifyHealth();

    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.lastApiRequest) {
        setLastRequest({ ...window.lastApiRequest });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Real-time password validation checks
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSymbol

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard')
    }
  }, [navigate])

  const handleInterestToggle = (interestId) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(id => id !== interestId))
    } else {
      setSelectedInterests([...selectedInterests, interestId])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (!isPasswordValid) {
          throw new Error('Password does not meet the strict security requirements.')
        }
        if (selectedInterests.length === 0) {
          throw new Error('Please select at least one learning interest.')
        }
        await register({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          education_level: educationLevel,
          learning_interests: selectedInterests,
          learning_goals: learningGoals || 'Improve skills and test performance'
        })
      }
      
      if (onAuthSuccess) {
        onAuthSuccess()
      }
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError(err.message || 'An error occurred during authentication. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card glass-card">
        <h2 className="auth-title">{isLogin ? 'Sign In to Your Account' : 'Create Student Account'}</h2>
        <p className="auth-subtitle">
          {isLogin 
            ? 'Access your personalized learning metrics and quizzes.' 
            : 'Register to unlock tailored studies, streak tracking, and AI guidance.'
          }
        </p>

        {error && (
          <div className="error-alert">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name *</label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@adaptive.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            
            {/* Real-time checklist for registration */}
            {!isLogin && (
              <div className="password-checklist">
                <p className="checklist-title">Password Security Requirements:</p>
                <ul>
                  <li className={hasMinLength ? 'checked' : 'unchecked'}>
                    {hasMinLength ? '✓' : '○'} At least 8 characters
                  </li>
                  <li className={hasUppercase ? 'checked' : 'unchecked'}>
                    {hasUppercase ? '✓' : '○'} At least 1 uppercase letter
                  </li>
                  <li className={hasLowercase ? 'checked' : 'unchecked'}>
                    {hasLowercase ? '✓' : '○'} At least 1 lowercase letter
                  </li>
                  <li className={hasNumber ? 'checked' : 'unchecked'}>
                    {hasNumber ? '✓' : '○'} At least 1 numerical digit
                  </li>
                  <li className={hasSymbol ? 'checked' : 'unchecked'}>
                    {hasSymbol ? '✓' : '○'} At least 1 special character
                  </li>
                </ul>
              </div>
            )}
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="educationLevel">Education Level *</label>
                <select
                  id="educationLevel"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                >
                  <option value="School">Secondary School</option>
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate Degree</option>
                  <option value="Graduate">Postgraduate Degree</option>
                  <option value="Professional">Professional Practitioner</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="learningGoals">What are your learning goals?</label>
                <textarea
                  id="learningGoals"
                  rows="2"
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  placeholder="e.g. Master core structures, clear placement exams, improve logic..."
                ></textarea>
              </div>

              <div className="form-group">
                <label>Select Learning Interests * (Pick at least 1)</label>
                <div className="interests-grid-scroll">
                  {INTEREST_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`interest-tag-btn ${selectedInterests.includes(opt.id) ? 'active' : ''}`}
                      onClick={() => handleInterestToggle(opt.id)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-auth-submit"
            disabled={loading || (!isLogin && !isPasswordValid)}
          >
            {loading 
              ? (isLogin ? 'Signing In...' : 'Registering...') 
              : (isLogin ? 'Sign In' : 'Complete Onboarding')
            }
          </button>
        </form>

        <div className="auth-switch">
          <p>
            {isLogin ? "Don't have an account?" : 'Already registered?'}
            <button 
              type="button" 
              className="btn-link-auth"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setPassword('');
              }}
            >
              {isLogin ? 'Create one here' : 'Sign in instead'}
            </button>
          </p>
        </div>
      </div>

      {/* Collapsible Floating Debug Panel */}
      <div className={`debug-panel-widget ${debugOpen ? 'expanded' : 'collapsed'}`}>
        <button 
          type="button" 
          className="debug-panel-toggle" 
          onClick={() => setDebugOpen(!debugOpen)}
        >
          ⚙️ {debugOpen ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>
        {debugOpen && (
          <div className="debug-panel-content">
            <h4>🔍 System Diagnostic Panel</h4>
            <div className="debug-item">
              <strong>Frontend API URL:</strong>
              <code>{import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}</code>
            </div>
            <div className="debug-item">
              <strong>Backend Status:</strong>
              <span className={`badge-status ${backendHealth?.status === 'healthy' ? 'status-online' : 'status-offline'}`}>
                {backendHealth?.status === 'healthy' ? '🟢 Online' : '🔴 Unreachable'}
              </span>
              {backendHealth?.is_mock && <span className="badge-mock"> (Mock DB Enabled)</span>}
            </div>
            <div className="debug-item">
              <strong>Last API Request:</strong>
              {lastRequest?.url ? (
                <pre className="debug-pre">
                  {lastRequest.method} {lastRequest.url.replace(/https?:\/\/[^/]+/, '')}<br/>
                  Status: {lastRequest.status}<br/>
                  {lastRequest.error && `Error: ${lastRequest.error}`}
                </pre>
              ) : (
                <code>No API requests executed yet</code>
              )}
            </div>
            <div className="debug-item">
              <strong>Local Token:</strong>
              <code>{localStorage.getItem('adaptive_token') ? '🔑 Token Present' : '❌ No Token'}</code>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.8rem' }}
              onClick={async () => {
                setBackendHealth({ status: 'checking...' });
                const health = await checkBackendHealth();
                setBackendHealth(health);
              }}
            >
              🔄 Refresh Status
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Auth
