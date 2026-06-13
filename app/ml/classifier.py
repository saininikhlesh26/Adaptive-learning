import os
import pickle

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

class EngagementClassifier:
    def __init__(self, model_path="models/engagement_model.pkl"):
        self.model_path = model_path
        self.model = None
        if HAS_NUMPY:
            self.load_model()
        else:
            print("Numpy not found. ML model loading disabled, falling back to rule-based classification.")
        
    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, 'rb') as f:
                    self.model = pickle.load(f)
                print(f"Successfully loaded ML model from {self.model_path}")
            except Exception as e:
                print(f"Error loading ML model from {self.model_path}: {e}. Falling back to rule-based classification.")
        else:
            print(f"ML model file not found at {self.model_path}. Falling back to rule-based classification.")

    def predict(self, score_ratio: float, completion_time: float, tab_switches: int, mouse_clicks: int, inactivity_duration: float):
        """
        Predicts student engagement level.
        Returns:
            dict containing:
                - engagement_level: "Focused" | "Struggling" | "Bored"
                - confidence: float
                - is_fallback: bool
        """
        if HAS_NUMPY and self.model is not None:
            try:
                features = np.array([[score_ratio, completion_time, tab_switches, mouse_clicks, inactivity_duration]])
                probs = self.model.predict_proba(features)[0]
                pred_class = np.argmax(probs)
                confidence = float(probs[pred_class])
                
                labels = {0: "Focused", 1: "Struggling", 2: "Bored"}
                return {
                    "engagement_level": labels[pred_class],
                    "confidence": confidence,
                    "is_fallback": False
                }
            except Exception as e:
                print(f"Prediction failed with model: {e}. Falling back to rules.")

        # Fallback Rule-Based Classifier
        if tab_switches >= 3 or inactivity_duration >= 20:
            level = "Bored"
            confidence = 0.85 if tab_switches >= 5 else 0.70
        elif completion_time > 180 and score_ratio < 0.6:
            level = "Struggling"
            confidence = 0.80
        else:
            level = "Focused"
            confidence = 0.75
            
        return {
            "engagement_level": level,
            "confidence": confidence,
            "is_fallback": True
        }
