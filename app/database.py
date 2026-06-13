import os
import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/adaptive_learning")
DATABASE_NAME = os.getenv("DATABASE_NAME", "adaptive_learning")

# --- In-Memory Mock Database Fallback (for Sandboxes / Demos) ---

class MockCursor:
    def __init__(self, data):
        self.data = data

    def sort(self, key, direction=1):
        reverse = True if direction == -1 else False
        sort_key = key
        if isinstance(key, list) and len(key) > 0:
            sort_key = key[0][0]
            reverse = True if key[0][1] == -1 else False
        
        self.data.sort(key=lambda x: x.get(sort_key, ""), reverse=reverse)
        return self

    def __iter__(self):
        return iter(self.data)

    def __len__(self):
        return len(self.data)

class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class MockCollection:
    def __init__(self, name, initial_data=None):
        self.name = name
        self.data = initial_data or []

    def find(self, filter_dict=None, projection=None):
        results = []
        for doc in self.data:
            match = True
            if filter_dict:
                for k, v in filter_dict.items():
                    # Support dictionary subset matching or direct comparison
                    if isinstance(v, dict) and "$in" in v:
                        if doc.get(k) not in v["$in"]:
                            match = False
                            break
                    elif doc.get(k) != v:
                        match = False
                        break
            if match:
                doc_copy = doc.copy()
                if projection:
                    for k, v in projection.items():
                        if v == 0 and k in doc_copy:
                            del doc_copy[k]
                results.append(doc_copy)
        return MockCursor(results)

    def find_one(self, filter_dict=None, projection=None):
        cursor = self.find(filter_dict, projection)
        return cursor.data[0] if cursor.data else None

    def insert_one(self, document):
        doc_copy = document.copy()
        if "_id" not in doc_copy:
            doc_copy["_id"] = len(self.data) + 1
        self.data.append(doc_copy)
        return InsertOneResult(doc_copy["_id"])

    def insert_many(self, documents):
        inserted_ids = []
        for doc in documents:
            res = self.insert_one(doc)
            inserted_ids.append(res.inserted_id)
        return inserted_ids

    def count_documents(self, filter_dict=None):
        cursor = self.find(filter_dict)
        return len(cursor.data)

    def update_one(self, filter_dict, update_dict, upsert=False):
        set_data = update_dict.get("$set", {})
        doc = self.find_one(filter_dict)
        if doc:
            for i, d in enumerate(self.data):
                match = True
                for k, v in filter_dict.items():
                    if d.get(k) != v:
                        match = False
                        break
                if match:
                    self.data[i].update(set_data)
                    break
        elif upsert:
            new_doc = filter_dict.copy()
            new_doc.update(set_data)
            self.insert_one(new_doc)

    def delete_one(self, filter_dict):
        for i, d in enumerate(self.data):
            match = True
            for k, v in filter_dict.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                self.data.pop(i)
                return True
        return False

class MockDatabase:
    def __init__(self):
        self.quizzes = MockCollection("quizzes")
        self.submissions = MockCollection("submissions")
        self.users = MockCollection("users")
        self.subjects = MockCollection("subjects")
        self.competitions = MockCollection("competitions")
        self._collections = {
            "quizzes": self.quizzes,
            "submissions": self.submissions,
            "users": self.users,
            "subjects": self.subjects,
            "competitions": self.competitions
        }

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = MockCollection(name)
        return self._collections[name]

# --- Database Initialization & Seeding Setup ---

db = None
IS_MOCK = False

try:
    print(f"Connecting to database: {DATABASE_NAME} using {MONGODB_URI.split('@')[-1]}")
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=1500)
    client.admin.command('ping')
    db = client[DATABASE_NAME]
    print("Database connection verified. Running in production/live mode.")
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    print("Falling back to local in-memory MockDatabase.")
    db = MockDatabase()
    IS_MOCK = True

def get_db():
    return db

def seed_database():
    """
    Checks collections and seeds:
    - Subjects (Math, Physics, Chemistry, Computer Science, English)
    - Quizzes associated with each subject
    - Default student user profile
    - A few historical quiz submissions to populate statistics
    """
    # 1. Seed Subjects
    subjects_collection = db["subjects"]
    if subjects_collection.count_documents({}) == 0:
        print("Seeding subjects...")
        subjects_collection.insert_many([
            {"id": "math", "title": "Mathematics", "description": "Calculus, algebra, and geometry concepts."},
            {"id": "physics", "title": "Physics", "description": "Mechanics, electromagnetism, and thermodynamics."},
            {"id": "chemistry", "title": "Chemistry", "description": "Organic, inorganic, and physical chemistry basics."},
            {"id": "comp_sci", "title": "Computer Science", "description": "Data structures, algorithms, and web programming."},
            {"id": "english", "title": "English", "description": "Grammar rules, sentence structures, and analysis."}
        ])

    # 2. Seed Quizzes
    quizzes_collection = db["quizzes"]
    if quizzes_collection.count_documents({}) == 0:
        print("Seeding quizzes...")
        sample_quizzes = [
            # Computer Science Quizzes
            {
                "quiz_id": "react_basics",
                "title": "React Basics",
                "difficulty": "Easy",
                "subject_id": "comp_sci",
                "description": "Learn the foundational concepts of React, components, and rendering.",
                "questions": [
                    {
                        "question": "What is the primary purpose of React?",
                        "options": ["Build server-side databases", "Build user interfaces with reusable components", "Manage backend routing", "Style elements using static sheets"],
                        "correct": 1,
                        "hint": "React is a library created by Facebook for frontend building.",
                        "explanation": "React focuses strictly on UI component rendering."
                    },
                    {
                        "question": "What is JSX?",
                        "options": ["HTML++", "JSX", "JavaScript XML", "JSON-CSS"],
                        "correct": 1,
                        "hint": "It looks like HTML but is written inside JavaScript.",
                        "explanation": "JSX allows writing HTML-like code inside JavaScript."
                    },
                    {
                        "question": "How are properties passed into React components?",
                        "options": ["Through local state", "Through props", "Through global context", "Through url search parameters"],
                        "correct": 1,
                        "hint": "Short for properties.",
                        "explanation": "Props (properties) pass read-only parameters down to child components."
                    }
                ]
            },
            {
                "quiz_id": "react_hooks",
                "title": "React Hooks Deep Dive",
                "difficulty": "Medium",
                "subject_id": "comp_sci",
                "description": "Master functional component state, side effects, and custom hooks.",
                "questions": [
                    {
                        "question": "What does the useState hook do?",
                        "options": ["Fetches API data automatically", "Adds state variables to functional components", "Injects CSS rules into components", "Navigates between screens"],
                        "correct": 1,
                        "hint": "Used to track local variables that trigger re-renders.",
                        "explanation": "useState creates a local getter and setter pair inside functional components."
                    },
                    {
                        "question": "Which hook is used to handle side-effects like data fetching?",
                        "options": ["useReducer", "useCallback", "useEffect", "useMemo"],
                        "correct": 2,
                        "hint": "Runs after render phase is finished.",
                        "explanation": "useEffect runs side-effects like APIs, event listeners, and timers."
                    }
                ]
            },
            # Math Quizzes
            {
                "quiz_id": "algebra_basics",
                "title": "Basic Algebra & Equations",
                "difficulty": "Easy",
                "subject_id": "math",
                "description": "Linear equations, simplifying expressions, and standard variables.",
                "questions": [
                    {
                        "question": "Solve for x: 3x + 5 = 17",
                        "options": ["x = 2", "x = 4", "x = 6", "x = 8"],
                        "correct": 1,
                        "hint": "Subtract 5 from both sides, then divide by 3.",
                        "explanation": "3x = 12, so x = 12 / 3 = 4."
                    }
                ]
            },
            {
                "quiz_id": "calculus_intro",
                "title": "Introduction to Derivatives",
                "difficulty": "Hard",
                "subject_id": "math",
                "description": "Limits, derivatives rules, and rates of change.",
                "questions": [
                    {
                        "question": "What is the derivative of x^2 + 3x with respect to x?",
                        "options": ["2x", "2x + 3", "x + 3", "2x^2 + 3"],
                        "correct": 1,
                        "hint": "Use the power rule: d/dx(x^n) = n*x^(n-1).",
                        "explanation": "d/dx(x^2) = 2x, and d/dx(3x) = 3. Summing them yields 2x + 3."
                    }
                ]
            },
            # Physics Quizzes
            {
                "quiz_id": "mechanics_force",
                "title": "Newtonian Force Laws",
                "difficulty": "Medium",
                "subject_id": "physics",
                "description": "Mass, acceleration, gravity, and momentum.",
                "questions": [
                    {
                        "question": "What is Newton's Second Law of Motion?",
                        "options": ["F = m/a", "F = m*a", "F = m*v", "F = m*a^2"],
                        "correct": 1,
                        "hint": "Force equals mass times acceleration.",
                        "explanation": "Newton's second law is F = ma (Force = Mass * Acceleration)."
                    }
                ]
            },
            # Chemistry Quizzes
            {
                "quiz_id": "periodic_table",
                "title": "Periodic Table Elements",
                "difficulty": "Easy",
                "subject_id": "chemistry",
                "description": "Atomic numbers, hydrogen, and noble gases.",
                "questions": [
                    {
                        "question": "What is the chemical symbol for Gold?",
                        "options": ["Go", "Gd", "Au", "Ag"],
                        "correct": 2,
                        "hint": "Comes from the Latin word Aurum.",
                        "explanation": "Au represents gold on the periodic table."
                    }
                ]
            },
            # English Quizzes
            {
                "quiz_id": "grammar_tense",
                "title": "English Verb Tenses",
                "difficulty": "Easy",
                "subject_id": "english",
                "description": "Present perfect, past simple, and future conditional.",
                "questions": [
                    {
                        "question": "Choose the correct sentence form:",
                        "options": ["She has went to school.", "She went to school yesterday.", "She has go to school.", "She gone to school."],
                        "correct": 1,
                        "hint": "Simple past does not require has.",
                        "explanation": "'She went to school yesterday' is correct past simple tense."
                    }
                ]
            }
        ]
        quizzes_collection.insert_many(sample_quizzes)

    # 3. Seed Submissions (Quiz Attempts) to Populate Stats
    submissions_collection = db["submissions"]
    if submissions_collection.count_documents({}) == 0:
        print("Seeding submissions/attempts...")
        # Seed 4 historical quiz submissions
        now = datetime.datetime.now(datetime.timezone.utc)
        sample_submissions = [
            {
                "user_id": "default_student",
                "quiz_id": "react_basics",
                "quiz_title": "React Basics",
                "score": 3,
                "total": 3,
                "score_ratio": 1.0,
                "percentage": 100.0,
                "engagement_level": "Focused",
                "confidence": 92.5,
                "is_fallback": True,
                "behavioral_metrics": {"time_spent": 85.0, "tab_switches": 0, "mouse_clicks": 18, "inactivity_duration": 4.0},
                "timestamp": (now - datetime.timedelta(days=4)).isoformat()
            },
            {
                "user_id": "default_student",
                "quiz_id": "algebra_basics",
                "quiz_title": "Basic Algebra",
                "score": 1,
                "total": 1,
                "score_ratio": 1.0,
                "percentage": 100.0,
                "engagement_level": "Focused",
                "confidence": 88.0,
                "is_fallback": True,
                "behavioral_metrics": {"time_spent": 50.0, "tab_switches": 0, "mouse_clicks": 10, "inactivity_duration": 2.0},
                "timestamp": (now - datetime.timedelta(days=3)).isoformat()
            },
            {
                "user_id": "default_student",
                "quiz_id": "mechanics_force",
                "quiz_title": "Newtonian Force Laws",
                "score": 0,
                "total": 1,
                "score_ratio": 0.0,
                "percentage": 0.0,
                "engagement_level": "Struggling",
                "confidence": 76.5,
                "is_fallback": True,
                "behavioral_metrics": {"time_spent": 240.0, "tab_switches": 1, "mouse_clicks": 45, "inactivity_duration": 18.0},
                "timestamp": (now - datetime.timedelta(days=2)).isoformat()
            },
            {
                "user_id": "default_student",
                "quiz_id": "react_hooks",
                "quiz_title": "React Hooks Deep Dive",
                "score": 1,
                "total": 2,
                "score_ratio": 0.5,
                "percentage": 50.0,
                "engagement_level": "Bored",
                "confidence": 70.0,
                "is_fallback": True,
                "behavioral_metrics": {"time_spent": 40.0, "tab_switches": 5, "mouse_clicks": 8, "inactivity_duration": 25.0},
                "timestamp": (now - datetime.timedelta(days=1)).isoformat()
            }
        ]
        submissions_collection.insert_many(sample_submissions)

    # 4. Seed User Profile
    users_collection = db["users"]
    if users_collection.count_documents({"user_id": "default_student"}) == 0:
        print("Seeding profile...")
        users_collection.insert_one({
            "user_id": "default_student",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
            "learning_style": "Visual Learner with strong problem-solving abilities",
            "preferred_pace": "Moderate pace with occasional deep dives",
            "peak_time": "Evenings (6 PM - 9 PM)",
            "weekly_goal": 10,
            "subject_focus": "Computer Science",
            "enable_reminders": True,
            "joined_date": "January 2026"
        })
    
    # 5. Seed Competitions
    competitions_collection = db["competitions"]
    if competitions_collection.count_documents({}) == 0:
        print("Seeding competitions...")
        competitions_collection.insert_many([
            {"id": "comp_1", "title": "Daily React Challenge", "type": "Daily Challenge", "subject": "Computer Science", "participant_count": 42, "active": True},
            {"id": "comp_2", "title": "Weekly Physics Cup", "type": "Weekly Challenge", "subject": "Physics", "participant_count": 128, "active": True},
            {"id": "comp_3", "title": "Mathematics League", "type": "Subject Challenge", "subject": "Mathematics", "participant_count": 85, "active": False}
        ])
        
    print("Database seeding completed.")
