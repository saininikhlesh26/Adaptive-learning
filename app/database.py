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
        # Handle list of tuples like [("timestamp", -1)]
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
                    if doc.get(k) != v:
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
            # Locate document by reference and update
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

class MockDatabase:
    def __init__(self):
        self.quizzes = MockCollection("quizzes")
        self.submissions = MockCollection("submissions")
        self.users = MockCollection("users")
        self._collections = {
            "quizzes": self.quizzes,
            "submissions": self.submissions,
            "users": self.users
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
    # Ping database to force link validation
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
    Checks if the quizzes collection is empty. If it is, seeds standard quizzes.
    Works for both real MongoDB collections and the in-memory MockDatabase.
    """
    # Seeding for Mock mode is handled here if empty
    # Seeding for live Mongo is handled here too
    quizzes_collection = db["quizzes"]
    
    if quizzes_collection.count_documents({}) > 0:
        print("Database already contains quizzes. Skipping seeding.")
        return
        
    print("Database quizzes collection is empty. Seeding default quizzes...")
    
    sample_quizzes = [
        {
            "quiz_id": "react_basics",
            "title": "React Basics",
            "difficulty": "Easy",
            "description": "Learn the foundational concepts of React, components, and rendering.",
            "questions": [
                {
                    "question": "What is the primary purpose of React?",
                    "options": ["Build server-side databases", "Build user interfaces with reusable components", "Manage backend network routing", "Style elements using static sheets"],
                    "correct": 1
                },
                {
                    "question": "What is the name of the syntax extension used in React?",
                    "options": ["HTML++", "JSX", "JavaScript XML", "JSON-CSS"],
                    "correct": 1
                },
                {
                    "question": "How are properties passed into React components?",
                    "options": ["Through local state", "Through props", "Through global context", "Through url search parameters"],
                    "correct": 1
                }
            ]
        },
        {
            "quiz_id": "react_hooks",
            "title": "React Hooks Deep Dive",
            "difficulty": "Medium",
            "description": "Master functional component state, side effects, and custom hooks.",
            "questions": [
                {
                    "question": "What does the useState hook do?",
                    "options": ["Fetches API data automatically", "Adds state variables to functional components", "Injects CSS rules into components", "Navigates between screens"],
                    "correct": 1
                },
                {
                    "question": "Which hook is used to handle side-effects like data fetching?",
                    "options": ["useReducer", "useCallback", "useEffect", "useMemo"],
                    "correct": 2
                },
                {
                    "question": "What must we supply as the second argument to useEffect to run it only once on mount?",
                    "options": ["A clean-up function", "An empty dependency array []", "A timeout delay in milliseconds", "The parent component element"],
                    "correct": 1
                },
                {
                    "question": "What is a major rule of React Hooks?",
                    "options": ["Call hooks inside loops or conditions", "Call hooks only at the top level of functional components", "Use hooks inside class component constructors", "Only declare hooks with let variables"],
                    "correct": 1
                }
            ]
        },
        {
            "quiz_id": "react_patterns",
            "title": "Advanced React Design Patterns",
            "difficulty": "Hard",
            "description": "Study compound components, render props, higher-order components, and performance optimizations.",
            "questions": [
                {
                    "question": "What design pattern allows sharing state and logic among children implicitly?",
                    "options": ["Higher-Order Components", "Compound Components Pattern", "Singleton Pattern", "Module Pattern"],
                    "correct": 1
                },
                {
                    "question": "Which hook helps optimize performance by memoizing computed values?",
                    "options": ["useRef", "useEffect", "useMemo", "useCallback"],
                    "correct": 2
                },
                {
                    "question": "In React 18 and 19, what does Suspense do?",
                    "options": ["Pauses page script execution", "Lets components show fallback UI until they finish loading", "Stops rendering if errors are caught", "Manages user scroll throttling"],
                    "correct": 1
                }
            ]
        },
        {
            "quiz_id": "state_management",
            "title": "State Management & Context API",
            "difficulty": "Medium",
            "description": "Manage global state, propagate theme data, and use state containers.",
            "questions": [
                {
                    "question": "What React feature allows passing state down without manual prop-drilling?",
                    "options": ["React Router", "Context API", "useReducer", "Ref forwarding"],
                    "correct": 1
                },
                {
                    "question": "Which hook is best suited as an alternative to useState for complex nested state transitions?",
                    "options": ["useContext", "useTransition", "useReducer", "useLayoutEffect"],
                    "correct": 2
                },
                {
                    "question": "What is a main concept of Redux state flow?",
                    "options": ["Mutating global state directly", "Unidirectional data flow with actions and reducers", "Using local component props for all state", "Bi-directional bindings on form inputs"],
                    "correct": 1
                }
            ]
        },
        {
            "quiz_id": "web_dev_intro",
            "title": "Introduction to Web Development",
            "difficulty": "Easy",
            "description": "Basics of the web, HTML tags, CSS styling, and basic JavaScript.",
            "questions": [
                {
                    "question": "Which HTML tag is used for the largest main heading on a page?",
                    "options": ["<h6>", "<head>", "<h1>", "<header>"],
                    "correct": 2
                },
                {
                    "question": "What does CSS stand for?",
                    "options": ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style Styling", "Complex Sheet Standards"],
                    "correct": 1
                },
                {
                    "question": "Which DOM method is used to select an element by its ID?",
                    "options": ["document.selectById()", "document.getElementById()", "document.querySelector('#id')", "Both B and C are correct"],
                    "correct": 3
                }
            ]
        },
        {
            "quiz_id": "fastapi_basics",
            "title": "Python FastAPI Fundamentals",
            "difficulty": "Medium",
            "description": "Introduction to Python FastAPI routers, request validation using Pydantic, and asyncio.",
            "questions": [
                {
                    "question": "What library does FastAPI use for data validation and parsing?",
                    "options": ["Flask", "Django", "Pydantic", "Marshmallow"],
                    "correct": 2
                },
                {
                    "question": "How do you start a FastAPI server named main.py with app = FastAPI()?",
                    "options": ["python main.py", "uvicorn main:app --reload", "fastapi run main", "gunicorn app:main --reload"],
                    "correct": 1
                },
                {
                    "question": "What HTTP method is standard for creating resource objects?",
                    "options": ["GET", "PUT", "POST", "DELETE"],
                    "correct": 2
                }
            ]
        }
    ]
    
    quizzes_collection.insert_many(sample_quizzes)
    print(f"Successfully seeded {len(sample_quizzes)} quizzes.")
