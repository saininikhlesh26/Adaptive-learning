from fastapi import APIRouter, HTTPException, Depends, status
from app.database import get_db
from app.schemas import QuizCreate, SubjectCreate
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])
db = get_db()

def verify_admin(current_user: dict = Depends(get_current_user)):
    """
    Dependency to check if the active user is an Admin.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Student account does not have administrator privileges."
        )
    return current_user

@router.get("/metrics")
def get_admin_metrics(admin_user: dict = Depends(verify_admin)):
    """
    Return global platform statistics.
    """
    total_users = db.users.count_documents({})
    total_quizzes = db.quizzes.count_documents({})
    total_subjects = db.subjects.count_documents({})
    
    submissions = list(db.submissions.find({}))
    total_submissions = len(submissions)
    
    avg_score = 0.0
    engagement_distribution = {"Focused": 0, "Struggling": 0, "Bored": 0}
    
    if total_submissions > 0:
        avg_score = sum(s.get("percentage", 0.0) for s in submissions) / total_submissions
        for s in submissions:
            level = s.get("engagement_level", "Focused")
            if level in engagement_distribution:
                engagement_distribution[level] += 1
            else:
                # Handle unexpected labels safely
                engagement_distribution["Focused"] += 1
                
    return {
        "total_users": total_users,
        "total_quizzes": total_quizzes,
        "total_subjects": total_subjects,
        "total_submissions": total_submissions,
        "global_average_score": round(avg_score, 1),
        "engagement_distribution": engagement_distribution
    }

@router.post("/quizzes")
def create_quiz(req: QuizCreate, admin_user: dict = Depends(verify_admin)):
    """
    Add a new quiz (with questions) to the database catalog.
    """
    # Verify subject exists
    subject = db.subjects.find_one({"id": req.subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    # Check if quiz_id is duplicate
    existing = db.quizzes.find_one({"quiz_id": req.quiz_id})
    if existing:
        raise HTTPException(status_code=400, detail="Quiz ID already exists.")
        
    quiz_doc = {
        "quiz_id": req.quiz_id,
        "title": req.title,
        "difficulty": req.difficulty,
        "subject_id": req.subject_id,
        "topic": req.topic or "General",
        "description": req.description,
        "questions": [q.model_dump() for q in req.questions]
    }
    
    db.quizzes.insert_one(quiz_doc)
    return {"status": "success", "message": f"Quiz {req.title} added successfully."}
