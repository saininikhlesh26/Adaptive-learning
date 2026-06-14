import os
import uvicorn
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.database import seed_database
from app.routers import quiz, stats, profile, subjects, competitions, auth, recommendations, admin, reports, timetable, tasks, goals

load_dotenv()

app = FastAPI(
    title="Adaptive Learning Interface API",
    description="Backend API for adaptive quiz management and engagement prediction.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app",
    allow_credentials=False,  # Bearer token auth in headers does not require cookies/credentials flags
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Auto-seed the database
    try:
        seed_database()
    except Exception as e:
        print(f"Error seeding database on startup: {e}")

@app.get("/api/health")
def health_check():
    db_status = "connected"
    is_mock = False
    try:
        from app.database import get_db, IS_MOCK
        database = get_db()
        if IS_MOCK:
            db_status = "mock_database_active"
            is_mock = True
        else:
            # Probe connection
            database.client.admin.command('ping')
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database_status": db_status,
        "is_mock": is_mock,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/api")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Adaptive Learning Interface API",
        "endpoints": {
            "quizzes": "/api/quizzes",
            "stats": "/api/dashboard/stats",
            "profile": "/api/profile",
            "subjects": "/api/subjects",
            "competitions": "/api/competitions"
        }
    }

# Include routers
app.include_router(auth.router)
app.include_router(quiz.router)
app.include_router(stats.router)
app.include_router(profile.router)
app.include_router(subjects.router)
app.include_router(competitions.router)
app.include_router(recommendations.router)
app.include_router(admin.router)
app.include_router(reports.router)
app.include_router(timetable.router)
app.include_router(tasks.router)
app.include_router(goals.router)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
