const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchQuizzes() {
  const response = await fetch(`${API_BASE_URL}/api/quizzes`);
  if (!response.ok) {
    throw new Error('Failed to fetch quizzes');
  }
  return response.json();
}

export async function fetchQuiz(quizId) {
  const response = await fetch(`${API_BASE_URL}/api/quizzes/${quizId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quiz ${quizId}`);
  }
  return response.json();
}

export async function submitQuiz(quizId, answers, behavioralMetrics) {
  const response = await fetch(`${API_BASE_URL}/api/quizzes/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quiz_id: quizId,
      answers,
      behavioral_metrics: behavioralMetrics,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to submit quiz');
  }
  return response.json();
}

export async function fetchDashboardStats() {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard statistics');
  }
  return response.json();
}

export async function fetchProfile() {
  const response = await fetch(`${API_BASE_URL}/api/profile`);
  if (!response.ok) {
    throw new Error('Failed to fetch profile data');
  }
  return response.json();
}

export async function updateProfile(profileData) {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  if (!response.ok) {
    throw new Error('Failed to update profile data');
  }
  return response.json();
}
