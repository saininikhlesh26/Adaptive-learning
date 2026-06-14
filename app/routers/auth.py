import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from app.utils.auth import (
    validate_password,
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
db = get_db()
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to get the currently authenticated user from JWT bearer token.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("user_id")
    user = db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

@router.post("/register", response_model=TokenResponse)
def register(req: UserRegister):
    # Normalize email
    email = req.email.strip().lower()
    
    # Check if user exists
    existing = db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already registered.")
        
    # Validate password strength
    if not validate_password(req.password):
        raise HTTPException(
            status_code=400, 
            detail="Password does not meet safety requirements: must be 8+ chars and contain an uppercase, lowercase, number, and special character."
        )
        
    # Create hashed password
    pwd_hash = hash_password(req.password)
    user_id = f"usr_{email.replace('@', '_').replace('.', '_')}"
    
    # Curated avatar selection
    # Choose a default avatar based on interests or random
    avatar_url = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
    
    # Determine role
    role = "student"
    if email == "admin@adaptive.com":
        role = "admin"
        
    now = datetime.datetime.now(datetime.timezone.utc)
    joined_date = now.strftime("%B %Y")
    
    user_doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": pwd_hash,
        "first_name": req.first_name,
        "last_name": req.last_name,
        "avatar_url": avatar_url,
        "education_level": req.education_level,
        "learning_interests": req.learning_interests,
        "learning_goals": req.learning_goals,
        "joined_date": joined_date,
        "role": role,
        # Default profile settings
        "learning_style": "Visual Learner",
        "preferred_pace": "Moderate pace",
        "peak_time": "Evenings (6 PM - 9 PM)",
        "weekly_goal": 10,
        "subject_focus": req.learning_interests[0] if req.learning_interests else "General",
        "enable_reminders": True
    }
    
    db.users.insert_one(user_doc)
    
    # Clean document for response
    response_user = user_doc.copy()
    if "password_hash" in response_user:
        del response_user["password_hash"]
    if "_id" in response_user:
        del response_user["_id"]
        
    # Generate token
    token = create_access_token({"user_id": user_id, "role": role})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(**response_user)
    }

@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin):
    email = req.email.strip().lower()
    
    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
        
    # Clean user doc
    response_user = user.copy()
    if "password_hash" in response_user:
        del response_user["password_hash"]
    if "_id" in response_user:
        del response_user["_id"]
        
    # Generate token
    token = create_access_token({"user_id": user.get("user_id"), "role": user.get("role", "student")})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse(**response_user)
    }

@router.post("/logout")
def logout():
    return {"status": "success", "message": "Successfully logged out. Please discard token on the client."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)
