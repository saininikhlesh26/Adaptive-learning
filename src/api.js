const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// --- Resilience Helpers (Timeout & Retries) ---

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 2, backoff = 1000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

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
      // Token might be invalid or expired. Clear session.
      setToken(null);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorJson;
      try { errorJson = JSON.parse(errorText); } catch(e) {}
      const msg = errorJson?.detail || `HTTP error: status ${response.status}`;
      throw new Error(msg);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && error.message.includes('HTTP error') === false && error.status !== 401 && error.status !== 403) {
      console.warn(`Fetch failed for ${url}. Retrying in ${backoff}ms... (${retries} attempts left). Error:`, error.message);
      await delay(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
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
    if (!quiz) throw new Error('Quiz not found');
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
