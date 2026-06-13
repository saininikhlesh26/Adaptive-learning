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
