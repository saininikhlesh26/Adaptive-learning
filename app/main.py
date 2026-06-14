import os
import uvicorn
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
    allow_origins=["*"],  # Allow any origin to communicate in public/preview deployments
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
