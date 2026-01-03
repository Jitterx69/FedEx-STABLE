import numpy as np
import pandas as pd
import uuid

def generate_synthetic_data(n_samples=10000):
    print(f"Generating {n_samples} synthetic samples...")
    data = []

    for _ in range(n_samples):
        # Basic Account Info
        account_id = str(uuid.uuid4())
        
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

        data.append({
            'account_id': account_id,
            'balance': balance,
            'days_past_due': dpd,
            'recovery_probability': prob
        })

    # Export to CSV
    df = pd.DataFrame(data)
    # Save to the same directory as this script
    output_path = 'backend/python/estimation/synthetic_data.csv'
    df.to_csv(output_path, index=False)
    print(f"Saved {output_path} with {len(df)} records.")

if __name__ == '__main__':
    generate_synthetic_data()
