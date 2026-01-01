import numpy as np
import pandas as pd
import os

print("Starting generation...")
n_samples = 10000
X = []
y = []

for _ in range(n_samples):
    balance = np.random.exponential(scale=3000) 
    dpd = np.random.randint(0, 180)
    prob = 0.95 
    prob -= (balance / 10000) * 0.3
    prob -= (dpd / 90) * 0.4
    prob += np.random.normal(0, 0.1)
    prob = max(0.0, min(1.0, prob))
    X.append([balance, dpd])
    y.append([prob])

df = pd.DataFrame(X, columns=['balance', 'days_past_due'])
df['recovery_probability'] = y

target_path = "/Users/mohit/Desktop/stable-governance-console/synthetic_data.csv"
df.to_csv(target_path, index=False)
print(f"Successfully wrote {n_samples} rows to {target_path}")
print(df.head())
