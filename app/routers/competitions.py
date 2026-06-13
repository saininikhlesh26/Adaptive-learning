from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas import CompetitionCreate, CompetitionJoin
from typing import List, Dict, Any

router = APIRouter(prefix="/api/competitions", tags=["Competitions"])
db = get_db()

@router.get("")
def get_competitions():
    comps = list(db.competitions.find({}, {"_id": 0}))
    return comps

@router.post("")
def create_competition(req: CompetitionCreate):
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
def join_competition(req: CompetitionJoin):
    comp = db.competitions.find_one({"id": req.competition_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
        
    db.competitions.update_one(
        {"id": req.competition_id},
        {"$inc": {"participant_count": 1}}
    )
    return {"status": "success", "message": "Joined competition successfully."}

@router.get("/{competition_id}/leaderboard")
def get_leaderboard(competition_id: str):
    # Check if competition exists
    comp = db.competitions.find_one({"id": competition_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Competition not found")
        
    # Check if we have submissions
    submissions = list(db.submissions.find())
    
    # Standard Mock Leaderboard Base
    leaderboard = [
        {"rank": 1, "name": "Alice Smith", "score": 95, "engagement_score": 98},
        {"rank": 2, "name": "Bob Johnson", "score": 88, "engagement_score": 85},
        {"rank": 3, "name": "Charlie Brown", "score": 75, "engagement_score": 60}
    ]
    
    # Dynamically inject the active user John Doe based on real submissions if they exist!
    user_score = 0
    user_engagement = 85.0
    user_completions = len(submissions)
    
    if user_completions > 0:
        # Sum score of all submissions
        user_score = sum(s.get("score", 0) for s in submissions) * 10  # e.g., 10 points per correct answer
        engagement_map = {"Focused": 95.0, "Struggling": 60.0, "Bored": 30.0}
        user_engagement = sum(engagement_map.get(s.get("engagement_level", "Focused"), 85.0) for s in submissions) / user_completions
        
    # Add John Doe (You) to the leaderboard dynamically
    john_doe_entry = {
        "rank": 2, # default rank
        "name": "John Doe (You)",
        "score": user_score if user_score > 0 else 85,
        "engagement_score": round(user_engagement, 1)
    }
    
    leaderboard.append(john_doe_entry)
    
    # Sort leaderboard by score descending, then engagement descending
    leaderboard.sort(key=lambda x: (x["score"], x["engagement_score"]), reverse=True)
    
    # Re-assign ranks
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
        
    return leaderboard
