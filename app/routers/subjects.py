from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.schemas import SubjectCreate, SubjectResponse
from typing import List

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])
db = get_db()

@router.get("", response_model=List[SubjectResponse])
def get_subjects():
    subjects = list(db.subjects.find({}, {"_id": 0}))
    response_list = []
    
    for sub in subjects:
        sub_id = sub.get("id")
        
        # Count quizzes belonging to this subject
        quiz_count = db.quizzes.count_documents({"subject_id": sub_id})
        
        # Get all quizzes for this subject
        quizzes = list(db.quizzes.find({"subject_id": sub_id}, {"quiz_id": 1}))
        quiz_ids = [q.get("quiz_id") for q in quizzes]
        
        # Find submissions for these quizzes
        completions = 0
        avg_score = 0.0
        
        if quiz_ids:
            submissions = list(db.submissions.find({"quiz_id": {"$in": quiz_ids}}))
            completions = len(submissions)
            if completions > 0:
                avg_score = sum(s.get("percentage", 0.0) for s in submissions) / completions
                
        response_list.append(SubjectResponse(
            id=sub_id,
            title=sub.get("title", ""),
            description=sub.get("description", ""),
            quiz_count=quiz_count,
            avg_score=round(avg_score, 1),
            completions=completions
        ))
        
    return response_list

@router.post("", response_model=SubjectResponse)
def create_subject(req: SubjectCreate):
    # Check if exists
    existing = db.subjects.find_one({"id": req.id})
    if existing:
        raise HTTPException(status_code=400, detail="Subject with this ID already exists.")
        
    subject_doc = {
        "id": req.id,
        "title": req.title,
        "description": req.description
    }
    
    db.subjects.insert_one(subject_doc)
    return SubjectResponse(
        id=req.id,
        title=req.title,
        description=req.description,
        quiz_count=0,
        avg_score=0.0,
        completions=0
    )

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: str, req: SubjectCreate):
    existing = db.subjects.find_one({"id": subject_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    db.subjects.update_one(
        {"id": subject_id},
        {"$set": {
            "title": req.title,
            "description": req.description
        }}
    )
    
    # Calculate stats
    quiz_count = db.quizzes.count_documents({"subject_id": subject_id})
    quizzes = list(db.quizzes.find({"subject_id": subject_id}, {"quiz_id": 1}))
    quiz_ids = [q.get("quiz_id") for q in quizzes]
    completions = 0
    avg_score = 0.0
    if quiz_ids:
        submissions = list(db.submissions.find({"quiz_id": {"$in": quiz_ids}}))
        completions = len(submissions)
        if completions > 0:
            avg_score = sum(s.get("percentage", 0.0) for s in submissions) / completions

    return SubjectResponse(
        id=subject_id,
        title=req.title,
        description=req.description,
        quiz_count=quiz_count,
        avg_score=round(avg_score, 1),
        completions=completions
    )

@router.delete("/{subject_id}")
def delete_subject(subject_id: str):
    existing = db.subjects.find_one({"id": subject_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    db.subjects.delete_one({"id": subject_id})
    
    # Optionally delete quizzes associated with this subject
    db.quizzes.delete_one({"subject_id": subject_id})
    
    return {"status": "success", "message": f"Subject {subject_id} deleted successfully."}
