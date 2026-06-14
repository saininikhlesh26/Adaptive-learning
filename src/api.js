const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Global placeholder to log the last API request for the Debug Panel
if (typeof window !== 'undefined') {
  window.lastApiRequest = window.lastApiRequest || { url: '', method: '', status: '', error: '' };
}

// --- JWT Token Management ---

let cachedToken = localStorage.getItem('adaptive_token') || null;

export function setToken(token) {
  cachedToken = token;
  if (token) {
    localStorage.setItem('adaptive_token', token);
  } else {
    localStorage.removeItem('adaptive_token');
  }
}

export function getToken() {
  return cachedToken || localStorage.getItem('adaptive_token');
}

export function isAuthenticated() {
  return !!getToken();
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET' });
    if (res.ok) {
      return await res.json();
    }
    return { status: 'offline', error: `HTTP ${res.status}` };
  } catch (e) {
    return { status: 'offline', error: e.message };
  }
}

// --- Resilience Helpers (Timeout & Retries) ---

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 2, backoff = 1000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  // Intercept requests for guests to avoid unnecessary 401 console errors
  const isAuthPath = url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/logout');
  if (!isAuthenticated() && !isAuthPath) {
    const guestErr = new Error("Guest session");
    guestErr.name = "GuestSessionError";
    throw guestErr;
  }

  if (typeof window !== 'undefined') {
    window.lastApiRequest = { url, method: options.method || 'GET', status: 'pending', error: '' };
  }

  const headers = {
    ...options.headers,
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (response.status === 401) {
      setToken(null);
    }

    if (typeof window !== 'undefined') {
      window.lastApiRequest.status = response.status;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorJson;
      try { errorJson = JSON.parse(errorText); } catch { /* ignore */ }
      const msg = errorJson?.detail || `HTTP error: status ${response.status}`;
      if (typeof window !== 'undefined') {
        window.lastApiRequest.error = msg;
      }
      throw new Error(msg);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (typeof window !== 'undefined' && error.name !== 'GuestSessionError') {
      window.lastApiRequest.status = error.status || 'failed';
      window.lastApiRequest.error = error.message;
    }

    if (retries > 0 && error.message && error.message.includes('HTTP error') === false && error.status !== 401 && error.status !== 403) {
      console.warn(`Fetch failed for ${url}. Retrying in ${backoff}ms... (${retries} attempts left). Error:`, error.message);
      await delay(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    // Map generic connection errors to user-friendly messages
    if (error.name === 'AbortError') {
      throw new Error("Server is starting, please wait (Render cold boot).", { cause: error });
    }
    if (error.message && (error.message.includes('Failed to fetch') || error.message.toLowerCase().includes('network error') || error.message.includes('NetworkError'))) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error("Internet connection unavailable. Please check your network connection.", { cause: error });
      }
      throw new Error("Unable to connect to server. The backend might be offline.", { cause: error });
    }
    throw error;
  }
}

// --- Local Browser Fallbacks (if Backend is offline) ---

const MOCK_SUBJECTS = [
  { id: 'math', title: 'Mathematics', description: 'Calculus, algebra, and geometry concepts.', category: 'Academic', quiz_count: 5, avg_score: 88, completions: 2, is_bookmarked: true },
  { id: 'python', title: 'Python', description: 'List comprehensions, decorators, and libraries.', category: 'Programming', quiz_count: 5, avg_score: 90, completions: 1, is_bookmarked: false },
  { id: 'data_structures', title: 'Data Structures', description: 'Arrays, linked lists, trees, graphs, sorting.', category: 'Data Science', quiz_count: 5, avg_score: 50, completions: 1, is_bookmarked: true },
  { id: 'react', title: 'React', description: 'State, props, hooks, virtual DOM, routing.', category: 'Web Development', quiz_count: 0, avg_score: 0, completions: 0, is_bookmarked: false }
];

const MOCK_QUIZZES = [
  {
    quiz_id: 'math_q1',
    title: 'Mathematics: Algebra Foundations',
    difficulty: 'Beginner',
    subject_id: 'math',
    description: 'Solve equations and work with variables.',
    questions: [
      { question: 'Solve for x: x - 15 = 25. What is the value of x?', options: ['40', '36', '50', '80'], correct: 0, type: 'MCQ', hint: 'Add 15 to both sides.', explanation: 'x = 25 + 15 = 40.' },
      { question: 'Is the product of two odd numbers always odd?', options: ['True', 'False'], correct: 0, type: 'True/False', hint: 'Try 3 * 5.', explanation: 'Yes, odd * odd = odd.' },
      { question: 'Select all numbers that are factors of 12:', options: ['2', '3', '5', '8'], correct: [0, 1], type: 'Multi-select', hint: 'Check divisibility.', explanation: '2 and 3 divide 12.' }
    ]
  },
  {
    quiz_id: 'python_q1',
    title: 'Python: Syntax & Data Structures',
    difficulty: 'Beginner',
    subject_id: 'python',
    description: 'Syntax, lists, tuples, and conditions.',
    questions: [
      { question: 'What is the output of: [x for x in [1, 2, 3] if x > 1]?', options: ['[2, 3]', '[1, 2, 3]', '[3]', '[]'], correct: 0, type: 'MCQ', hint: 'Filter items > 1.', explanation: '2 and 3 are greater than 1.' },
      { question: 'Are lists in Python hashable and usable as dictionary keys?', options: ['True', 'False'], correct: 1, type: 'True/False', hint: 'Are lists mutable?', explanation: 'No, lists are mutable and therefore unhashable.' }
    ]
  }
];

const MOCK_STATS = {
  lessons_completed: 4,
  streak_days: 3,
  engagement_score: 85.0,
  average_score: 71.7,
  recent_activity: [
    { title: 'Completed: Mathematics: Algebra Foundations', description: '2 days ago - Score: 15/20 (75%)', engagement: 'Focused' },
    { title: 'Completed: Python: Syntax & Data Structures', description: '3 days ago - Score: 18/20 (90%)', engagement: 'Focused' }
  ],
  weekly_progress: [
    { day: 'Mon', completed: 1 },
    { day: 'Tue', completed: 0 },
    { day: 'Wed', completed: 2 },
    { day: 'Thu', completed: 1 },
    { day: 'Fri', completed: 0 },
    { day: 'Sat', completed: 0 },
    { day: 'Sun', completed: 0 }
  ],
  subject_progress: [
    { subject: 'Mathematics', completed: 1, avg_score: 75.0 },
    { subject: 'Python', completed: 1, avg_score: 90.0 },
    { subject: 'Data Structures', completed: 1, avg_score: 50.0 }
  ],
  performance_trends: [
    { attempt: 1, quiz_title: 'Algebra Foundations', score: 75.0, engagement: 'Focused' },
    { attempt: 2, quiz_title: 'Syntax & Data Structures', score: 90.0, engagement: 'Focused' },
    { attempt: 3, quiz_title: 'Arrays & Linked Lists', score: 50.0, engagement: 'Struggling' }
  ]
};

const MOCK_PROFILE = {
  user_id: 'usr_student_adaptive_com',
  first_name: 'John',
  last_name: 'Doe',
  email: 'student@adaptive.com',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  learning_style: 'Visual Learner',
  preferred_pace: 'Moderate pace',
  peak_time: 'Evenings (6 PM - 9 PM)',
  weekly_goal: 10,
  subject_focus: 'Computer Science',
  enable_reminders: true,
  learning_interests: ['math', 'python', 'data_structures'],
  learning_goals: 'Master core computational algorithms and data systems.',
  joined_date: 'January 2026',
  role: 'student',
  bookmarks: ['math', 'data_structures']
};

const MOCK_RECOMMENDATION = {
  user_id: 'usr_student_adaptive_com',
  weak_topics: ['Data Structures'],
  strong_topics: ['Python'],
  recommended_subject: 'data_structures',
  recommended_quiz_id: 'data_structures_q1',
  recommended_difficulty: 'Beginner',
  reason: 'Reviewing Data Structures because your average score is currently low (50%). Setting it to Beginner with active hints to help you get back on track.',
  timestamp: new Date().toISOString(),
  quiz_details: { title: 'Data Structures: Arrays & Linked Lists', difficulty: 'Beginner' }
};

// --- Local Browser Fallbacks for new features ---

const MOCK_WEEKLY_REPORTS = [
  {
    id: 'report_1',
    user_id: 'usr_student_adaptive_com',
    week_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    week_end: new Date().toISOString().split('T')[0],
    study_hours: 8.5,
    study_hours_change: 1.2,
    quizzes_attempted: 3,
    quizzes_attempted_change: 1,
    questions_solved: 60,
    avg_score: 71.6,
    avg_score_change: 5.4,
    engagement_score: 82.5,
    learning_streak: 4,
    best_subject: 'python',
    weakest_subject: 'data_structures',
    subject_performance: { python: 90.0, math: 75.0, data_structures: 50.0 },
    ai_insights: {
      strengths: [
        'Strong conceptual grasp of Python syntax & data structures.',
        'High scoring consistency on introductory Algebra.'
      ],
      improvements: [
        'Linked lists execution time is slightly high, suggesting focus on pointer traversals.',
        'Consistent tab-switches in Data Structures quizzes denote potential distraction.'
      ],
      recommendations: [
        'Allocate 45 minutes to "Data Structures: Arrays & Linked Lists" topic.',
        'Join the Weekly Physics Cup competition to challenge your reasoning skills.'
      ]
    }
  }
];

const MOCK_TIMETABLES = [
  {
    id: 'time_1',
    user_id: 'usr_student_adaptive_com',
    subject_id: 'python',
    topic: 'Decorators & OOP',
    date: new Date().toISOString().split('T')[0],
    time_slot: '10:00 - 11:30',
    priority: 'High',
    is_ai_generated: false
  },
  {
    id: 'time_2',
    user_id: 'usr_student_adaptive_com',
    subject_id: 'math',
    topic: 'Calculus & Limits',
    date: new Date().toISOString().split('T')[0],
    time_slot: '14:00 - 15:30',
    priority: 'Medium',
    is_ai_generated: true
  }
];

const MOCK_TASKS = [
  {
    id: 'task_1',
    user_id: 'usr_student_adaptive_com',
    title: 'Complete Algebra Foundations Quiz 1',
    description: 'Solve quadratic equations practice problems.',
    status: 'Completed',
    due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'High',
    created_at: new Date().toISOString()
  },
  {
    id: 'task_2',
    user_id: 'usr_student_adaptive_com',
    title: 'Study Python list comprehensions and generators',
    description: 'Watch tutorials and write basic scripts.',
    status: 'In Progress',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'Medium',
    created_at: new Date().toISOString()
  },
  {
    id: 'task_3',
    user_id: 'usr_student_adaptive_com',
    title: 'Prepare for Daily React Challenge',
    description: 'Brush up on virtual DOM principles and hooks.',
    status: 'Pending',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'High',
    created_at: new Date().toISOString()
  }
];

const MOCK_GOALS = [
  {
    id: 'goal_1',
    user_id: 'usr_student_adaptive_com',
    title: 'Master Python Programming',
    subject_id: 'python',
    target_value: 85.0,
    current_value: 90.0,
    goal_type: 'Quiz Score',
    status: 'Completed',
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  },
  {
    id: 'goal_2',
    user_id: 'usr_student_adaptive_com',
    title: 'Learn Algorithms & Data Structures',
    subject_id: 'data_structures',
    target_value: 5.0,
    current_value: 1.0,
    goal_type: 'Quizzes Solved',
    status: 'Active',
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }
];

const MOCK_ACHIEVEMENTS = [
  {
    id: 'goal_crusher_1',
    title: 'Goal Crusher',
    description: 'Successfully completed your first study goal.',
    icon: '🎯',
    unlocked_at: 'June 2026'
  },
  {
    id: 'quiz_starter',
    title: 'First Step',
    description: 'Completed your first adaptive quiz attempt.',
    icon: '⚡',
    unlocked_at: 'January 2026'
  }
];


const MOCK_COMPETITIONS = [
  { id: 'comp_1', title: 'Daily React Challenge', type: 'Daily Challenge', subject: 'Web Development', participant_count: 42, active: true },
  { id: 'comp_2', title: 'Weekly Physics Cup', type: 'Weekly Challenge', subject: 'Physics', participant_count: 128, active: true },
  { id: 'comp_3', title: 'Mathematics League', type: 'Subject Challenge', subject: 'Mathematics', participant_count: 85, active: false }
];

const MOCK_LEADERBOARDS = {
  comp_1: [
    { rank: 1, name: 'Alice Smith', score: 950, engagement_score: 98.0 },
    { rank: 2, name: 'Bob Johnson', score: 880, engagement_score: 85.0 },
    { rank: 3, name: 'John Doe (You)', score: 750, engagement_score: 60.0 }
  ],
  comp_2: [
    { rank: 1, name: 'Charlie Brown', score: 1200, engagement_score: 95.0 },
    { rank: 2, name: 'Alice Smith', score: 1050, engagement_score: 90.0 }
  ]
};

// --- AUTHENTICATION API ---

export async function login(email, password) {
  const result = await fetchWithRetry(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (result.access_token) {
    setToken(result.access_token);
  }
  return result;
}

export async function register(registerData) {
  const result = await fetchWithRetry(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerData)
  });
  if (result.access_token) {
    setToken(result.access_token);
  }
  return result;
}

export async function logout() {
  try {
    await fetchWithRetry(`${API_BASE_URL}/api/auth/logout`, { method: 'POST' });
  } catch (e) {
    console.warn('Backend logout failed, executing local logout:', e);
  } finally {
    setToken(null);
  }
}

// --- SUBJECTS API ---

export async function fetchSubjects() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/subjects`);
  } catch (error) {
    console.error('API Error in fetchSubjects, falling back to local mock data:', error);
    return MOCK_SUBJECTS;
  }
}

export async function toggleBookmark(subjectId) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/subjects/${subjectId}/bookmark`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('API Error in toggleBookmark, mocking locally:', error);
    const idx = MOCK_SUBJECTS.findIndex(s => s.id === subjectId);
    if (idx !== -1) {
      MOCK_SUBJECTS[idx].is_bookmarked = !MOCK_SUBJECTS[idx].is_bookmarked;
      return { status: 'success', is_bookmarked: MOCK_SUBJECTS[idx].is_bookmarked };
    }
    return { status: 'success', is_bookmarked: true };
  }
}

export async function createSubject(subjectData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subjectData)
    });
  } catch (error) {
    console.error('API Error in createSubject, mocking locally:', error);
    const newSub = {
      ...subjectData,
      quiz_count: 0,
      avg_score: 0,
      completions: 0,
      is_bookmarked: false
    };
    MOCK_SUBJECTS.push(newSub);
    return newSub;
  }
}

export async function updateSubject(subjectId, subjectData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/subjects/${subjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subjectData)
    });
  } catch (error) {
    console.error('API Error in updateSubject, mocking locally:', error);
    const idx = MOCK_SUBJECTS.findIndex(s => s.id === subjectId);
    if (idx !== -1) {
      MOCK_SUBJECTS[idx] = { ...MOCK_SUBJECTS[idx], ...subjectData };
      return MOCK_SUBJECTS[idx];
    }
    return subjectData;
  }
}

export async function deleteSubject(subjectId) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/subjects/${subjectId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('API Error in deleteSubject, mocking locally:', error);
    const idx = MOCK_SUBJECTS.findIndex(s => s.id === subjectId);
    if (idx !== -1) {
      MOCK_SUBJECTS.splice(idx, 1);
    }
    return { status: 'success', message: 'Subject deleted' };
  }
}

// --- QUIZZES API ---

export async function fetchQuizzes(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.subject_id) params.append('subject_id', filters.subject_id);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.topic) params.append('topic', filters.topic);
    
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return await fetchWithRetry(`${API_BASE_URL}/api/quizzes${queryStr}`);
  } catch (error) {
    console.error('API Error in fetchQuizzes, falling back to local mock data:', error);
    if (filters.subject_id) {
      return MOCK_QUIZZES.filter(q => q.subject_id === filters.subject_id);
    }
    return MOCK_QUIZZES;
  }
}

export async function fetchQuiz(quizId) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/quizzes/${quizId}`);
  } catch (error) {
    console.error('API Error in fetchQuiz, falling back to local mock data:', error);
    const quiz = MOCK_QUIZZES.find(q => q.quiz_id === quizId);
    if (!quiz) throw new Error('Quiz not found', { cause: error });
    return quiz;
  }
}

export async function submitQuiz(quizId, answers, behavioralMetrics) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/quizzes/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
        behavioral_metrics: behavioralMetrics,
      }),
    });
  } catch (error) {
    console.error('API Error in submitQuiz, mocking locally:', error);
    const quiz = MOCK_QUIZZES.find(q => q.quiz_id === quizId);
    const total = quiz ? quiz.questions.length : answers.length;
    
    let totalScore = 0;
    
    for (let idx = 0; idx < answers.length; idx++) {
      if (!quiz || idx >= total) break;
      const q = quiz.questions[idx];
      const userAns = answers[idx];
      const correctAns = q.correct;
      
      if (q.type === 'Multi-select') {
        const correctList = Array.isArray(correctAns) ? correctAns : [correctAns];
        const userList = Array.isArray(userAns) ? userAns : [userAns];
        if (correctList.length > 0) {
          let qScore = 0;
          const pointsPerCorrect = 1.0 / correctList.length;
          userList.forEach(choice => {
            if (correctList.includes(choice)) {
              qScore += pointsPerCorrect;
            } else {
              qScore -= pointsPerCorrect;
            }
          });
          totalScore += Math.max(0, qScore);
        }
      } else {
        if (userAns === correctAns) {
          totalScore += 1;
        }
      }
    }
    
    const percentage = Math.round((totalScore / total) * 100);

    // Predict engagement level
    let level = 'Focused';
    let conf = 85;
    if (behavioralMetrics.tab_switches >= 3 || behavioralMetrics.inactivity_duration >= 20) {
      level = 'Bored';
      conf = 78;
    } else if (behavioralMetrics.time_spent > 120 && (totalScore / total) < 0.6) {
      level = 'Struggling';
      conf = 82;
    }

    // Add activity locally
    MOCK_STATS.lessons_completed += 1;
    MOCK_STATS.recent_activity.unshift({
      title: `Completed: ${quiz ? quiz.title : 'Quiz'}`,
      description: `Just now - Score: ${totalScore.toFixed(1)}/${total} (${percentage}%)`,
      engagement: level
    });

    return {
      score: Number(totalScore.toFixed(1)),
      total,
      percentage,
      engagement_level: level,
      confidence: conf,
      is_fallback: true
    };
  }
}

// --- RECOMMENDATIONS API ---

export async function fetchRecommendations() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/recommendations`);
  } catch (error) {
    console.error('API Error in fetchRecommendations, falling back to local mock data:', error);
    return MOCK_RECOMMENDATION;
  }
}

// --- DASHBOARD API ---

export async function fetchDashboardStats() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/dashboard/stats`);
  } catch (error) {
    console.error('API Error in fetchDashboardStats, falling back to local mock data:', error);
    return MOCK_STATS;
  }
}

// --- PROFILE API ---

export async function fetchProfile() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/profile`);
  } catch (error) {
    console.error('API Error in fetchProfile, falling back to local mock data:', error);
    return MOCK_PROFILE;
  }
}

export async function updateProfile(profileData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });
  } catch (error) {
    console.error('API Error in updateProfile, mocking locally:', error);
    Object.assign(MOCK_PROFILE, profileData);
    return { status: 'success', message: 'Profile updated' };
  }
}

// --- COMPETITIONS API ---

export async function fetchCompetitions() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/competitions`);
  } catch (error) {
    console.error('API Error in fetchCompetitions, falling back to local mock data:', error);
    const list = [...MOCK_COMPETITIONS];
    return list;
  }
}

export async function createCompetition(compData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/competitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(compData)
    });
  } catch (error) {
    console.error('API Error in createCompetition, mocking locally:', error);
    const newComp = {
      ...compData,
      id: `comp_${Date.now()}`,
      participant_count: 1,
      active: true
    };
    MOCK_COMPETITIONS.push(newComp);
    return newComp;
  }
}

export async function joinCompetition(compId) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/competitions/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competition_id: compId })
    });
  } catch (error) {
    console.error('API Error in joinCompetition, mocking locally:', error);
    const comp = MOCK_COMPETITIONS.find(c => c.id === compId);
    if (comp) comp.participant_count += 1;
    return { status: 'success', message: 'Joined competition' };
  }
}

export async function fetchLeaderboard(compId) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/competitions/${compId}/leaderboard`);
  } catch (error) {
    console.error('API Error in fetchLeaderboard, falling back to local mock data:', error);
    return MOCK_LEADERBOARDS[compId] || [
      { rank: 1, name: 'Alice Smith', score: 950, engagement_score: 96.0 },
      { rank: 2, name: 'John Doe (You)', score: 850, engagement_score: 92.0 }
    ];
  }
}

// --- ADMIN PANEL API ---

export async function fetchAdminMetrics() {
  return await fetchWithRetry(`${API_BASE_URL}/api/admin/metrics`);
}

export async function adminCreateQuiz(quizData) {
  return await fetchWithRetry(`${API_BASE_URL}/api/admin/quizzes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quizData)
  });
}

// --- WEEKLY REPORTS API ---

export async function fetchWeeklyReports() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/reports/weekly`);
  } catch (error) {
    console.error('API Error in fetchWeeklyReports, fallback to mocks:', error);
    return [...MOCK_WEEKLY_REPORTS];
  }
}

export async function generateWeeklyReport() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/reports/weekly/generate`, { method: 'POST' });
  } catch (error) {
    console.error('API Error in generateWeeklyReport, fallback to mocks:', error);
    const now = new Date();
    const newReport = {
      id: `wr_${Date.now()}`,
      user_id: 'usr_student_adaptive_com',
      week_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      week_end: now.toISOString().split('T')[0],
      study_hours: 9.8,
      study_hours_change: 1.3,
      quizzes_attempted: 4,
      quizzes_attempted_change: 1,
      questions_solved: 80,
      avg_score: 76.5,
      avg_score_change: 4.9,
      engagement_score: 88.0,
      learning_streak: 5,
      best_subject: 'python',
      weakest_subject: 'data_structures',
      subject_performance: { python: 90.0, math: 80.0, data_structures: 55.0 },
      ai_insights: {
        strengths: [
          'Excellent improvement in mathematical accuracy.',
          'Consistently focused engagement rating.'
        ],
        improvements: [
          'Linked list pointer traversal speeds are still low.',
          'Slight tab switching detected during web development reviews.'
        ],
        recommendations: [
          'Spend 30 minutes revising JavaScript async closures.',
          'Attempt python beginner quiz 3 to lock in generator logic.'
        ]
      }
    };
    MOCK_WEEKLY_REPORTS.push(newReport);
    return newReport;
  }
}

// --- TIMETABLE API ---

export async function fetchTimetable() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/timetable`);
  } catch (error) {
    console.error('API Error in fetchTimetable, fallback to mocks:', error);
    return [...MOCK_TIMETABLES];
  }
}

export async function createTimetableItem(itemData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/timetable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
  } catch (error) {
    console.error('API Error in createTimetableItem, fallback to mocks:', error);
    const newItem = {
      ...itemData,
      id: `time_${Date.now()}`,
      user_id: 'usr_student_adaptive_com',
      is_ai_generated: false
    };
    MOCK_TIMETABLES.push(newItem);
    return newItem;
  }
}

export async function updateTimetableItem(id, itemData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/timetable/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
  } catch (error) {
    console.error('API Error in updateTimetableItem, fallback to mocks:', error);
    const idx = MOCK_TIMETABLES.findIndex(t => t.id === id);
    if (idx !== -1) {
      MOCK_TIMETABLES[idx] = { ...MOCK_TIMETABLES[idx], ...itemData };
    }
    return { status: 'success', message: 'Updated locally' };
  }
}

export async function deleteTimetableItem(id) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/timetable/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('API Error in deleteTimetableItem, fallback to mocks:', error);
    const idx = MOCK_TIMETABLES.findIndex(t => t.id === id);
    if (idx !== -1) {
      MOCK_TIMETABLES.splice(idx, 1);
    }
    return { status: 'success', message: 'Deleted locally' };
  }
}

export async function generateAiTimetable(hours) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/timetable/generate-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available_hours: hours })
    });
  } catch (error) {
    console.error('API Error in generateAiTimetable, fallback to mocks:', error);
    // Remove old AI generated items
    for (let i = MOCK_TIMETABLES.length - 1; i >= 0; i--) {
      if (MOCK_TIMETABLES[i].is_ai_generated) {
        MOCK_TIMETABLES.splice(i, 1);
      }
    }
    
    // Generate new AI items
    const newItems = [
      {
        id: `time_ai_${Date.now()}_1`,
        user_id: 'usr_student_adaptive_com',
        subject_id: 'data_structures',
        topic: 'Arrays & Linked Lists',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time_slot: '14:00 - 15:30',
        priority: 'High',
        is_ai_generated: true
      },
      {
        id: `time_ai_${Date.now()}_2`,
        user_id: 'usr_student_adaptive_com',
        subject_id: 'python',
        topic: 'Functions & Generators',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time_slot: '18:00 - 19:30',
        priority: 'Medium',
        is_ai_generated: true
      },
      {
        id: `time_ai_${Date.now()}_3`,
        user_id: 'usr_student_adaptive_com',
        subject_id: 'math',
        topic: 'Calculus & Limits',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        time_slot: '10:00 - 11:30',
        priority: 'Medium',
        is_ai_generated: true
      }
    ];
    
    MOCK_TIMETABLES.push(...newItems);
    return {
      status: 'success',
      message: `Successfully generated ${newItems.length} personalized study slots.`,
      schedule: newItems
    };
  }
}

// --- TASKS API ---

export async function fetchTasks() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/tasks`);
  } catch (error) {
    console.error('API Error in fetchTasks, fallback to mocks:', error);
    return [...MOCK_TASKS];
  }
}

export async function createTask(taskData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  } catch (error) {
    console.error('API Error in createTask, fallback to mocks:', error);
    const newTask = {
      ...taskData,
      id: `task_${Date.now()}`,
      user_id: 'usr_student_adaptive_com',
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    MOCK_TASKS.push(newTask);
    return newTask;
  }
}

export async function updateTask(id, taskData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  } catch (error) {
    console.error('API Error in updateTask, fallback to mocks:', error);
    const idx = MOCK_TASKS.findIndex(t => t.id === id);
    if (idx !== -1) {
      MOCK_TASKS[idx] = { ...MOCK_TASKS[idx], ...taskData };
    }
    return { status: 'success', message: 'Updated task locally' };
  }
}

export async function deleteTask(id) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/tasks/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('API Error in deleteTask, fallback to mocks:', error);
    const idx = MOCK_TASKS.findIndex(t => t.id === id);
    if (idx !== -1) {
      MOCK_TASKS.splice(idx, 1);
    }
    return { status: 'success', message: 'Deleted task locally' };
  }
}

// --- GOALS API ---

export async function fetchGoals() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/goals`);
  } catch (error) {
    console.error('API Error in fetchGoals, fallback to mocks:', error);
    return {
      goals: [...MOCK_GOALS],
      achievements: [...MOCK_ACHIEVEMENTS]
    };
  }
}

export async function createGoal(goalData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData)
    });
  } catch (error) {
    console.error('API Error in createGoal, fallback to mocks:', error);
    const newGoal = {
      ...goalData,
      id: `goal_${Date.now()}`,
      user_id: 'usr_student_adaptive_com',
      current_value: 0.0,
      status: 'Active',
      created_at: new Date().toISOString()
    };
    MOCK_GOALS.push(newGoal);
    return newGoal;
  }
}

export async function updateGoalProgress(id, progress) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/goals/${id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_value: progress })
    });
  } catch (error) {
    console.error('API Error in updateGoalProgress, fallback to mocks:', error);
    const goal = MOCK_GOALS.find(g => g.id === id);
    if (goal) {
      goal.current_value = progress;
      if (progress >= goal.target_value) {
        goal.status = 'Completed';
      }
    }
    return { status: 'success', message: 'Updated goal progress locally' };
  }
}

export async function deleteGoal(id) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/goals/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('API Error in deleteGoal, fallback to mocks:', error);
    const idx = MOCK_GOALS.findIndex(g => g.id === id);
    if (idx !== -1) {
      MOCK_GOALS.splice(idx, 1);
    }
    return { status: 'success', message: 'Deleted goal locally' };
  }
}

