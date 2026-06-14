from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class BehavioralMetrics(BaseModel):
    time_spent: float = Field(..., description="Time spent on the quiz in seconds")
    tab_switches: int = Field(..., description="Number of focus/tab switches during the quiz")
    mouse_clicks: int = Field(..., description="Number of mouse clicks detected during the quiz")
    inactivity_duration: float = Field(..., description="Duration in seconds with no user activity")

class QuizSubmissionRequest(BaseModel):
    quiz_id: str
    answers: List[Any]  # Can support single int (MCQ) or list of options (Multi-select)
    behavioral_metrics: BehavioralMetrics

# --- Auth Module Schemas ---

class UserRegister(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password (min 8 chars, mixed case, number, symbol)")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    education_level: str = Field("Undergraduate", description="User education level")
    learning_interests: List[str] = Field(default_factory=list, description="List of interested subject IDs")
    learning_goals: Optional[str] = Field("Improve skills and test performance", description="Short statement of goals")

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    education_level: str
    learning_interests: List[str]
    learning_goals: Optional[str]
    joined_date: str
    role: str = "student"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Profile Updates ---

class ProfileUpdateRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    avatar_url: Optional[str] = None
    education_level: Optional[str] = "Undergraduate"
    learning_style: Optional[str] = "Visual Learner"
    preferred_pace: Optional[str] = "Moderate pace"
    peak_time: Optional[str] = "Evenings (6 PM - 9 PM)"
    weekly_goal: Optional[int] = 10
    subject_focus: Optional[str] = "React & FastAPI Fullstack"
    enable_reminders: Optional[bool] = True
    learning_interests: Optional[List[str]] = None
    learning_goals: Optional[str] = None

# --- Subject Module Schemas ---

class SubjectCreate(BaseModel):
    id: str = Field(..., description="Unique subject ID (lowercase string, e.g. 'math')")
    title: str = Field(..., description="Subject display title")
    description: str = Field(..., description="Subject description summary")
    category: str = Field("Academic", description="Academic | Programming | Placement Preparation | AI & ML | Web Development | Data Science")
    topics: List[str] = Field(default_factory=list, description="Topics within this subject")

class SubjectResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str = "Academic"
    quiz_count: int = 0
    avg_score: float = 0.0
    completions: int = 0
    is_bookmarked: bool = False

# --- Quiz Module Schemas ---

class QuestionSchema(BaseModel):
    question: str
    options: List[str]
    correct: Any  # integer index for MCQ, list of integers for multi-select, boolean or int for T/F
    type: str = Field("MCQ", description="MCQ | True/False | Multi-select")
    hint: Optional[str] = None
    explanation: Optional[str] = None

class QuizCreate(BaseModel):
    quiz_id: str = Field(..., description="Unique quiz ID string")
    title: str
    difficulty: str = Field("Beginner", description="Difficulty level: Beginner | Intermediate | Advanced")
    subject_id: str = Field(..., description="Target Subject ID link")
    topic: Optional[str] = "General"
    description: str
    questions: List[QuestionSchema]

# --- Competition Module Schemas ---

class CompetitionCreate(BaseModel):
    title: str
    type: str = Field("Daily Challenge", description="Daily Challenge | Weekly Challenge | Monthly Challenge | Subject Challenge")
    subject: str = Field(..., description="Subject name link")

class CompetitionJoin(BaseModel):
    competition_id: str
