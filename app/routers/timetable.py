import datetime
import uuid
from fastapi import APIRouter, HTTPException, Depends, Body
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas import TimetableCreate

router = APIRouter(prefix="/api/timetable", tags=["Timetable"])
db = get_db()

@router.get("")
def get_timetable(current_user: dict = Depends(get_current_user)):
    """
    Fetch all study timetable items for the authenticated user.
    """
    user_id = current_user["user_id"]
    items = list(db.timetables.find({"user_id": user_id}, {"_id": 0}))
    return items

@router.post("")
def add_timetable_item(req: TimetableCreate, current_user: dict = Depends(get_current_user)):
    """
    Add a manual study slot to the timetable.
    """
    user_id = current_user["user_id"]
    item_doc = {
        "id": f"time_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "subject_id": req.subject_id,
        "topic": req.topic,
        "date": req.date,
        "time_slot": req.time_slot,
        "priority": req.priority,
        "is_ai_generated": False
    }
    db.timetables.insert_one(item_doc)
    if "_id" in item_doc:
        del item_doc["_id"]
    return item_doc

@router.put("/{schedule_id}")
def update_timetable_item(
    schedule_id: str, 
    req: TimetableCreate, 
    current_user: dict = Depends(get_current_user)
):
    """
    Edit an existing study slot.
    """
    user_id = current_user["user_id"]
    existing = db.timetables.find_one({"id": schedule_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Study slot not found.")
        
    db.timetables.update_one(
        {"id": schedule_id, "user_id": user_id},
        {
            "$set": {
                "subject_id": req.subject_id,
                "topic": req.topic,
                "date": req.date,
                "time_slot": req.time_slot,
                "priority": req.priority
            }
        }
    )
    return {"status": "success", "message": "Study slot updated successfully"}

@router.delete("/{schedule_id}")
def delete_timetable_item(schedule_id: str, current_user: dict = Depends(get_current_user)):
    """
    Remove a study slot.
    """
    user_id = current_user["user_id"]
    existing = db.timetables.find_one({"id": schedule_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Study slot not found.")
        
    db.timetables.delete_one({"id": schedule_id, "user_id": user_id})
    return {"status": "success", "message": "Study slot removed successfully"}

@router.post("/generate-ai")
def generate_ai_timetable(
    available_hours: float = Body(..., embed=True), 
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an AI-driven weekly study planner.
    Evaluates:
      - Student's interests
      - Weakest subjects (score < 70)
      - Strongest subjects (score >= 85)
      - Active competitions
      - Profile peak time settings
    """
    user_id = current_user["user_id"]
    
    # 1. Gather student context
    interests = current_user.get("learning_interests", ["math", "python"])
    if not interests:
        interests = ["math", "python"]
        
    submissions = list(db.submissions.find({"user_id": user_id}))
    competitions = list(db.competitions.find({"active": True}))
    
    # 2. Analyze subject scores to find weak/strong subjects
    subject_attempts = {}
    for s in submissions:
        sub_id = s.get("subject_id")
        score = s.get("percentage", s.get("score_ratio", 0.0) * 100.0)
        if sub_id:
            if sub_id not in subject_attempts:
                subject_attempts[sub_id] = []
            subject_attempts[sub_id].append(score)
            
    subject_averages = {}
    for sub, scores in subject_attempts.items():
        subject_averages[sub] = sum(scores) / len(scores)
        
    # Active competitions subjects
    comp_subjects = [c.get("subject", "").lower().replace(" ", "_") for c in competitions]
    comp_subjects = [cs for cs in comp_subjects if cs]
    
    # 3. Calculate weights for each interest subject
    subject_weights = {}
    all_target_subjects = list(set(interests + comp_subjects))
    if not all_target_subjects:
        all_target_subjects = ["math", "python", "data_structures"]
        
    for sub in all_target_subjects:
        weight = 1.0
        avg_score = subject_averages.get(sub, 75.0)  # assume neutral 75 if no history
        
        # Weak subjects get 50% more time (weight += 0.5)
        if avg_score < 70.0:
            weight += 0.5
        # Strong subjects get normal time (weight += 0.0)
        elif avg_score >= 85.0:
            weight -= 0.1 # slightly less focus since they excel, leaving room for weaker ones
            
        # Active competition subject gets bonus weight
        if sub in comp_subjects:
            weight += 0.3
            
        subject_weights[sub] = weight
        
    total_weight = sum(subject_weights.values())
    
    # Allocate hours per subject
    subject_hours = {}
    for sub, w in subject_weights.items():
        allocated = (w / total_weight) * available_hours
        subject_hours[sub] = round(max(1.0, allocated), 1)  # min 1 hour per subject if included
        
    # 4. Schedule slots based on Peak Time profile settings
    peak_time = current_user.get("peak_time", "Evenings (6 PM - 9 PM)")
    
    # Map peak time strings to default daily study time windows
    time_slots_pool = ["10:00 - 11:30", "14:00 - 15:30", "18:00 - 19:30"]
    if "Morning" in peak_time:
        primary_slot = "09:30 - 11:00"
        secondary_slot = "11:30 - 13:00"
    elif "Afternoon" in peak_time:
        primary_slot = "14:00 - 15:30"
        secondary_slot = "16:00 - 17:30"
    elif "Evening" in peak_time or "Night" in peak_time:
        primary_slot = "18:00 - 19:30"
        secondary_slot = "20:00 - 21:30"
    else:
        primary_slot = "15:00 - 16:30"
        secondary_slot = "17:00 - 18:30"
        
    # Get subjects info to extract correct topic names
    subjects_collection = list(db.subjects.find({}, {"id": 1, "topics": 1}))
    subject_topics_map = {s["id"]: s.get("topics", ["General Theory"]) for s in subjects_collection}
    
    # 5. Generate daily slots for next 7 days
    now = datetime.datetime.now(datetime.timezone.utc)
    new_timetable_items = []
    
    # Clear existing AI-generated timetables to avoid clutter
    db.timetables.delete_many({"user_id": user_id, "is_ai_generated": True})
    
    day_offset = 1
    # Distribute topics across the days
    for sub, hrs in subject_hours.items():
        # calculate number of slots (approx 1.5 hours per slot)
        slots_needed = max(1, int(hrs / 1.5))
        topics_pool = subject_topics_map.get(sub, ["General Concept Review", "Practice Quiz Prep", "Advanced Problems"])
        
        for idx in range(slots_needed):
            target_date = now + datetime.timedelta(days=day_offset)
            date_str = target_date.strftime("%Y-%m-%d")
            
            # Select slot time
            slot_time = primary_slot if idx % 2 == 0 else secondary_slot
            
            # Select topic based on slot index
            topic_name = topics_pool[idx % len(topics_pool)]
            
            # Identify priority: weak subjects or competition subjects get High priority
            priority = "Medium"
            if subject_averages.get(sub, 75.0) < 70.0 or sub in comp_subjects:
                priority = "High"
                
            item = {
                "id": f"time_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "subject_id": sub,
                "topic": topic_name,
                "date": date_str,
                "time_slot": slot_time,
                "priority": priority,
                "is_ai_generated": True
            }
            db.timetables.insert_one(item)
            if "_id" in item:
                del item["_id"]
            new_timetable_items.append(item)
            
            day_offset += 1
            if day_offset > 7:
                # Wrap around days
                day_offset = 1
                
    return {
        "status": "success",
        "message": f"Successfully generated {len(new_timetable_items)} personalized study slots.",
        "schedule": new_timetable_items
    }
