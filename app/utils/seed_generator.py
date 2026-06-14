import random

def generate_quizzes_for_subject(subject_id: str, subject_title: str) -> list:
    """
    Generates 5 quizzes of 20 questions each (total 100 questions) for a subject.
    Contains mix of MCQ, True/False, and Multi-select questions.
    Difficulties: Beginner, Intermediate, Advanced.
    """
    quizzes = []
    
    # Define topics based on subject
    topics_map = {
        "math": ["Algebra Foundations", "Calculus & Limits", "Geometry Basics", "Trigonometry Elements", "Probability Theory"],
        "english": ["Grammar & Verb Tenses", "Vocabulary & Synonyms", "Sentence Structure", "Reading Comprehension", "Idiomatic Expressions"],
        "aptitude": ["Time & Distance", "Profit & Loss", "Permutations & Combinations", "Ratio & Proportion", "Averages & Percentages"],
        "c_prog": ["Variables & Data Types", "Control Statements", "Pointers & Memory", "Functions & Scope", "File Handling in C"],
        "cpp": ["Object-Oriented Basics", "Classes & Constructors", "Inheritance & Polymorphism", "Templates & STL", "Memory Management"],
        "java": ["JVM & Memory Management", "Java OOP Concepts", "Exception Handling", "Collections Framework", "Multithreading & Concurrency"],
        "python": ["Syntax & Data Structures", "Functions & Generators", "Decorators & OOP", "Libraries (NumPy/Pandas)", "File I/O & Exceptions"],
        "dbms": ["Relational Model", "SQL Queries", "Normalization (1NF-BCNF)", "Transactions & ACID", "Indexing & Query Tuning"],
        "os": ["Process Management", "Memory & Paging", "File Systems", "CPU Scheduling Algorithms", "Deadlock Prevention"],
        "cn": ["OSI & TCP/IP Layers", "IP Addressing & Subnetting", "Routing Protocols", "Network Security", "Application Protocols"],
        "data_structures": ["Arrays & Linked Lists", "Stacks & Queues", "Trees & Binary Search Trees", "Graphs & Representations", "Hashing & Collisions"]
    }
    
    topics = topics_map.get(subject_id, ["General Concepts", "Core Fundamentals", "Applied Topics", "Advanced Theories", "Comprehensive Challenge"])
    
    # Generate 5 quizzes
    for quiz_idx in range(1, 6):
        topic = topics[quiz_idx - 1]
        difficulty = "Beginner" if quiz_idx <= 2 else ("Intermediate" if quiz_idx <= 4 else "Advanced")
        
        quiz_id = f"{subject_id}_q{quiz_idx}"
        title = f"{subject_title}: {topic}"
        description = f"Evaluate your understanding of {topic} at a {difficulty} level."
        
        questions = []
        for q_idx in range(1, 21):
            q_num = (quiz_idx - 1) * 20 + q_idx
            
            # Determine question type
            if q_idx <= 14:
                q_type = "MCQ"
            elif q_idx <= 18:
                q_type = "True/False"
            else:
                q_type = "Multi-select"
                
            question_data = create_question(subject_id, topic, difficulty, q_type, q_num)
            questions.append(question_data)
            
        quizzes.append({
            "quiz_id": quiz_id,
            "title": title,
            "difficulty": difficulty,
            "subject_id": subject_id,
            "topic": topic,
            "description": description,
            "questions": questions
        })
        
    return quizzes

def create_question(subject_id: str, topic: str, difficulty: str, q_type: str, q_num: int) -> dict:
    """
    Creates a specific question based on subject, topic, and type.
    """
    # Fallback default
    q_text = f"Evaluate concept number {q_num} in {topic}."
    options = ["Option A", "Option B", "Option C", "Option D"]
    correct = 0
    hint = "Select the first option."
    explanation = "Option A is the correct answer based on foundational definitions."
    
    # 1. MATHEMATICS
    if subject_id == "math":
        if q_type == "MCQ":
            val1 = q_num * 4 + 7
            val2 = q_num * 2 + 3
            ans = val1 + val2
            q_text = f"Solve for x: x - {val1} = {val2}. What is the value of x?"
            options = [str(ans), str(ans - 4), str(ans + 10), str(ans * 2)]
            correct = 0
            hint = f"Isolate x by adding {val1} to both sides of the equation."
            explanation = f"x = {val2} + {val1} = {ans}."
        elif q_type == "True/False":
            is_true = (q_num % 2 == 0)
            if is_true:
                q_text = f"Is the derivative of e^{q_num}x equal to {q_num}e^{q_num}x?"
                options = ["True", "False"]
                correct = 0
                hint = "Use the chain rule: d/dx(e^(ax)) = a * e^(ax)."
                explanation = f"Yes. Applying the chain rule to e^{q_num}x yields {q_num}e^{q_num}x."
            else:
                q_text = f"Does the limit of 1/x as x approaches infinity equal 1?"
                options = ["True", "False"]
                correct = 1
                hint = "Consider what happens to the fraction as the denominator becomes infinitely large."
                explanation = "As x approaches infinity, 1/x approaches 0, not 1."
        else:
            q_text = "Which of the following numbers are prime factors of 60?"
            options = ["2", "3", "5", "7"]
            correct = [0, 1, 2]
            hint = "Check which options divide 60 and are also prime numbers."
            explanation = "60 = 2^2 * 3 * 5. Therefore, 2, 3, and 5 are its prime factors. 7 does not divide 60."

    # 2. ENGLISH
    elif subject_id == "english":
        if q_type == "MCQ":
            words = ["ambiguous", "lucid", "redundant", "aesthetic", "ephemeral"]
            word = words[q_num % len(words)]
            synonyms = {
                "ambiguous": ("unclear", "plain", "certain", "loud"),
                "lucid": ("clear", "foggy", "dark", "heavy"),
                "redundant": ("superfluous", "essential", "scarce", "singular"),
                "aesthetic": ("beautiful", "plain", "functional", "ugly"),
                "ephemeral": ("short-lived", "lasting", "heavy", "eternal")
            }
            opts = synonyms[word]
            q_text = f"What is the most accurate synonym for the word '{word}'?"
            options = list(opts)
            correct = 0
            hint = f"Think about how '{word}' is used to describe clarity, style, or duration."
            explanation = f"'{opts[0]}' matches the dictionary definition of '{word}'."
        elif q_type == "True/False":
            q_text = "Is the sentence 'She has went to school yesterday' grammatically correct?"
            options = ["True", "False"]
            correct = 1
            hint = "Review the past participle form of the verb 'go'."
            explanation = "The correct form is 'She went to school yesterday' (simple past) or 'She has gone' (present perfect)."
        else:
            q_text = "Select all of the coordinating conjunctions from the options below:"
            options = ["And", "But", "Because", "Or"]
            correct = [0, 1, 3]
            hint = "Remember the FANBOYS acronym (For, And, Nor, But, Or, Yet, So)."
            explanation = "'And', 'But', and 'Or' are coordinating conjunctions. 'Because' is a subordinating conjunction."

    # 3. APTITUDE
    elif subject_id == "aptitude":
        if q_type == "MCQ":
            speed = 40 + (q_num * 5) % 80
            dist = speed * 2
            q_text = f"A car travels at a constant speed of {speed} km/h. How many hours will it take to cover a distance of {dist} km?"
            options = ["2 hours", "3 hours", "1.5 hours", "4 hours"]
            correct = 0
            hint = "Formula: Time = Distance / Speed."
            explanation = f"Time = {dist} km / {speed} km/h = 2 hours."
        elif q_type == "True/False":
            q_text = f"If the cost price of an item is $100 and it is sold for $120, is the profit margin 20%?"
            options = ["True", "False"]
            correct = 0
            hint = "Profit percentage = (Profit / Cost Price) * 100."
            explanation = "Profit = $120 - $100 = $20. Percentage = (20/100)*100 = 20%."
        else:
            q_text = "A box contains 3 red balls and 2 blue balls. Which of the following statements about probability are correct?"
            options = [
                "Probability of picking a red ball is 3/5",
                "Probability of picking a blue ball is 2/5",
                "Probability of picking a yellow ball is 0",
                "Probability of picking any ball is 1/2"
            ]
            correct = [0, 1, 2]
            hint = "Calculate probability as (favorable outcomes) / (total outcomes)."
            explanation = "Total balls = 5. Red is 3/5, Blue is 2/5, Yellow is 0/5. The sum of all probabilities is 1."

    # 4. C PROGRAMMING
    elif subject_id == "c_prog":
        if q_type == "MCQ":
            q_text = "What is the size of a standard integer (int) datatype in a 32-bit C compiler?"
            options = ["4 bytes", "2 bytes", "8 bytes", "1 byte"]
            correct = 0
            hint = "Most modern 32-bit and 64-bit systems assign 4 bytes to an integer."
            explanation = "A standard integer occupies 4 bytes (32 bits) in memory in standard C compiling."
        elif q_type == "True/False":
            q_text = "In C, do local variables inside a function default to static storage class?"
            options = ["True", "False"]
            correct = 1
            hint = "Think about whether local variables retain their values between function calls by default."
            explanation = "Local variables default to auto storage class. They are destroyed when function scope ends."
        else:
            q_text = "Which of the following are valid variable name declarations in C?"
            options = ["_student_id", "totalAmount", "2nd_number", "main"]
            correct = [0, 1, 3]
            hint = "Variable names cannot begin with numbers, but can start with underscores, letters, and contain letters."
            explanation = "'_student_id', 'totalAmount', and 'main' are valid. '2nd_number' is invalid because it starts with a digit."

    # 5. C++
    elif subject_id == "cpp":
        if q_type == "MCQ":
            q_text = "Which keyword in C++ is used to prevent a class from being inherited?"
            options = ["final", "sealed", "const", "virtual"]
            correct = 0
            hint = "C++11 introduced this keyword, which is also used in Java for constant declarations."
            explanation = "The 'final' specifier prevents a class from being derived or a virtual function from being overridden."
        elif q_type == "True/False":
            q_text = "Does C++ support multiple inheritance directly?"
            options = ["True", "False"]
            correct = 0
            hint = "Can a C++ class inherit from more than one base class at the same time?"
            explanation = "Yes, C++ allows a class to inherit from multiple parent classes directly, unlike Java."
        else:
            q_text = "Which of the following are standard components of the C++ Standard Template Library (STL)?"
            options = ["Containers", "Algorithms", "Iterators", "Garbage Collector"]
            correct = [0, 1, 2]
            hint = "STL focuses on data structures and algorithms without automatic heap cleanups."
            explanation = "Containers, Algorithms, and Iterators make up the core of STL. C++ does not have a native garbage collector."

    # 6. JAVA
    elif subject_id == "java":
        if q_type == "MCQ":
            q_text = "Which memory area in JVM is used to allocate memory for objects at runtime?"
            options = ["Heap Memory", "Stack Memory", "Method Area", "Program Counter"]
            correct = 0
            hint = "All class instances and arrays are allocated here. It is cleaned by GC."
            explanation = "All Java objects are allocated in the Heap Memory. Reference variables are stored in the Stack."
        elif q_type == "True/False":
            q_text = "Is a Java string object mutable after creation?"
            options = ["True", "False"]
            correct = 1
            hint = "When you alter a string, does Java edit the existing object or create a new one in the pool?"
            explanation = "Java Strings are immutable. Any modification creates a new String object."
        else:
            q_text = "Which of the following classes implement the java.util.List interface?"
            options = ["ArrayList", "LinkedList", "Vector", "HashSet"]
            correct = [0, 1, 2]
            hint = "Lists maintain insertion order. Sets do not allow duplicates."
            explanation = "ArrayList, LinkedList, and Vector implement List. HashSet implements the Set interface."

    # 7. PYTHON
    elif subject_id == "python":
        if q_type == "MCQ":
            q_text = f"What is the output of the Python expression: [x for x in [1, 2, 3] if x > {q_num % 3}]?"
            threshold = q_num % 3
            if threshold == 0:
                options = ["[1, 2, 3]", "[2, 3]", "[3]", "[]"]
                correct = 0
            elif threshold == 1:
                options = ["[2, 3]", "[1, 2, 3]", "[3]", "[]"]
                correct = 0
            else:
                options = ["[3]", "[2, 3]", "[1, 2, 3]", "[]"]
                correct = 0
            hint = "List comprehension filters list elements based on the condition."
            explanation = f"Only elements greater than {threshold} are kept."
        elif q_type == "True/False":
            q_text = "Are lists in Python hashable and usable as dictionary keys?"
            options = ["True", "False"]
            correct = 1
            hint = "Dictionary keys must be immutable (hashable). Are lists mutable?"
            explanation = "Lists are mutable and therefore unhashable. Only immutable objects (like tuples) can be dictionary keys."
        else:
            q_text = "Which of the following are built-in mutable data types in Python?"
            options = ["List", "Dictionary", "Set", "Tuple"]
            correct = [0, 1, 2]
            hint = "Select the types whose elements can be changed in-place without creating a new object."
            explanation = "Lists, Dicts, and Sets are mutable. Tuples are immutable."

    # 8. DBMS
    elif subject_id == "dbms":
        if q_type == "MCQ":
            q_text = "Which normal form guarantees the elimination of all transitive dependencies?"
            options = ["Third Normal Form (3NF)", "Second Normal Form (2NF)", "Boyce-Codd Normal Form (BCNF)", "First Normal Form (1NF)"]
            correct = 0
            hint = "Requires the relation to be in 2NF and non-prime attributes to be non-transitively dependent on primary key."
            explanation = "3NF eliminates transitive dependencies. 2NF eliminates partial dependencies."
        elif q_type == "True/False":
            q_text = "Do primary keys allow NULL values in a relational database?"
            options = ["True", "False"]
            correct = 1
            hint = "A primary key must uniquely identify each row. Can it be null?"
            explanation = "Primary keys must contain unique values and cannot contain NULL values."
        else:
            q_text = "Which of the following are properties of ACID transactions in databases?"
            options = ["Atomicity", "Consistency", "Isolation", "Durability"]
            correct = [0, 1, 2, 3]
            hint = "All four letters in ACID represent a transaction property."
            explanation = "ACID stands for Atomicity, Consistency, Isolation, and Durability."

    # 9. OS
    elif subject_id == "os":
        if q_type == "MCQ":
            q_text = "Which CPU scheduling algorithm can suffer from the 'convoy effect'?"
            options = ["First-Come First-Served (FCFS)", "Round Robin", "Shortest Job First (SJF)", "Priority Scheduling"]
            correct = 0
            hint = "It's the simplest scheduling algorithm where processes are executed in request order."
            explanation = "FCFS can cause a convoy effect where short processes wait behind a long CPU-bound process."
        elif q_type == "True/False":
            q_text = "Is virtual memory memory mapping handled entirely by hardware without operating system involvement?"
            options = ["True", "False"]
            correct = 1
            hint = "Think about page fault handling. Who loads pages from disk?"
            explanation = "The OS handles page faults, page tables allocation, and swapping, working alongside hardware (MMU)."
        else:
            q_text = "Which of the following conditions must hold simultaneously for a deadlock to occur?"
            options = ["Mutual Exclusion", "Hold and Wait", "No Preemption", "Circular Wait"]
            correct = [0, 1, 2, 3]
            hint = "These are known as the Coffman conditions."
            explanation = "All four conditions (Mutual Exclusion, Hold & Wait, No Preemption, and Circular Wait) must be present for a deadlock."

    # 10. CN
    elif subject_id == "cn":
        if q_type == "MCQ":
            q_text = "Which OSI layer is responsible for routing, IP addressing, and packet forwarding?"
            options = ["Network Layer", "Transport Layer", "Data Link Layer", "Physical Layer"]
            correct = 0
            hint = "Think about where routers operate."
            explanation = "The Network Layer handles packet routing, logical IP addressing, and forwarding."
        elif q_type == "True/False":
            q_text = "Does TCP (Transmission Control Protocol) offer connectionless, unreliable transmission?"
            options = ["True", "False"]
            correct = 1
            hint = "Think about whether TCP guarantees packet delivery or uses handshakes."
            explanation = "TCP is connection-oriented and reliable. UDP is connectionless and unreliable."
        else:
            q_text = "Which of the following are protocols belonging to the Application Layer of the TCP/IP stack?"
            options = ["HTTP", "DNS", "FTP", "TCP"]
            correct = [0, 1, 2]
            hint = "Select protocols that user-facing software communicates with directly."
            explanation = "HTTP, DNS, and FTP are Application Layer protocols. TCP operates at the Transport Layer."

    # 11. DATA STRUCTURES
    elif subject_id == "data_structures":
        if q_type == "MCQ":
            q_text = "What is the worst-case time complexity of searching for an element in a binary search tree (BST)?"
            options = ["O(n)", "O(log n)", "O(1)", "O(n log n)"]
            correct = 0
            hint = "Consider a skewed tree where elements are added in increasing order."
            explanation = "In the worst case (skewed tree), a BST behaves like a linked list, requiring O(n) search time."
        elif q_type == "True/False":
            q_text = "Is a stack a First-In, First-Out (FIFO) data structure?"
            options = ["True", "False"]
            correct = 1
            hint = "Think about pile of plates. Do you take the bottom plate first or top plate?"
            explanation = "A stack is Last-In, First-Out (LIFO). A queue is First-In, First-Out (FIFO)."
        else:
            q_text = "Which of the following data structures are non-linear?"
            options = ["Tree", "Graph", "Stack", "Queue"]
            correct = [0, 1]
            hint = "Linear structures arrange elements sequentially. Non-linear structures represent hierarchical or networked data."
            explanation = "Trees and Graphs are non-linear. Stacks and Queues are linear."

    return {
        "question": q_text,
        "options": options,
        "correct": correct,
        "type": q_type,
        "hint": hint,
        "explanation": explanation
    }
