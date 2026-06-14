from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas import ProfileUpdateRequest
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])
db = get_db()

@router.get("")
def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Get the authenticated user's profile.
    """
    return current_user

@router.put("")
def update_profile(req: ProfileUpdateRequest, current_user: dict = Depends(get_current_user)):
    """
    Update the authenticated user's profile.
    """
    user_id = current_user["user_id"]
    
    update_data = {
        "first_name": req.first_name,
        "last_name": req.last_name,
        "email": req.email.strip().lower(),
        "learning_style": req.learning_style,
        "preferred_pace": req.preferred_pace,
        "peak_time": req.peak_time,
        "weekly_goal": req.weekly_goal,
        "subject_focus": req.subject_focus,
        "enable_reminders": req.enable_reminders
    }
    
    if req.avatar_url is not None:
        update_data["avatar_url"] = req.avatar_url
        
    if req.learning_interests is not None:
        update_data["learning_interests"] = req.learning_interests
        
    if req.learning_goals is not None:
        update_data["learning_goals"] = req.learning_goals
        
    db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    return {"status": "success", "message": "Profile updated successfully"}
