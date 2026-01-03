import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import pickle
import pandas as pd
import os
from sklearn.preprocessing import StandardScaler
from model import RecoveryNet

    if os.path.exists(data_path):
        print(f"Loading existing data from {data_path}...")
        df = pd.read_csv(data_path)
        X_raw = df[['balance', 'days_past_due']].values.astype(np.float32)
        y = df['recovery_probability'].values.astype(np.float32).reshape(-1, 1)
    else:
        print(f"❌ Error: Data file not found at {data_path}")
        print("Please run 'backend/python/estimation/generate_data.py' first.")
        return
    
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
