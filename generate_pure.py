import random
import csv
import os

def generate_csv():
    target_path = "/Users/mohit/Desktop/stable-governance-console/backend/python/estimation/synthetic_data.csv"
    print(f"Generating 10,000 records to {target_path}...")
    
    headers = ["balance", "days_past_due", "recovery_probability"]
    
    with open(target_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for _ in range(10000):
            # Logic mirroring the original:
            # Balance: Exponential-ish (mostly low, some high)
            balance = random.expovariate(1.0 / 3000.0)
            
            # DPD: 0 to 180
            dpd = random.randint(0, 180)
            
            # Prob Logic
            prob = 0.95
            prob -= (balance / 10000.0) * 0.3
            prob -= (dpd / 90.0) * 0.4
            
            # Noise
            prob += random.gauss(0, 0.1)
            
            # Clamp
            prob = max(0.0, min(1.0, prob))
            
            writer.writerow([f"{balance:.2f}", dpd, f"{prob:.4f}"])
            
    print("Done.")

if __name__ == "__main__":
    generate_csv()
