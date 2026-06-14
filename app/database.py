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
        inc_data = update_dict.get("$inc", {})
        push_data = update_dict.get("$push", {})
        
        pull_data = update_dict.get("$pull", {})
        
        doc = self.find_one(filter_dict)
        if doc:
            for i, d in enumerate(self.data):
                match = True
                for k, v in filter_dict.items():
                    if d.get(k) != v:
                        match = False
                        break
                if match:
                    # Apply $set
                    self.data[i].update(set_data)
                    # Apply $inc
                    for k, v in inc_data.items():
                        self.data[i][k] = self.data[i].get(k, 0) + v
                    # Apply $push
                    for k, v in push_data.items():
                        if k not in self.data[i]:
                            self.data[i][k] = []
                        if isinstance(self.data[i][k], list):
                            self.data[i][k].append(v)
                    # Apply $pull
                    for k, v in pull_data.items():
                        if k in self.data[i] and isinstance(self.data[i][k], list):
                            if v in self.data[i][k]:
                                self.data[i][k].remove(v)
                    break
        elif upsert:
            new_doc = filter_dict.copy()
            new_doc.update(set_data)
            for k, v in inc_data.items():
                new_doc[k] = v
            for k, v in push_data.items():
                new_doc[k] = [v]
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
    - 30+ Subjects in correct categories
    - 1,100+ Quiz Questions (55 quizzes across 11 subjects)
    - Default student (student@adaptive.com) and admin (admin@adaptive.com) users
    - Historical submissions
    - Default competitions
    """
    from app.utils.seed_generator import generate_quizzes_for_subject
    from app.utils.auth import hash_password

    # 1. Seed Subjects
    subjects_collection = db["subjects"]
    if subjects_collection.count_documents({}) == 0:
        print("Seeding subjects catalog...")
        subjects = [
            # Academic
            {"id": "math", "title": "Mathematics", "description": "Calculus, algebra, and geometry concepts.", "category": "Academic", "topics": ["Algebra Foundations", "Calculus & Limits", "Geometry Basics", "Trigonometry Elements", "Probability Theory"]},
            {"id": "physics", "title": "Physics", "description": "Mechanics, electromagnetism, and thermodynamics.", "category": "Academic", "topics": ["Mechanics", "Electromagnetism", "Thermodynamics"]},
            {"id": "chemistry", "title": "Chemistry", "description": "Organic, inorganic, and physical chemistry.", "category": "Academic", "topics": ["Organic", "Inorganic", "Physical"]},
            {"id": "biology", "title": "Biology", "description": "Cell biology, genetics, and ecology.", "category": "Academic", "topics": ["Cell Biology", "Genetics", "Ecology"]},
            {"id": "english", "title": "English", "description": "Grammar, sentence structures, and verbal reasoning.", "category": "Academic", "topics": ["Grammar & Verb Tenses", "Vocabulary & Synonyms", "Sentence Structure", "Reading Comprehension", "Idiomatic Expressions"]},
            {"id": "economics", "title": "Economics", "description": "Microeconomics and macroeconomics principles.", "category": "Academic", "topics": ["Microeconomics", "Macroeconomics"]},
            {"id": "statistics", "title": "Statistics", "description": "Probability distributions, regression, and testing.", "category": "Academic", "topics": ["Probability Distributions", "Regression Analysis"]},

            # Programming
            {"id": "prog_fundamentals", "title": "Programming Fundamentals", "description": "Variables, loops, and conditions basics.", "category": "Programming", "topics": ["Variables", "Loops", "Conditions"]},
            {"id": "c_prog", "title": "C Programming", "description": "Syntax, pointers, structure, and low-level control.", "category": "Programming", "topics": ["Variables & Data Types", "Control Statements", "Pointers & Memory", "Functions & Scope", "File Handling in C"]},
            {"id": "cpp", "title": "C++", "description": "OOP in C++, templates, and STL containers.", "category": "Programming", "topics": ["Object-Oriented Basics", "Classes & Constructors", "Inheritance & Polymorphism", "Templates & STL", "Memory Management"]},
            {"id": "java", "title": "Java", "description": "Java runtime, collections, threads, and objects.", "category": "Programming", "topics": ["JVM & Memory Management", "Java OOP Concepts", "Exception Handling", "Collections Framework", "Multithreading & Concurrency"]},
            {"id": "python", "title": "Python", "description": "List comprehensions, decorators, and libraries.", "category": "Programming", "topics": ["Syntax & Data Structures", "Functions & Generators", "Decorators & OOP", "Libraries (NumPy/Pandas)", "File I/O & Exceptions"]},
            {"id": "javascript", "title": "JavaScript", "description": "ES6+, promises, closures, and DOM events.", "category": "Programming", "topics": ["ES6+ Syntax", "Promises & Async", "Closures & Scope"]},

            # Placement Preparation
            {"id": "aptitude", "title": "Aptitude", "description": "Time, work, profit/loss, percentages, ratios.", "category": "Placement Preparation", "topics": ["Time & Distance", "Profit & Loss", "Permutations & Combinations", "Ratio & Proportion", "Averages & Percentages"]},
            {"id": "logical_reasoning", "title": "Logical Reasoning", "description": "Blood relations, puzzles, syllogisms, sequences.", "category": "Placement Preparation", "topics": ["Blood Relations", "Puzzles", "Syllogisms"]},
            {"id": "quantitative_ability", "title": "Quantitative Ability", "description": "Number systems, algebra, interest, geometry.", "category": "Placement Preparation", "topics": ["Number Systems", "Interest"]},
            {"id": "verbal_ability", "title": "Verbal Ability", "description": "Synonyms, error correction, reading passages.", "category": "Placement Preparation", "topics": ["Synonyms", "Error Correction"]},
            {"id": "gk", "title": "General Knowledge", "description": "History, science, geography, current affairs.", "category": "Placement Preparation", "topics": ["History", "Geography"]},

            # AI & ML
            {"id": "ml", "title": "Machine Learning", "description": "Regression, classification, clustering, neural nets.", "category": "AI & ML", "topics": ["Regression", "Classification"]},
            {"id": "ai", "title": "Artificial Intelligence", "description": "Search heuristics, games, logic, planning.", "category": "AI & ML", "topics": ["Search Heuristics", "Planning"]},

            # Web Development
            {"id": "web_dev", "title": "Web Development", "description": "HTML5, CSS3, responsive layouts.", "category": "Web Development", "topics": ["HTML5", "CSS3"]},
            {"id": "react", "title": "React", "description": "State, props, hooks, virtual DOM, routing.", "category": "Web Development", "topics": ["State & Props", "Hooks", "Virtual DOM"]},
            {"id": "node_js", "title": "Node.js", "description": "Event loop, express, modules, npm.", "category": "Web Development", "topics": ["Event Loop", "Express"]},

            # Data Science
            {"id": "data_science", "title": "Data Science", "description": "Analysis, visualization, data manipulation.", "category": "Data Science", "topics": ["Data Visualization", "Pandas Dataframes"]},
            {"id": "cloud_computing", "title": "Cloud Computing", "description": "AWS, GCP, azure, serverless patterns.", "category": "Data Science", "topics": ["AWS Basics", "Serverless"]},
            {"id": "cyber_security", "title": "Cyber Security", "description": "Cryptography, network defense, vulnerabilities.", "category": "Data Science", "topics": ["Cryptography", "Network Defense"]},
            {"id": "dbms", "title": "Database Management Systems", "description": "SQL, NoSQL, ACID, transactions, normal forms.", "category": "Data Science", "topics": ["Relational Model", "SQL Queries", "Normalization (1NF-BCNF)", "Transactions & ACID", "Indexing & Query Tuning"]},
            {"id": "os", "title": "Operating Systems", "description": "Processes, paging, CPU scheduling, deadlocks.", "category": "Data Science", "topics": ["Process Management", "Memory & Paging", "File Systems", "CPU Scheduling Algorithms", "Deadlock Prevention"]},
            {"id": "cn", "title": "Computer Networks", "description": "IP addressing, routing, protocols, DNS, OSI layers.", "category": "Data Science", "topics": ["OSI & TCP/IP Layers", "IP Addressing & Subnetting", "Routing Protocols", "Network Security", "Application Protocols"]},
            {"id": "data_structures", "title": "Data Structures", "description": "Arrays, linked lists, trees, graphs, sorting.", "category": "Data Science", "topics": ["Arrays & Linked Lists", "Stacks & Queues", "Trees & Binary Search Trees", "Graphs & Representations", "Hashing & Collisions"]},
            {"id": "algorithms", "title": "Algorithms", "description": "Divide & conquer, greedy, dynamic programming.", "category": "Data Science", "topics": ["Divide & Conquer", "Dynamic Programming"]},
            {"id": "software_eng", "title": "Software Engineering", "description": "SDLC, agile, testing, UML diagrams.", "category": "Data Science", "topics": ["SDLC", "Agile Methodology"]}
        ]
        subjects_collection.insert_many(subjects)
        print(f"Seeded {len(subjects)} subjects.")

    # 2. Seed Quizzes for the 11 key subjects (100 questions per subject, 5 quizzes each)
    quizzes_collection = db["quizzes"]
    if quizzes_collection.count_documents({}) == 0:
        print("Seeding massive quiz questions bank...")
        target_subjects = {
            "math": "Mathematics",
            "english": "English",
            "aptitude": "Aptitude",
            "c_prog": "C Programming",
            "cpp": "C++",
            "java": "Java",
            "python": "Python",
            "dbms": "DBMS",
            "os": "OS",
            "cn": "CN",
            "data_structures": "Data Structures"
        }
        total_quizzes_seeded = 0
        for sub_id, sub_title in target_subjects.items():
            quizzes_list = generate_quizzes_for_subject(sub_id, sub_title)
            quizzes_collection.insert_many(quizzes_list)
            total_quizzes_seeded += len(quizzes_list)
        print(f"Seeded {total_quizzes_seeded} quizzes with 1,100 questions in total.")

    # 3. Seed Default Users
    users_collection = db["users"]
    if users_collection.count_documents({"email": "student@adaptive.com"}) == 0:
        print("Seeding default student account...")
        student_pwd_hash = hash_password("Password123!")
        users_collection.insert_one({
            "user_id": "usr_student_adaptive_com",
            "email": "student@adaptive.com",
            "password_hash": student_pwd_hash,
            "first_name": "John",
            "last_name": "Doe",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
            "education_level": "Undergraduate",
            "learning_interests": ["math", "python", "data_structures"],
            "learning_goals": "Master core computational algorithms and data systems.",
            "joined_date": "January 2026",
            "role": "student",
            # Profile parameters
            "learning_style": "Visual Learner",
            "preferred_pace": "Moderate pace",
            "peak_time": "Evenings (6 PM - 9 PM)",
            "weekly_goal": 10,
            "subject_focus": "Computer Science",
            "enable_reminders": True
        })

    if users_collection.count_documents({"email": "admin@adaptive.com"}) == 0:
        print("Seeding default admin account...")
        admin_pwd_hash = hash_password("AdminPassword123!")
        users_collection.insert_one({
            "user_id": "usr_admin_adaptive_com",
            "email": "admin@adaptive.com",
            "password_hash": admin_pwd_hash,
            "first_name": "Admin",
            "last_name": "User",
            "avatar_url": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
            "education_level": "Professional",
            "learning_interests": ["python", "ml"],
            "learning_goals": "Manage quiz materials and system administration.",
            "joined_date": "January 2026",
            "role": "admin",
            # Profile parameters
            "learning_style": "Structured Learner",
            "preferred_pace": "Fast pace",
            "peak_time": "Mornings (9 AM - 12 PM)",
            "weekly_goal": 5,
            "subject_focus": "Administration",
            "enable_reminders": False
        })

    # Backward compatibility fallback student profile
    if users_collection.count_documents({"user_id": "default_student"}) == 0:
        print("Seeding legacy default student...")
        users_collection.insert_one({
            "user_id": "default_student",
            "email": "john.doe@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
            "learning_style": "Visual Learner",
            "preferred_pace": "Moderate pace",
            "peak_time": "Evenings (6 PM - 9 PM)",
            "weekly_goal": 10,
            "subject_focus": "Computer Science",
            "enable_reminders": True,
            "joined_date": "January 2026",
            "learning_interests": ["math", "comp_sci"],
            "role": "student"
        })

    # 4. Seed Submissions (Quiz Attempts) to Populate Stats
    submissions_collection = db["submissions"]
    if submissions_collection.count_documents({}) == 0:
        print("Seeding submissions/attempts...")
        now = datetime.datetime.now(datetime.timezone.utc)
        sample_submissions = [
            {
                "user_id": "usr_student_adaptive_com",
                "quiz_id": "math_q1",
                "quiz_title": "Mathematics: Algebra Foundations",
                "subject_id": "math",
                "score": 15,
                "total": 20,
                "score_ratio": 0.75,
                "percentage": 75.0,
                "engagement_level": "Focused",
                "confidence": 92.5,
                "is_fallback": True,
                "behavioral_metrics": {"time_spent": 120.0, "tab_switches": 0, "mouse_clicks": 25, "inactivity_duration": 5.0},
                "timestamp": (now - datetime.timedelta(days=4)).isoformat()
            },
            {
                "user_id": "usr_student_adaptive_com",
                "quiz_id": "python_q1",
                "quiz_title": "Python: Syntax & Data Structures",
                "subject_id": "python",
                "score": 18,
                "total": 20,
                "score_ratio": 0.9,
                "percentage": 90.0,
                "engagement_level": "Focused",
                "confidence": 88.0,
                "is_fallback": True,
                "behavioral_metrics": {"time_spent": 90.0, "tab_switches": 0, "mouse_clicks": 22, "inactivity_duration": 2.0},
                "timestamp": (now - datetime.timedelta(days=3)).isoformat()
            },
            {
                "user_id": "usr_student_adaptive_com",
                "quiz_id": "data_structures_q1",
                "quiz_title": "Data Structures: Arrays & Linked Lists",
                "subject_id": "data_structures",
                "score": 10,
                "total": 20,
                "score_ratio": 0.5,
                "percentage": 50.0,
                "engagement_level": "Struggling",
                "confidence": 76.5,
                "is_fallback": True,
                "behavioral_metrics": {"time_spent": 240.0, "tab_switches": 1, "mouse_clicks": 35, "inactivity_duration": 18.0},
                "timestamp": (now - datetime.timedelta(days=2)).isoformat()
            }
        ]
        submissions_collection.insert_many(sample_submissions)
        # Also copy to legacy student ID for backward compatibility
        for sub in sample_submissions:
            legacy_sub = sub.copy()
            legacy_sub["user_id"] = "default_student"
            if "_id" in legacy_sub:
                del legacy_sub["_id"]
            submissions_collection.insert_one(legacy_sub)

    # 5. Seed Competitions
    competitions_collection = db["competitions"]
    if competitions_collection.count_documents({}) == 0:
        print("Seeding competitions...")
        competitions_collection.insert_many([
            {"id": "comp_1", "title": "Daily React Challenge", "type": "Daily Challenge", "subject": "Web Development", "participant_count": 42, "active": True},
            {"id": "comp_2", "title": "Weekly Physics Cup", "type": "Weekly Challenge", "subject": "Physics", "participant_count": 128, "active": True},
            {"id": "comp_3", "title": "Mathematics League", "type": "Subject Challenge", "subject": "Mathematics", "participant_count": 85, "active": False}
        ])
        
    print("Database seeding completed.")
