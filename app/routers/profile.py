import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas import ProfileUpdateRequest

router = APIRouter(prefix="/api/profile", tags=["Profile"])
db = get_db()

def get_or_create_default_profile():
    profile = db.users.find_one({"user_id": "default_student"}, {"_id": 0})
    if not profile:
        profile = {
            "user_id": "default_student",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "avatar_url": "https://via.placeholder.com/120",
            "learning_style": "Visual Learner with strong problem-solving abilities",
            "preferred_pace": "Moderate pace with occasional deep dives",
            "peak_time": "Evenings (6 PM - 9 PM)",
            "weekly_goal": 10,
            "subject_focus": "React & FastAPI Fullstack",
            "enable_reminders": True,
            "joined_date": "January 2026"
        }
        db.users.insert_one(profile.copy())
        # Clean Mongo _id from seeded copy
        if "_id" in profile:
            del profile["_id"]
    else:
        # Auto-migration: ensure new fields are added to existing DB records
        updated = False
        defaults = {
            "weekly_goal": 10,
            "subject_focus": "React & FastAPI Fullstack",
            "enable_reminders": True
        }
        for k, v in defaults.items():
            if k not in profile:
                profile[k] = v
                updated = True
        if updated:
            db.users.update_one({"user_id": "default_student"}, {"$set": profile})
            
    return profile

@router.get("")
def get_profile():
    return get_or_create_default_profile()

@router.put("")
def update_profile(req: ProfileUpdateRequest):
    db.users.update_one(
        {"user_id": "default_student"},
        {"$set": {
            "first_name": req.first_name,
            "last_name": req.last_name,
            "email": req.email,
            "avatar_url": req.avatar_url,
            "learning_style": req.learning_style,
            "preferred_pace": req.preferred_pace,
            "peak_time": req.peak_time,
            "weekly_goal": req.weekly_goal,
            "subject_focus": req.subject_focus,
            "enable_reminders": req.enable_reminders
        }},
        upsert=True
    )
    return {"status": "success", "message": "Profile updated successfully"}
