from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas import CompetitionCreate, CompetitionJoin
from app.routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/competitions", tags=["Competitions"])
db = get_db()

@router.get("")
def get_competitions(current_user: dict = Depends(get_current_user)):
    """
    Get all active and past challenges.
    """
    comps = list(db.competitions.find({}, {"_id": 0}))
    return comps

@router.post("")
def create_competition(req: CompetitionCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new competition challenge (admin only).
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create competitions.")
        
    comp_id = f"comp_{req.title.lower().replace(' ', '_')}"
    # Check if duplicate
    existing = db.competitions.find_one({"id": comp_id})
    if existing:
        raise HTTPException(status_code=400, detail="Competition already exists.")
        
    comp_doc = {
        "id": comp_id,
        "title": req.title,
        "type": req.type,
        "subject": req.subject,
        "participant_count": 1,
        "active": True
    }
    
    db.competitions.insert_one(comp_doc)
    return comp_doc

@router.post("/join")
def join_competition(req: CompetitionJoin, current_user: dict = Depends(get_current_user)):
    """
    Register the logged-in user for a competition.
    """
    comp = db.competitions.find_one({"id": req.competition_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
        
    # Increment participant count
    db.competitions.update_one(
        {"id": req.competition_id},
        {"$inc": {"participant_count": 1}}
    )
    
    # Store join status in user profile if not exists
    user_id = current_user["user_id"]
    db.users.update_one(
        {"user_id": user_id},
        {"$push": {"joined_competitions": req.competition_id}}
    )
    
    return {"status": "success", "message": "Joined competition successfully."}

@router.get("/{competition_id}/leaderboard")
def get_leaderboard(competition_id: str, current_user: dict = Depends(get_current_user)):
    """
    Fetch the ranking table for a competition, dynamically placing the active user.
    """
    comp = db.competitions.find_one({"id": competition_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
        
    user_id = current_user["user_id"]
    user_fullname = f"{current_user.get('first_name', 'Student')} {current_user.get('last_name', '')} (You)"
    
    # Check the user's score in the relevant subject for this competition
    sub_id = comp.get("subject", "").lower().replace(" ", "_")
    submissions = list(db.submissions.find({"user_id": user_id}))
    
    # Standard Mock Leaderboard Base
    leaderboard = [
        {"rank": 1, "name": "Alice Smith", "score": 950, "engagement_score": 98.0},
        {"rank": 2, "name": "Bob Johnson", "score": 880, "engagement_score": 85.0},
        {"rank": 3, "name": "Charlie Brown", "score": 750, "engagement_score": 60.0}
    ]
    
    # Calculate current user's score based on attempts
    user_score = 0
    user_engagement = 85.0
    user_completions = len(submissions)
    
    if user_completions > 0:
        # Sum score of all submissions (e.g. 100 points per correct answer)
        user_score = int(sum(s.get("score", 0) for s in submissions) * 50)
        
        engagement_map = {"Focused": 95.0, "Struggling": 60.0, "Bored": 30.0}
        user_engagement = sum(engagement_map.get(s.get("engagement_level", "Focused"), 85.0) for s in submissions) / user_completions
    else:
        # Initial onboarding default score
        user_score = 0
        user_engagement = 100.0
        
    # Add active user entry
    user_entry = {
        "rank": 4,
        "name": user_fullname,
        "score": user_score,
        "engagement_score": round(user_engagement, 1)
    }
    leaderboard.append(user_entry)
    
    # Sort leaderboard by score descending, then engagement descending
    leaderboard.sort(key=lambda x: (x["score"], x["engagement_score"]), reverse=True)
    
    # Re-assign ranks
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
        
    return leaderboard
