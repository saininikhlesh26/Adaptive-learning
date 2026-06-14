import datetime
from fastapi import APIRouter, Depends
from app.database import get_db
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
db = get_db()

def calculate_streak(submissions) -> int:
    """
    Calculates the consecutive study day streak based on user submission timestamps.
    """
    if not submissions:
        return 0
        
    # Extract unique dates sorted descending
    dates = []
    for s in submissions:
        ts_str = s.get("timestamp", "")
        if ts_str:
            try:
                dt = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                dates.append(dt.date())
            except Exception:
                continue
                
    unique_dates = sorted(list(set(dates)), reverse=True)
    if not unique_dates:
        return 0
        
    today = datetime.datetime.now(datetime.timezone.utc).date()
    yesterday = today - datetime.timedelta(days=1)
    
    # Streak starts if last activity was today or yesterday
    if unique_dates[0] != today and unique_dates[0] != yesterday:
        return 0
        
    streak = 1
    for i in range(len(unique_dates) - 1):
        diff = unique_dates[i] - unique_dates[i + 1]
        if diff.days == 1:
            streak += 1
        elif diff.days > 1:
            break # Streak broken
            
    return streak

@router.get("/stats")
def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """
    Aggregates stats for the user's dashboard: streaks, custom chart data (weekly progress,
    subject breakdown, performance trends), and activity list.
    """
    user_id = current_user["user_id"]
    submissions = list(db.submissions.find({"user_id": user_id}).sort("timestamp", -1))
    
    total_completed = len(submissions)
    
    # 1. Streaks
    streak_days = calculate_streak(submissions)
    
    # 2. Averages
    if total_completed > 0:
        avg_score = sum(s.get("percentage", 0.0) for s in submissions) / total_completed
    else:
        avg_score = 0.0
        
    engagement_map = {"Focused": 95.0, "Struggling": 60.0, "Bored": 30.0}
    if total_completed > 0:
        avg_engagement = sum(engagement_map.get(s.get("engagement_level", "Focused"), 85.0) for s in submissions) / total_completed
    else:
        avg_engagement = 100.0
        
    # 3. Weekly Progress (Past 7 Days count for custom Bar Chart)
    today = datetime.datetime.now(datetime.timezone.utc)
    weekly_progress = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_date = day.date()
        
        day_completions = 0
        for s in submissions:
            ts_str = s.get("timestamp", "")
            if ts_str:
                try:
                    s_date = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00")).date()
                    if s_date == day_date:
                        day_completions += 1
                except Exception:
                    continue
                    
        weekly_progress.append({
            "day": day.strftime("%a"),
            "completed": day_completions
        })
        
    # 4. Subject Progress (For Radar Chart)
    subject_map = {}
    for s in submissions:
        sub_id = s.get("subject_id")
        if not sub_id:
            # Try loading from quiz
            q = db.quizzes.find_one({"quiz_id": s.get("quiz_id")})
            sub_id = q.get("subject_id") if q else "math"
            
        if sub_id not in subject_map:
            subject_map[sub_id] = {"completed": 0, "total_score": 0.0}
            
        subject_map[sub_id]["completed"] += 1
        subject_map[sub_id]["total_score"] += s.get("percentage", 0.0)
        
    subject_progress = []
    for sub_id, data in subject_map.items():
        sub_doc = db.subjects.find_one({"id": sub_id})
        title = sub_doc.get("title", sub_id.title()) if sub_doc else sub_id.title()
        subject_progress.append({
            "subject": title,
            "completed": data["completed"],
            "avg_score": round(data["total_score"] / data["completed"], 1)
        })
        
    # Default placeholder items if subject_progress is empty
    if not subject_progress:
        # Load user interests as placeholders
        for interest in current_user.get("learning_interests", ["math"]):
            sub_doc = db.subjects.find_one({"id": interest})
            title = sub_doc.get("title", interest.title()) if sub_doc else interest.title()
            subject_progress.append({
                "subject": title,
                "completed": 0,
                "avg_score": 0.0
            })
            
    # 5. Performance Trends (Last 10 attempts for Line Graph)
    performance_trends = []
    # Grab last 10 attempts chronological (reverse of submissions[:10])
    recent_attempts = list(reversed(submissions[:10]))
    for idx, s in enumerate(recent_attempts):
        performance_trends.append({
            "attempt": idx + 1,
            "quiz_title": s.get("quiz_title", "Quiz"),
            "score": s.get("percentage", 0.0),
            "engagement": s.get("engagement_level", "Focused")
        })
        
    # 6. Recent Activities list (Last 5 items)
    recent_activities = []
    for s in submissions[:5]:
        ts_str = s.get("timestamp", "")
        time_label = "Just now"
        try:
            ts = datetime.datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            diff = today - ts
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
            "engagement": s.get("engagement_level", "Focused")
        })
        
    return {
        "lessons_completed": total_completed,
        "streak_days": streak_days,
        "engagement_score": round(avg_engagement, 1),
        "average_score": round(avg_score, 1),
        "recent_activity": recent_activities,
        "weekly_progress": weekly_progress,
        "subject_progress": subject_progress,
        "performance_trends": performance_trends
    }
