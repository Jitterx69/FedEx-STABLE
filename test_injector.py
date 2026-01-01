import time
import uuid
import sys
import os
import random
from confluent_kafka import Producer
from google.protobuf.timestamp_pb2 import Timestamp

# Setup Paths
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend/python/estimation/proto'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend/python/estimation'))

# Load compiled protos
import events_pb2 as events

KAFKA_BOOTSTRAP = "localhost:19092"
TOPIC = "stable-events"

def current_timestamp():
    ts = Timestamp()
    ts.GetCurrentTime()
    return ts

def run_injector():
    print(f"💉 Injecting Events to {TOPIC}...")
    producer = Producer({'bootstrap.servers': KAFKA_BOOTSTRAP})

    try:
        count = 0
        while True:
            account_id = str(uuid.uuid4())
            balance = random.uniform(100.0, 5000.0)
            dpd = random.randint(10, 180)

            # Create 'AccountIngested' event
            ingested_event = events.AccountIngested(
                account_id=account_id,
                outstanding_balance=balance,
                days_past_due=dpd
            )

            envelope = events.EventEnvelope(
                event_id=str(uuid.uuid4()),
                event_type="AccountIngested",
                source="test-injector",
                schema_version="1.0.0",
                occurrence_time=current_timestamp(),
                ingestion_time=current_timestamp(),
                account_ingested=ingested_event
            )

            # Serialize and Send
            producer.produce(TOPIC, key=envelope.event_id, value=envelope.SerializeToString())
            producer.flush()
            
            count += 1
            print(f"Sent Account {count}: Balance=${balance:.2f}, DPD={dpd}")
            
            time.sleep(2) # Send one every 2 seconds

    except KeyboardInterrupt:
        print("\nStopping Injector.")

if __name__ == "__main__":
    run_injector()
