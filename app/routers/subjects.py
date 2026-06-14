from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas import SubjectCreate, SubjectResponse
from app.routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])
db = get_db()

@router.get("", response_model=List[SubjectResponse])
def get_subjects(current_user: dict = Depends(get_current_user)):
    """
    Fetch all subjects in the catalog and check if they are bookmarked by the user.
    Calculates average score and completion count per subject for this user.
    """
    subjects = list(db.subjects.find({}, {"_id": 0}))
    user_bookmarks = current_user.get("bookmarks", [])
    user_id = current_user["user_id"]
    
    response_list = []
    for sub in subjects:
        sub_id = sub.get("id")
        
        # Count quizzes belonging to this subject
        quiz_count = db.quizzes.count_documents({"subject_id": sub_id})
        
        # Get all quizzes for this subject
        quizzes = list(db.quizzes.find({"subject_id": sub_id}, {"quiz_id": 1}))
        quiz_ids = [q.get("quiz_id") for q in quizzes]
        
        # Find submissions for these quizzes by the current user
        completions = 0
        avg_score = 0.0
        
        if quiz_ids:
            submissions = list(db.submissions.find({
                "user_id": user_id,
                "quiz_id": {"$in": quiz_ids}
            }))
            completions = len(submissions)
            if completions > 0:
                avg_score = sum(s.get("percentage", 0.0) for s in submissions) / completions
                
        response_list.append(SubjectResponse(
            id=sub_id,
            title=sub.get("title", ""),
            description=sub.get("description", ""),
            category=sub.get("category", "Academic"),
            quiz_count=quiz_count,
            avg_score=round(avg_score, 1),
            completions=completions,
            is_bookmarked=(sub_id in user_bookmarks)
        ))
        
    return response_list

@router.post("/{subject_id}/bookmark")
def toggle_bookmark(subject_id: str, current_user: dict = Depends(get_current_user)):
    """
    Toggle bookmark for a specific subject for the logged-in user.
    """
    # Verify subject exists
    subject = db.subjects.find_one({"id": subject_id})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    user_bookmarks = current_user.get("bookmarks", [])
    user_id = current_user["user_id"]
    
    if subject_id in user_bookmarks:
        db.users.update_one(
            {"user_id": user_id},
            {"$pull": {"bookmarks": subject_id}}
        )
        is_bookmarked = False
        msg = "Bookmark removed."
    else:
        db.users.update_one(
            {"user_id": user_id},
            {"$push": {"bookmarks": subject_id}}
        )
        is_bookmarked = True
        msg = "Bookmark added."
        
    return {"status": "success", "message": msg, "is_bookmarked": is_bookmarked}

@router.post("", response_model=SubjectResponse)
def create_subject(req: SubjectCreate, current_user: dict = Depends(get_current_user)):
    """
    Admin-only: Create a new subject in the catalog.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage subjects.")
        
    existing = db.subjects.find_one({"id": req.id})
    if existing:
        raise HTTPException(status_code=400, detail="Subject with this ID already exists.")
        
    subject_doc = {
        "id": req.id,
        "title": req.title,
        "description": req.description,
        "category": req.category,
        "topics": req.topics
    }
    
    db.subjects.insert_one(subject_doc)
    return SubjectResponse(
        id=req.id,
        title=req.title,
        description=req.description,
        category=req.category,
        quiz_count=0,
        avg_score=0.0,
        completions=0,
        is_bookmarked=False
    )

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: str, req: SubjectCreate, current_user: dict = Depends(get_current_user)):
    """
    Admin-only: Update a subject.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage subjects.")
        
    existing = db.subjects.find_one({"id": subject_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    db.subjects.update_one(
        {"id": subject_id},
        {"$set": {
            "title": req.title,
            "description": req.description,
            "category": req.category,
            "topics": req.topics
        }}
    )
    
    # Calculate current stats
    quiz_count = db.quizzes.count_documents({"subject_id": subject_id})
    quizzes = list(db.quizzes.find({"subject_id": subject_id}, {"quiz_id": 1}))
    quiz_ids = [q.get("quiz_id") for q in quizzes]
    completions = 0
    avg_score = 0.0
    if quiz_ids:
        submissions = list(db.submissions.find({
            "user_id": current_user["user_id"],
            "quiz_id": {"$in": quiz_ids}
        }))
        completions = len(submissions)
        if completions > 0:
            avg_score = sum(s.get("percentage", 0.0) for s in submissions) / completions

    user_bookmarks = current_user.get("bookmarks", [])
    
    return SubjectResponse(
        id=subject_id,
        title=req.title,
        description=req.description,
        category=req.category,
        quiz_count=quiz_count,
        avg_score=round(avg_score, 1),
        completions=completions,
        is_bookmarked=(subject_id in user_bookmarks)
    )

@router.delete("/{subject_id}")
def delete_subject(subject_id: str, current_user: dict = Depends(get_current_user)):
    """
    Admin-only: Delete a subject.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage subjects.")
        
    existing = db.subjects.find_one({"id": subject_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    db.subjects.delete_one({"id": subject_id})
    
    # Optionally delete quizzes associated with this subject
    db.quizzes.delete_one({"subject_id": subject_id})
    
    return {"status": "success", "message": f"Subject {subject_id} deleted successfully."}
