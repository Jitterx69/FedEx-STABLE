import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import sys

def ingest_data():
    # 1. Config
    csv_path = os.path.join(os.path.dirname(__file__), '../estimation/synthetic_data.csv')
    db_url = os.environ.get("POSTGRES_URL")
    
    if not db_url:
        print("❌ Error: POSTGRES_URL environment variable is not set.")
        sys.exit(1)

    if not os.path.exists(csv_path):
        print(f"❌ Error: Data file not found at {csv_path}")
        print("Please run 'backend/python/estimation/generate_data.py' first.")
        sys.exit(1)

    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Ensure column exists
        print("Ensuring schema matches...")
        cur.execute("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS recovery_probability DOUBLE PRECISION;")
        conn.commit()
        
    except Exception as e:
        print(f"❌ Database connection/schema update failed: {e}")
        sys.exit(1)

    # 2. Read Data
    print(f"Reading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # 3. Prepare Data for Insertion
    # Schema: account_id, outstanding_balance, days_past_due, status, recovery_probability
    print(f"Preparing {len(df)} records for ingestion...")
    
    insert_query = """
    INSERT INTO accounts (account_id, outstanding_balance, days_past_due, status, recovery_probability)
    VALUES %s
    ON CONFLICT (account_id) DO UPDATE 
    SET outstanding_balance = EXCLUDED.outstanding_balance,
        days_past_due = EXCLUDED.days_past_due,
        recovery_probability = EXCLUDED.recovery_probability;
    """
    
    valid_rows = []
    for _, row in df.iterrows():
        valid_rows.append((
            row['account_id'],
            row['balance'],
            row['days_past_due'],
            'ingested',
            row['recovery_probability']
        ))

    # 4. Bulk Insert
    try:
        execute_values(cur, insert_query, valid_rows)
        conn.commit()
        print(f"✅ Successfully ingested {len(valid_rows)} accounts.")
    except Exception as e:
        conn.rollback()
        print(f"❌ Insertion failed: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    ingest_data()
