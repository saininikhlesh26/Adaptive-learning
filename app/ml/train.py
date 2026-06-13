import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

def generate_synthetic_data(num_samples=500):
    np.random.seed(42)
    
    # 1. Focused (Label: 0)
    focused_score = np.random.uniform(0.7, 1.0, num_samples)
    focused_time = np.random.uniform(60, 180, num_samples)
    focused_tabs = np.random.poisson(0.3, num_samples)  # mostly 0, some 1
    focused_clicks = np.random.uniform(15, 40, num_samples)
    focused_inactivity = np.random.uniform(0, 10, num_samples)
    focused_labels = np.zeros(num_samples, dtype=int)
    
    # 2. Struggling (Label: 1)
    struggling_score = np.random.uniform(0.1, 0.6, num_samples)
    struggling_time = np.random.uniform(180, 400, num_samples)
    struggling_tabs = np.random.poisson(0.5, num_samples)  # mostly 0-1
    struggling_clicks = np.random.uniform(30, 70, num_samples)
    struggling_inactivity = np.random.uniform(5, 30, num_samples)
    struggling_labels = np.ones(num_samples, dtype=int)
    
    # 3. Bored (Label: 2)
    bored_score = np.random.uniform(0.2, 0.7, num_samples)
    bored_time = np.random.uniform(30, 90, num_samples)
    bored_tabs = np.random.randint(3, 15, num_samples)  # frequent tab switches
    bored_clicks = np.random.uniform(5, 20, num_samples)
    bored_inactivity = np.random.uniform(20, 150, num_samples)
    bored_labels = np.full(num_samples, 2, dtype=int)
    
    # Combine data
    features = np.vstack([
        np.column_stack([focused_score, focused_time, focused_tabs, focused_clicks, focused_inactivity]),
        np.column_stack([struggling_score, struggling_time, struggling_tabs, struggling_clicks, struggling_inactivity]),
        np.column_stack([bored_score, bored_time, bored_tabs, bored_clicks, bored_inactivity])
    ])
    
    labels = np.concatenate([focused_labels, struggling_labels, bored_labels])
    
    df = pd.DataFrame(features, columns=['score_ratio', 'completion_time', 'tab_switches', 'mouse_clicks', 'inactivity_duration'])
    df['label'] = labels
    return df

def train_model():
    print("Generating synthetic student engagement data...")
    df = generate_synthetic_data(600)
    
    X = df.drop(columns=['label'])
    y = df['label']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training RandomForestClassifier...")
    clf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Focused', 'Struggling', 'Bored']))
    
    # Ensure target directory exists
    os.makedirs('models', exist_ok=True)
    model_path = os.path.join('models', 'engagement_model.pkl')
    
    print(f"Saving model to {model_path}...")
    with open(model_path, 'wb') as f:
        pickle.dump(clf, f)
    print("Model training completed successfully.")

if __name__ == "__main__":
    train_model()
