from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.routers.auth import get_current_user
from app.routers.quiz import update_user_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])
db = get_db()

@router.get("")
def get_recommendations(current_user: dict = Depends(get_current_user)):
    """
    Get recommendations for the current user. Generates one if it doesn't exist yet.
    """
    user_id = current_user["user_id"]
    rec = db.recommendations.find_one({"user_id": user_id}, {"_id": 0})
    
    if not rec:
        update_user_recommendations(user_id)
        rec = db.recommendations.find_one({"user_id": user_id}, {"_id": 0})
        
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendations not available.")
        
    # Enrich response with recommended quiz details if available
    quiz_id = rec.get("recommended_quiz_id")
    if quiz_id:
        quiz = db.quizzes.find_one({"quiz_id": quiz_id}, {"_id": 0, "questions": 0})
        if quiz:
            rec["quiz_details"] = quiz
            
    # Enrich response with recommended subject details
    subject_id = rec.get("recommended_subject")
    if subject_id:
        subject = db.subjects.find_one({"id": subject_id}, {"_id": 0})
        if subject:
            rec["subject_details"] = subject
            
    return rec
