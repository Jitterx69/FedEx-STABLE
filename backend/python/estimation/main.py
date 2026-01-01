import time
import uuid
import random
import torch
import numpy as np
import pickle
from confluent_kafka import Consumer, Producer
from google.protobuf.timestamp_pb2 import Timestamp
import sys
import os

# ML Imports
from model import RecoveryNet

# Proto Path
sys.path.append(os.path.join(os.path.dirname(__file__), 'proto'))
import events_pb2 as events

KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP", "localhost:19092")
CONSUMER_GROUP = "stable-estimation-engine"
TOPIC = "stable-events"

print("Loading ML Model...")
BASE_DIR = os.path.dirname(__file__)
# Load Scaler
with open(os.path.join(BASE_DIR, 'scaler.pkl'), 'rb') as f:
    scaler = pickle.load(f)

# Load Model
model = RecoveryNet()
model.load_state_dict(torch.load(os.path.join(BASE_DIR, 'recovery_model.pth')))
model.eval()
print("Model loaded successfully.")

def current_timestamp():
    ts = Timestamp()
    ts.GetCurrentTime()
    return ts

def run_estimation_engine():
    print("Starting Estimation Engine (PyTorch V1.0)...")

    consumer = Consumer({
        'bootstrap.servers': KAFKA_BOOTSTRAP,
        'group.id': CONSUMER_GROUP,
        'auto.offset.reset': 'earliest'
    })
    consumer.subscribe([TOPIC])

    producer = Producer({'bootstrap.servers': KAFKA_BOOTSTRAP})

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None: continue
            if msg.error():
                print(f"Consumer error: {msg.error()}")
                continue

            try:
                envelope = events.EventEnvelope()
                envelope.ParseFromString(msg.value())
                
                if envelope.event_type == "AccountIngested":
                    process_account(envelope.account_ingested, producer)
                    
            except Exception as e:
                print(f"Failed to process message: {e}")

    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()

def process_account(account_event, producer):
    print(f"Inferencing for Account: {account_event.account_id}")

    # 1. Prepare Features
    features = np.array([[
        account_event.outstanding_balance,
        account_event.days_past_due
    ]], dtype=np.float32)

    # 2. Scale
    features_scaled = scaler.transform(features)

    # 3. Predict
    with torch.no_grad():
        inputs = torch.from_numpy(features_scaled)
        output = model(inputs)
        raw_prob = output.item()

    # 4. Estimate Effort (Still heuristic for now, or could use another model)
    effort = 2.0 + (account_event.days_past_due / 30.0)

    # 5. Create Event
    estimate_event = events.InternalEstimateGenerated(
        model_id="model-v1.0-pytorch",
        target_account_id=account_event.account_id,
        raw_recovery_probability=raw_prob,
        estimated_effort_hours=effort
    )

    out_envelope = events.EventEnvelope(
        event_id=str(uuid.uuid4()),
        event_type="InternalEstimateGenerated",
        source="estimation-engine-ml",
        schema_version="1.0.0",
        occurrence_time=current_timestamp(),
        ingestion_time=current_timestamp(),
        internal_estimate_generated=estimate_event 
    )

    producer.produce(TOPIC, key=out_envelope.event_id, value=out_envelope.SerializeToString())
    producer.flush()
    print(f"Published ML Estimate: val={raw_prob:.4f}")

if __name__ == "__main__":
    run_estimation_engine()
