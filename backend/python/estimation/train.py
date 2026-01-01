import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pickle
import pandas as pd
import os
from sklearn.preprocessing import StandardScaler
from model import RecoveryNet

def generate_synthetic_data(n_samples=10000):
    print(f"Generating {n_samples} synthetic samples...")
    X = []
    y = []

    for _ in range(n_samples):
        # Feature 1: Balance (0 to 20000)
        balance = np.random.exponential(scale=3000) 
        
        # Feature 2: Days Past Due (0 to 180)
        dpd = np.random.randint(0, 180)

        # Logic for Label (Simulating the heuristic)
        # Higher balance -> Lower probability
        # Higher DPD -> Lower probability
        prob = 0.95 
        prob -= (balance / 10000) * 0.3
        prob -= (dpd / 90) * 0.4
        
        # Add noise
        prob += np.random.normal(0, 0.1)
        
        # Clamp
        prob = max(0.0, min(1.0, prob))

        X.append([balance, dpd])
        y.append([prob])

    # Export to CSV for inspection
    df = pd.DataFrame(X, columns=['balance', 'days_past_due'])
    df['recovery_probability'] = y
    df.to_csv('synthetic_data.csv', index=False)
    print("Saved synthetic_data.csv for inspection.")

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

def train():
    # 1. Data
    data_path = 'synthetic_data.csv'
    if not os.path.exists(data_path):
        # Try looking in specific path
        alt_path = os.path.join(os.path.dirname(__file__), 'synthetic_data.csv')
        if os.path.exists(alt_path):
            data_path = alt_path

    if os.path.exists(data_path):
        print(f"Loading existing data from {data_path}...")
        df = pd.read_csv(data_path)
        X_raw = df[['balance', 'days_past_due']].values.astype(np.float32)
        y = df['recovery_probability'].values.astype(np.float32).reshape(-1, 1)
    else:
        print("Data not found, generating new...")
        X_raw, y = generate_synthetic_data()
    
    # Scale Features
    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)
    
    # Save Scaler
    with open('scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    print("Saved scaler.pkl")

    # 2. Model
    model = RecoveryNet()
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    # Convert to Tensors
    X_tensor = torch.from_numpy(X)
    y_tensor = torch.from_numpy(y)

    # 3. Training Loop
    print("Training RecoveryNet...")
    for epoch in range(100):
        optimizer.zero_grad()
        outputs = model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer.step()
        
        if (epoch+1) % 10 == 0:
            print(f'Epoch [{epoch+1}/100], Loss: {loss.item():.4f}')

    # 4. Save Model
    torch.save(model.state_dict(), 'recovery_model.pth')
    print("Saved recovery_model.pth")

if __name__ == '__main__':
    train()
