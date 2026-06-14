import os
import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from app.database import get_db
from app.schemas import QuizSubmissionRequest, QuizCreate
from app.ml.classifier import EngagementClassifier
from app.routers.auth import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/api/quizzes", tags=["Quiz"])
db = get_db()

# Initialize classifier
MODEL_PATH = os.getenv("MODEL_PATH", "models/engagement_model.pkl")
classifier = EngagementClassifier(model_path=MODEL_PATH)

def update_user_recommendations(user_id: str):
    """
    Recalculates weak/strong areas and logs recommended next steps in the database.
    """
    submissions = list(db.submissions.find({"user_id": user_id}))
    user = db.users.find_one({"user_id": user_id})
    interests = user.get("learning_interests", []) if user else []
    bookmarks = user.get("bookmarks", []) if user else []
    
    if not submissions:
        # Default recommendation based on interests
        rec_subject = interests[0] if interests else "math"
        # Find a beginner quiz in this subject
        quiz = db.quizzes.find_one({"subject_id": rec_subject, "difficulty": "Beginner"})
        
        db.recommendations.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "weak_topics": [],
                "strong_topics": [],
                "recommended_subject": rec_subject,
                "recommended_quiz_id": quiz.get("quiz_id") if quiz else "math_q1",
                "recommended_difficulty": "Beginner",
                "reason": "Based on your onboarding interests.",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }},
            upsert=True
        )
        return

    # Calculate average scores per subject
    subject_stats = {}
    for s in submissions:
        sub_id = s.get("subject_id")
        if not sub_id:
            # Try to resolve subject_id from quiz_id
            q = db.quizzes.find_one({"quiz_id": s.get("quiz_id")})
            sub_id = q.get("subject_id") if q else "math"
            
        if sub_id not in subject_stats:
            subject_stats[sub_id] = []
        subject_stats[sub_id].append(s.get("percentage", 0.0))
        
    weak_topics = []
    strong_topics = []
    
    for sub_id, scores in subject_stats.items():
        avg = sum(scores) / len(scores)
        subject_doc = db.subjects.find_one({"id": sub_id})
        title = subject_doc.get("title", sub_id) if subject_doc else sub_id
        
        if avg < 70.0:
            weak_topics.append(title)
        elif avg >= 85.0:
            strong_topics.append(title)
            
    # Determine next target subject
    # Focus on weak topics first, then bookmarks, then interests, then general
    target_subject_id = None
    rec_difficulty = "Beginner"
    reason = ""
    
    # 1. Check if there are weak subjects
    for sub_id in subject_stats:
        avg = sum(subject_stats[sub_id]) / len(subject_stats[sub_id])
        if avg < 70.0:
            target_subject_id = sub_id
            rec_difficulty = "Beginner"
            reason = f"Reviewing {sub_id} because your average score is currently low ({round(avg, 1)}%)."
            break
            
    # 2. Check bookmarks
    if not target_subject_id:
        for b in bookmarks:
            # Check if user has already completed all quizzes in bookmarked subject
            completed_quizzes = {s.get("quiz_id") for s in submissions if s.get("subject_id") == b}
            all_quizzes = list(db.quizzes.find({"subject_id": b}))
            uncompleted = [q for q in all_quizzes if q.get("quiz_id") not in completed_quizzes]
            if uncompleted:
                target_subject_id = b
                rec_difficulty = "Intermediate"
                reason = "Continuing with one of your bookmarked subjects."
                break
                
    # 3. Check interests
    if not target_subject_id:
        for i in interests:
            completed_quizzes = {s.get("quiz_id") for s in submissions if s.get("subject_id") == i}
            all_quizzes = list(db.quizzes.find({"subject_id": i}))
            uncompleted = [q for q in all_quizzes if q.get("quiz_id") not in completed_quizzes]
            if uncompleted:
                target_subject_id = i
                rec_difficulty = "Beginner"
                reason = "Exploring one of your chosen interests."
                break

    # Default fallback
    if not target_subject_id:
        target_subject_id = "math"
        reason = "Expand your foundational concepts in Mathematics."
        
    # Find a recommended quiz
    completed_quizzes = {s.get("quiz_id") for s in submissions}
    # Find quiz in target subject that isn't completed
    quiz = db.quizzes.find_one({
        "subject_id": target_subject_id,
        "quiz_id": {"$notin": list(completed_quizzes)}
    })
    
    # If all completed, suggest an advanced quiz or any quiz
    if not quiz:
        quiz = db.quizzes.find_one({"subject_id": target_subject_id, "difficulty": "Advanced"})
    if not quiz:
        quiz = db.quizzes.find_one({"subject_id": target_subject_id})
        
    # Scale difficulty recommendation to user's average engagement
    last_submission = submissions[-1]
    last_engagement = last_submission.get("engagement_level", "Focused")
    
    if last_engagement == "Bored":
        rec_difficulty = "Advanced"
        reason += " Setting it to Advanced because you felt bored in your last attempt."
    elif last_engagement == "Struggling":
        rec_difficulty = "Beginner"
        reason += " Setting it to Beginner with active hints to help you get back on track."
    else:
        rec_difficulty = "Intermediate"
        
    db.recommendations.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "recommended_subject": target_subject_id,
            "recommended_quiz_id": quiz.get("quiz_id") if quiz else "math_q1",
            "recommended_difficulty": rec_difficulty,
            "reason": reason,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }},
        upsert=True
    )

@router.get("")
def get_quizzes(
    subject_id: Optional[str] = None,
    difficulty: Optional[str] = None,
    topic: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Fetch all quizzes, optionally filtered by subject, difficulty, and topic.
    Excludes internal MongoDB IDs.
    """
    filter_dict = {}
    if subject_id:
        filter_dict["subject_id"] = subject_id
    if difficulty:
        filter_dict["difficulty"] = difficulty
    if topic:
        filter_dict["topic"] = topic
        
    quizzes = list(db.quizzes.find(filter_dict, {"_id": 0}))
    return quizzes

@router.get("/{quiz_id}")
def get_quiz(quiz_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get details of a specific quiz, including all questions.
    """
    quiz = db.quizzes.find_one({"quiz_id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.post("/submit")
def submit_quiz(req: QuizSubmissionRequest, current_user: dict = Depends(get_current_user)):
    """
    Grade quiz submissions, apply partial credit scoring, and run ML engagement classifier.
    Logs submission results to submissions and triggers recommendation updates.
    """
    quiz = db.quizzes.find_one({"quiz_id": req.quiz_id})
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    questions = quiz.get("questions", [])
    total_questions = len(questions)
    
    total_score = 0.0
    
    # Calculate score using partial credit logic
    for idx, user_ans in enumerate(req.answers):
        if idx >= total_questions:
            break
            
        q = questions[idx]
        q_type = q.get("type", "MCQ")
        correct_ans = q.get("correct")
        
        if q_type == "Multi-select":
            # correct_ans is a list of option indices, e.g. [0, 2]
            # user_ans is a list of selected option indices, e.g. [0]
            if not isinstance(correct_ans, list):
                correct_ans = [correct_ans]
            if not isinstance(user_ans, list):
                user_ans = [user_ans]
                
            if len(correct_ans) == 0:
                q_score = 0.0
            else:
                q_points = 0.0
                points_per_correct = 1.0 / len(correct_ans)
                for choice in user_ans:
                    if choice in correct_ans:
                        q_points += points_per_correct
                    else:
                        q_points -= points_per_correct
                q_score = max(0.0, q_points)
            total_score += q_score
            
        else:
            # MCQ or True/False - binary scoring
            if user_ans == correct_ans:
                total_score += 1.0
                
    score_ratio = total_score / total_questions if total_questions > 0 else 0.0
    percentage = round(score_ratio * 100, 1)
    
    # Predict engagement level
    pred = classifier.predict(
        score_ratio=score_ratio,
        completion_time=req.behavioral_metrics.time_spent,
        tab_switches=req.behavioral_metrics.tab_switches,
        mouse_clicks=req.behavioral_metrics.mouse_clicks,
        inactivity_duration=req.behavioral_metrics.inactivity_duration
    )
    
    # Construct submission record
    user_id = current_user["user_id"]
    submission = {
        "user_id": user_id,
        "quiz_id": req.quiz_id,
        "quiz_title": quiz.get("title", "Quiz"),
        "subject_id": quiz.get("subject_id", "math"),
        "score": round(total_score, 2),
        "total": total_questions,
        "score_ratio": round(score_ratio, 3),
        "percentage": percentage,
        "engagement_level": pred["engagement_level"],
        "confidence": pred["confidence"],
        "is_fallback": pred["is_fallback"],
        "behavioral_metrics": req.behavioral_metrics.model_dump(),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    # Log to MongoDB
    db.submissions.insert_one(submission)
    
    # Trigger AI recommendations update for the user
    update_user_recommendations(user_id)
    
    return {
        "score": round(total_score, 2),
        "total": total_questions,
        "percentage": percentage,
        "engagement_level": pred["engagement_level"],
        "confidence": round(pred["confidence"] * 100, 1),
        "is_fallback": pred["is_fallback"]
    }
