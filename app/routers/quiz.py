import os
import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas import QuizSubmissionRequest
from app.ml.classifier import EngagementClassifier

router = APIRouter(prefix="/api/quizzes", tags=["Quiz"])
db = get_db()

# Initialize classifier
MODEL_PATH = os.getenv("MODEL_PATH", "models/engagement_model.pkl")
classifier = EngagementClassifier(model_path=MODEL_PATH)

@router.get("")
def get_quizzes():
    # Return all quizzes excluding internal Mongo IDs
    quizzes = list(db.quizzes.find({}, {"_id": 0}))
    return quizzes

@router.get("/{quiz_id}")
def get_quiz(quiz_id: str):
    quiz = db.quizzes.find_one({"quiz_id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.post("/submit")
def submit_quiz(req: QuizSubmissionRequest):
    quiz = db.quizzes.find_one({"quiz_id": req.quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    questions = quiz.get("questions", [])
    correct_count = 0
    total_questions = len(questions)
    
    # Check submitted options
    for idx, ans in enumerate(req.answers):
        if idx < total_questions:
            if ans == questions[idx].get("correct"):
                correct_count += 1
                
    score_ratio = correct_count / total_questions if total_questions > 0 else 0.0
    
    # Predict engagement level
    pred = classifier.predict(
        score_ratio=score_ratio,
        completion_time=req.behavioral_metrics.time_spent,
        tab_switches=req.behavioral_metrics.tab_switches,
        mouse_clicks=req.behavioral_metrics.mouse_clicks,
        inactivity_duration=req.behavioral_metrics.inactivity_duration
    )
    
    # Construct submission record
    submission = {
        "user_id": "default_student",
        "quiz_id": req.quiz_id,
        "quiz_title": quiz.get("title", "Quiz"),
        "score": correct_count,
        "total": total_questions,
        "score_ratio": score_ratio,
        "percentage": round(score_ratio * 100, 1),
        "engagement_level": pred["engagement_level"],
        "confidence": pred["confidence"],
        "is_fallback": pred["is_fallback"],
        "behavioral_metrics": req.behavioral_metrics.model_dump(),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    # Log to MongoDB
    db.submissions.insert_one(submission)
    
    return {
        "score": correct_count,
        "total": total_questions,
        "percentage": round(score_ratio * 100, 1),
        "engagement_level": pred["engagement_level"],
        "confidence": round(pred["confidence"] * 100, 1),
        "is_fallback": pred["is_fallback"]
    }
