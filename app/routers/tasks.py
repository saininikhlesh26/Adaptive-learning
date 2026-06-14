import datetime
import uuid
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas import TaskCreate, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])
db = get_db()

@router.get("")
def get_tasks(current_user: dict = Depends(get_current_user)):
    """
    Get all tasks for the logged in user.
    """
    user_id = current_user["user_id"]
    tasks = list(db.tasks.find({"user_id": user_id}, {"_id": 0}))
    return tasks

@router.post("")
def create_task(req: TaskCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new task in the checklist.
    """
    user_id = current_user["user_id"]
    now = datetime.datetime.now(datetime.timezone.utc)
    task_doc = {
        "id": f"task_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": req.title,
        "description": req.description or "",
        "status": "Pending",  # Pending | In Progress | Completed
        "due_date": req.due_date,
        "priority": req.priority,
        "created_at": now.isoformat()
    }
    db.tasks.insert_one(task_doc)
    if "_id" in task_doc:
        del task_doc["_id"]
    return task_doc

@router.put("/{task_id}")
def update_task(task_id: str, req: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update details or status of a specific task.
    """
    user_id = current_user["user_id"]
    existing = db.tasks.find_one({"id": task_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized.")
        
    update_fields = {}
    if req.title is not None:
        update_fields["title"] = req.title
    if req.description is not None:
        update_fields["description"] = req.description
    if req.status is not None:
        update_fields["status"] = req.status
    if req.priority is not None:
        update_fields["priority"] = req.priority
        
    if not update_fields:
        return {"status": "success", "message": "No fields to update."}
        
    db.tasks.update_one(
        {"id": task_id, "user_id": user_id},
        {"$set": update_fields}
    )
    return {"status": "success", "message": "Task updated successfully."}

@router.delete("/{task_id}")
def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """
    Remove a task from the list.
    """
    user_id = current_user["user_id"]
    existing = db.tasks.find_one({"id": task_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found or unauthorized.")
        
    db.tasks.delete_one({"id": task_id, "user_id": user_id})
    return {"status": "success", "message": "Task deleted successfully."}
