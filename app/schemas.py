from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class BehavioralMetrics(BaseModel):
    time_spent: float = Field(..., description="Time spent on the quiz in seconds")
    tab_switches: int = Field(..., description="Number of focus/tab switches during the quiz")
    mouse_clicks: int = Field(..., description="Number of mouse clicks detected during the quiz")
    inactivity_duration: float = Field(..., description="Duration in seconds with no user activity")

class QuizSubmissionRequest(BaseModel):
    quiz_id: str
    answers: List[int]
    behavioral_metrics: BehavioralMetrics

class ProfileUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    avatar_url: Optional[str] = "https://via.placeholder.com/120"
    learning_style: Optional[str] = "Visual Learner"
    preferred_pace: Optional[str] = "Moderate pace"
    peak_time: Optional[str] = "Evenings (6 PM - 9 PM)"
    weekly_goal: Optional[int] = 10
    subject_focus: Optional[str] = "React & FastAPI Fullstack"
    enable_reminders: Optional[bool] = True

# --- Subject Module Schemas ---

class SubjectCreate(BaseModel):
    id: str = Field(..., description="Unique subject ID (lowercase string, e.g. 'math')")
    title: str = Field(..., description="Subject display title")
    description: str = Field(..., description="Subject description summary")

class SubjectResponse(BaseModel):
    id: str
    title: str
    description: str
    quiz_count: int = 0
    avg_score: float = 0.0
    completions: int = 0

# --- Quiz Module Schemas ---

class QuestionSchema(BaseModel):
    question: str
    options: List[str]
    correct: int
    hint: Optional[str] = None
    explanation: Optional[str] = None

class QuizCreate(BaseModel):
    quiz_id: str = Field(..., description="Unique quiz ID string")
    title: str
    difficulty: str = Field("Easy", description="Difficulty level: Easy | Medium | Hard")
    subject_id: str = Field(..., description="Target Subject ID link")
    description: str
    questions: List[QuestionSchema]

# --- Competition Module Schemas ---

class CompetitionCreate(BaseModel):
    title: str
    type: str = Field("Daily Challenge", description="Daily Challenge | Weekly Challenge | Subject Challenge")
    subject: str = Field(..., description="Subject name link")

class CompetitionJoin(BaseModel):
    competition_id: str
