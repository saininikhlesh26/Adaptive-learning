const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- Resilience Helpers (Timeout & Retries) ---

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 2, backoff = 1000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

  const config = {
    ...options,
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0) {
      console.warn(`Fetch failed for ${url}. Retrying in ${backoff}ms... (${retries} attempts left). Error:`, error.message);
      await delay(backoff);
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

// --- Local Browser Fallbacks (if Backend is offline) ---

const MOCK_SUBJECTS = [
  { id: 'math', title: 'Mathematics', description: 'Calculus, algebra, and geometry concepts.', quiz_count: 3, avg_score: 88, completions: 12 },
  { id: 'physics', title: 'Physics', description: 'Mechanics, electromagnetism, and thermodynamics.', quiz_count: 2, avg_score: 76, completions: 6 },
  { id: 'chemistry', title: 'Chemistry', description: 'Organic, inorganic, and physical chemistry basics.', quiz_count: 2, avg_score: 82, completions: 5 },
  { id: 'comp_sci', title: 'Computer Science', description: 'Data structures, algorithms, and web programming.', quiz_count: 4, avg_score: 91, completions: 15 },
  { id: 'english', title: 'English', description: 'Grammar rules, sentence structures, and analysis.', quiz_count: 1, avg_score: 95, completions: 8 }
];

const MOCK_QUIZZES = [
  {
    quiz_id: 'react_basics',
    title: 'React Basics',
    difficulty: 'Easy',
    subject_id: 'comp_sci',
    description: 'Learn the foundational concepts of React, components, and rendering.',
    questions: [
      { question: 'What is the primary purpose of React?', options: ['Build server-side databases', 'Build user interfaces with reusable components', 'Manage backend network routing', 'Style elements using static sheets'], correct: 1, hint: 'React is a library created by Facebook for frontend building.', explanation: 'React focuses strictly on UI component rendering.' },
      { question: 'What is the name of the syntax extension used in React?', options: ['HTML++', 'JSX', 'JavaScript XML', 'JSON-CSS'], correct: 1, hint: 'It looks like HTML but is written inside JavaScript.', explanation: 'JSX allows writing HTML-like code inside JavaScript.' },
      { question: 'How are properties passed into React components?', options: ['Through local state', 'Through props', 'Through global context', 'Through url search parameters'], correct: 1, hint: 'Short for properties.', explanation: 'Props (properties) pass read-only parameters down to child components.' }
    ]
  },
  {
    quiz_id: 'react_hooks',
    title: 'React Hooks Deep Dive',
    difficulty: 'Medium',
    subject_id: 'comp_sci',
    description: 'Master functional component state, side effects, and custom hooks.',
    questions: [
      { question: 'What does the useState hook do?', options: ['Fetches API data automatically', 'Adds state variables to functional components', 'Injects CSS rules into components', 'Navigates between screens'], correct: 1, hint: 'Used to track local variables that trigger re-renders.', explanation: 'useState creates a local getter and setter pair inside functional components.' },
      { question: 'Which hook is used to handle side-effects like data fetching?', options: ['useReducer', 'useCallback', 'useEffect', 'useMemo'], correct: 2, hint: 'Runs after render phase is finished.', explanation: 'useEffect runs side-effects like APIs, event listeners, and timers.' }
    ]
  }
];

const MOCK_STATS = {
  lessons_completed: 24,
  streak_days: 7,
  engagement_score: 85,
  average_score: 92,
  weekly_progress: [
    { day: 'Mon', completed: 2 },
    { day: 'Tue', completed: 4 },
    { day: 'Wed', completed: 1 },
    { day: 'Thu', completed: 3 },
    { day: 'Fri', completed: 5 },
    { day: 'Sat', completed: 2 },
    { day: 'Sun', completed: 1 }
  ],
  subject_performance: [
    { subject: 'Math', score: 88 },
    { subject: 'Physics', score: 76 },
    { subject: 'Chemistry', score: 82 },
    { subject: 'Computer Science', score: 91 },
    { subject: 'English', score: 95 }
  ],
  engagement_trends: [
    { label: 'Week 1', score: 70 },
    { label: 'Week 2', score: 78 },
    { label: 'Week 3', score: 82 },
    { label: 'Week 4', score: 85 }
  ],
  recent_activity: [
    { title: 'Completed: React Fundamentals', description: 'Today at 2:30 PM - Score: 95%', engagement: 'Focused' },
    { title: 'Completed: State Management', description: 'Yesterday at 3:15 PM - Score: 88%', engagement: 'Focused' },
    { title: 'Completed: Component Lifecycle', description: '2 days ago at 4:00 PM - Score: 91%', engagement: 'Focused' }
  ],
  achievements: [
    { id: '1', title: 'Focus Master', description: 'Maintained "Focused" status for 5 consecutive quizzes.', icon: '🎯' },
    { id: '2', title: 'Perfect Score', description: 'Scored 100% on any Hard level assessment.', icon: '🏆' },
    { id: '3', title: 'Streak Builder', description: 'Learned for 7 consecutive days.', icon: '🔥' }
  ]
};

const MOCK_PROFILE = {
  user_id: 'default_student',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  learning_style: 'Visual Learner with strong problem-solving abilities',
  preferred_pace: 'Moderate pace with occasional deep dives',
  peak_time: 'Evenings (6 PM - 9 PM)',
  weekly_goal: 10,
  subject_focus: 'Computer Science',
  enable_reminders: true,
  joined_date: 'January 2026'
};

const MOCK_COMPETITIONS = [
  { id: 'comp_1', title: 'Daily React Challenge', type: 'Daily Challenge', subject: 'Computer Science', participant_count: 42, active: true },
  { id: 'comp_2', title: 'Weekly Physics Cup', type: 'Weekly Challenge', subject: 'Physics', participant_count: 128, active: true },
  { id: 'comp_3', title: 'Mathematics League', type: 'Subject Challenge', subject: 'Mathematics', participant_count: 85, active: false }
];

const MOCK_LEADERBOARDS = {
  comp_1: [
    { rank: 1, name: 'Alice Smith', score: 100, engagement_score: 98 },
    { rank: 2, name: 'John Doe (You)', score: 95, engagement_score: 92 },
    { rank: 3, name: 'Bob Johnson', score: 88, engagement_score: 85 },
    { rank: 4, name: 'Charlie Brown', score: 75, engagement_score: 60 }
  ],
  comp_2: [
    { rank: 1, name: 'Sarah Connor', score: 98, engagement_score: 95 },
    { rank: 2, name: 'John Doe (You)', score: 88, engagement_score: 84 },
    { rank: 3, name: 'Kyle Reese', score: 85, engagement_score: 90 }
  ]
};

// --- API Implementation ---

export async function fetchSubjects() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/subjects`);
  } catch (error) {
    console.error('API Error in fetchSubjects, falling back to local mock data:', error);
    return MOCK_SUBJECTS;
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
      id: `sub_${Date.now()}`,
      quiz_count: 0,
      avg_score: 0,
      completions: 0
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
    const idx = MOCK_SUBJECTS.findIndex(s => s.id === subjectId || s.quiz_id === subjectId);
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

export async function fetchQuizzes() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/quizzes`);
  } catch (error) {
    console.error('API Error in fetchQuizzes, falling back to local mock data:', error);
    return MOCK_QUIZZES;
  }
}

export async function createQuiz(quizData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData)
    });
  } catch (error) {
    console.error('API Error in createQuiz, mocking locally:', error);
    const newQuiz = {
      ...quizData,
      quiz_id: `quiz_${Date.now()}`
    };
    MOCK_QUIZZES.push(newQuiz);
    
    // Increment mock subject quiz count
    const sub = MOCK_SUBJECTS.find(s => s.id === quizData.subject_id);
    if (sub) sub.quiz_count += 1;

    return newQuiz;
  }
}

export async function updateQuiz(quizId, quizData) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/quizzes/${quizId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizData)
    });
  } catch (error) {
    console.error('API Error in updateQuiz, mocking locally:', error);
    const idx = MOCK_QUIZZES.findIndex(q => q.quiz_id === quizId);
    if (idx !== -1) {
      MOCK_QUIZZES[idx] = { ...MOCK_QUIZZES[idx], ...quizData };
      return MOCK_QUIZZES[idx];
    }
    return quizData;
  }
}

export async function deleteQuiz(quizId) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/quizzes/${quizId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('API Error in deleteQuiz, mocking locally:', error);
    const idx = MOCK_QUIZZES.findIndex(q => q.quiz_id === quizId);
    if (idx !== -1) {
      const q = MOCK_QUIZZES[idx];
      const sub = MOCK_SUBJECTS.find(s => s.id === q.subject_id);
      if (sub) sub.quiz_count = Math.max(0, sub.quiz_count - 1);
      MOCK_QUIZZES.splice(idx, 1);
    }
    return { status: 'success', message: 'Quiz deleted' };
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
    const correctCount = answers.reduce((acc, ans, idx) => {
      if (quiz && quiz.questions[idx] && ans === quiz.questions[idx].correct) {
        return acc + 1;
      }
      return acc;
    }, 0);

    const total = quiz ? quiz.questions.length : answers.length;
    const ratio = total > 0 ? correctCount / total : 0;
    const percentage = Math.round(ratio * 100);

    // Formulate basic rules for local mock prediction
    let level = 'Focused';
    let conf = 85;
    if (behavioralMetrics.tab_switches >= 3 || behavioralMetrics.inactivity_duration >= 20) {
      level = 'Bored';
      conf = 78;
    } else if (behavioralMetrics.time_spent > 120 && ratio < 0.6) {
      level = 'Struggling';
      conf = 82;
    }

    // Add activity locally
    MOCK_STATS.lessons_completed += 1;
    MOCK_STATS.recent_activity.unshift({
      title: `Completed: ${quiz ? quiz.title : 'Quiz'}`,
      description: `Just now - Score: ${correctCount}/${total} (${percentage}%)`,
      engagement: level
    });

    return {
      score: correctCount,
      total,
      percentage,
      engagement_level: level,
      confidence: conf,
      is_fallback: true
    };
  }
}

export async function fetchDashboardStats() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/dashboard/stats`);
  } catch (error) {
    console.error('API Error in fetchDashboardStats, falling back to local mock data:', error);
    return MOCK_STATS;
  }
}

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

export async function fetchCompetitions() {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/competitions`);
  } catch (error) {
    console.error('API Error in fetchCompetitions, falling back to local mock data:', error);
    return MOCK_COMPETITIONS;
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
    MOCK_LEADERBOARDS[newComp.id] = [
      { rank: 1, name: 'John Doe (You)', score: 0, engagement_score: 100 }
    ];
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
    
    // Add current user to mock leaderboard if not present
    if (MOCK_LEADERBOARDS[compId]) {
      const exists = MOCK_LEADERBOARDS[compId].some(u => u.name.includes('(You)'));
      if (!exists) {
        MOCK_LEADERBOARDS[compId].push({
          rank: MOCK_LEADERBOARDS[compId].length + 1,
          name: 'John Doe (You)',
          score: 0,
          engagement_score: 90
        });
      }
    }
    return { status: 'success', message: 'Joined competition' };
  }
}

export async function fetchLeaderboard(compId) {
  try {
    return await fetchWithRetry(`${API_BASE_URL}/api/competitions/${compId}/leaderboard`);
  } catch (error) {
    console.error('API Error in fetchLeaderboard, falling back to local mock data:', error);
    return MOCK_LEADERBOARDS[compId] || [
      { rank: 1, name: 'Alice Smith', score: 95, engagement_score: 96 },
      { rank: 2, name: 'John Doe (You)', score: 85, engagement_score: 92 }
    ];
  }
}
