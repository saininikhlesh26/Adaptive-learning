import datetime
from fastapi import APIRouter
from app.database import get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
db = get_db()

@router.get("/stats")
def get_dashboard_stats():
    submissions = list(db.submissions.find({"user_id": "default_student"}).sort("timestamp", -1))
    
    total_completed = len(submissions)
    
    # Calculate average score
    if total_completed > 0:
        avg_score = sum(s.get("percentage", 0.0) for s in submissions) / total_completed
    else:
        avg_score = 92.0  # fallback mockup default
        
    # Calculate average engagement
    # Mapping Focused -> 95, Struggling -> 60, Bored -> 30
    engagement_map = {"Focused": 95.0, "Struggling": 60.0, "Bored": 30.0}
    if total_completed > 0:
        avg_engagement = sum(engagement_map.get(s.get("engagement_level", "Focused"), 85.0) for s in submissions) / total_completed
    else:
        avg_engagement = 85.0  # fallback mockup default
        
    # Format recent activity list
    recent_activities = []
    for s in submissions[:5]:
        ts_str = s.get("timestamp", "")
        time_label = "Just now"
        try:
            # Parse ISO timestamp
            ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            now = datetime.datetime.now(datetime.timezone.utc)
            diff = now - ts
            if diff.days > 0:
                time_label = f"{diff.days} days ago" if diff.days > 1 else "Yesterday"
            elif diff.seconds >= 3600:
                hours = diff.seconds // 3600
                time_label = f"{hours} hours ago" if hours > 1 else "1 hour ago"
            elif diff.seconds >= 60:
                mins = diff.seconds // 60
                time_label = f"{mins} minutes ago" if mins > 1 else "1 minute ago"
            else:
                time_label = "Just now"
        except Exception:
            time_label = "Recently"
            
        recent_activities.append({
            "title": f"Completed: {s.get('quiz_title', 'Quiz')}",
            "description": f"{time_label} - Score: {s.get('score')}/{s.get('total')} ({s.get('percentage')}%)",
            "engagement": s.get("engagement_level")
        })
        
    if not recent_activities:
        recent_activities = [
            {"title": "Completed: React Fundamentals", "description": "Today at 2:30 PM - Score: 95%", "engagement": "Focused"},
            {"title": "Completed: State Management", "description": "Yesterday at 3:15 PM - Score: 88%", "engagement": "Focused"},
            {"title": "Completed: Component Lifecycle", "description": "2 days ago at 4:00 PM - Score: 91%", "engagement": "Focused"}
        ]
        
    return {
        "lessons_completed": 8 + total_completed, # baseline 8 plus live completions
        "streak_days": 7,
        "engagement_score": round(avg_engagement, 1),
        "average_score": round(avg_score, 1),
        "recent_activity": recent_activities
    }
