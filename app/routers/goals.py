import datetime
import uuid
from fastapi import APIRouter, HTTPException, Depends, Body
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas import GoalCreate

router = APIRouter(prefix="/api/goals", tags=["Goals"])
db = get_db()

@router.get("")
def get_goals(current_user: dict = Depends(get_current_user)):
    """
    Get all goals for the logged in user.
    Also returns achievements and dynamic goal calculations.
    """
    user_id = current_user["user_id"]
    goals = list(db.goals.find({"user_id": user_id}, {"_id": 0}))
    submissions = list(db.submissions.find({"user_id": user_id}))
    
    # Dynamically update goal progress based on submissions
    updated_goals = []
    goals_completed_count = 0
    
    for goal in goals:
        sub_id = goal.get("subject_id")
        goal_type = goal.get("goal_type")
        target = goal.get("target_value", 1.0)
        current = goal.get("current_value", 0.0)
        status = goal.get("status", "Active")
        
        # Only auto-sync active goals
        if status == "Active":
            subject_subs = [s for s in submissions if s.get("subject_id") == sub_id]
            
            if goal_type == "Quizzes Solved":
                current = float(len(subject_subs))
            elif goal_type == "Quiz Score":
                # Find maximum score percentage
                if subject_subs:
                    current = float(max(s.get("percentage", s.get("score_ratio", 0.0) * 100.0) for s in subject_subs))
                else:
                    current = 0.0
            elif goal_type == "Study Hours":
                # sum time spent + buffer in hours
                total_seconds = sum(s.get("behavioral_metrics", {}).get("time_spent", 300.0) for s in subject_subs)
                total_seconds += len(subject_subs) * 900.0
                current = round(total_seconds / 3600.0, 1)
                
            # Check if goal is met
            if current >= target:
                status = "Completed"
                current = target
                
            # Update database
            db.goals.update_one(
                {"id": goal.get("id"), "user_id": user_id},
                {"$set": {"current_value": current, "status": status}}
            )
            
            goal["current_value"] = current
            goal["status"] = status
            
        if status == "Completed":
            goals_completed_count += 1
            
        updated_goals.append(goal)
        
    # Generate Achievements badges based on performance
    achievements = []
    
    # 1. Goal completion milestone
    if goals_completed_count >= 1:
        achievements.append({
            "id": "goal_crusher_1",
            "title": "Goal Crusher",
            "description": "Successfully completed your first study goal.",
            "icon": "🎯",
            "unlocked_at": datetime.datetime.now(datetime.timezone.utc).strftime("%B %Y")
        })
        
    # 2. Quiz attempts milestone
    if len(submissions) >= 1:
        achievements.append({
            "id": "quiz_starter",
            "title": "First Step",
            "description": "Completed your first adaptive quiz attempt.",
            "icon": "⚡",
            "unlocked_at": "January 2026"
        })
    if len(submissions) >= 5:
        achievements.append({
            "id": "quiz_veteran",
            "title": "Quiz Scholar",
            "description": "Completed 5 or more quizzes across subjects.",
            "icon": "📚",
            "unlocked_at": datetime.datetime.now(datetime.timezone.utc).strftime("%B %Y")
        })
        
    # 3. High score milestone
    has_high_score = any(s.get("percentage", 0.0) >= 90.0 for s in submissions)
    if has_high_score:
        achievements.append({
            "id": "high_flyer",
            "title": "Perfect Score",
            "description": "Scored 90% or higher in a quiz.",
            "icon": "👑",
            "unlocked_at": datetime.datetime.now(datetime.timezone.utc).strftime("%B %Y")
        })
        
    # 4. Engagement milestone
    has_focused = any(s.get("engagement_level") == "Focused" for s in submissions)
    if has_focused:
        achievements.append({
            "id": "hyper_focus",
            "title": "Hyper Focus",
            "description": "Achieved a 'Focused' engagement level rating.",
            "icon": "🧠",
            "unlocked_at": datetime.datetime.now(datetime.timezone.utc).strftime("%B %Y")
        })
        
    return {
        "goals": updated_goals,
        "achievements": achievements
    }

@router.post("")
def create_goal(req: GoalCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new study goal.
    """
    user_id = current_user["user_id"]
    now = datetime.datetime.now(datetime.timezone.utc)
    
    goal_doc = {
        "id": f"goal_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": req.title,
        "subject_id": req.subject_id,
        "target_value": req.target_value,
        "current_value": 0.0,
        "goal_type": req.goal_type,
        "status": "Active",
        "deadline": req.deadline,
        "created_at": now.isoformat()
    }
    db.goals.insert_one(goal_doc)
    if "_id" in goal_doc:
        del goal_doc["_id"]
    return goal_doc

@router.put("/{goal_id}/progress")
def update_goal_progress(
    goal_id: str, 
    current_value: float = Body(..., embed=True), 
    current_user: dict = Depends(get_current_user)
):
    """
    Manually update study goal progress.
    """
    user_id = current_user["user_id"]
    existing = db.goals.find_one({"id": goal_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found.")
        
    status = "Active"
    if current_value >= existing.get("target_value", 1.0):
        status = "Completed"
        current_value = existing.get("target_value")
        
    db.goals.update_one(
        {"id": goal_id, "user_id": user_id},
        {"$set": {"current_value": current_value, "status": status}}
    )
    return {"status": "success", "message": "Goal progress updated successfully.", "status_label": status}

@router.delete("/{goal_id}")
def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a study goal.
    """
    user_id = current_user["user_id"]
    existing = db.goals.find_one({"id": goal_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Goal not found.")
        
    db.goals.delete_one({"id": goal_id, "user_id": user_id})
    return {"status": "success", "message": "Goal deleted successfully."}
