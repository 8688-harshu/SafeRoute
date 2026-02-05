
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import requests

load_dotenv()

def verify_backend():
    print("--- SafeRoute Backend Verification ---")
    
    # Check .env
    print("\n[1] Checking Environment Variables:")
    for key in ["POSITIONSTACK_API_KEY", "ORS_API_KEY", "GOOGLE_MAPS_API_KEY"]:
        val = os.getenv(key)
        if val:
            print(f"✅ {key} is set (starts with {val[:5]}...)")
        else:
            print(f"❌ {key} is MISSING")

    # Check Firebase
    print("\n[2] Checking Firebase Connection:")
    CRED_PATH = os.path.join(os.getcwd(), "serviceAccountKey.json")
    if os.path.exists(CRED_PATH):
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(CRED_PATH)
                firebase_admin.initialize_app(cred)
            db = firestore.client()
            # Try to read something
            zones = db.collection('risk_zones').limit(1).get()
            print(f"✅ Firebase Connected. Found {len(zones)} documents in 'risk_zones'.")
        except Exception as e:
            print(f"❌ Firebase Error: {e}")
    else:
        print("❌ serviceAccountKey.json NOT FOUND in current directory")

    # Check ORS (Routing)
    print("\n[3] Checking ORS API:")
    ors_key = os.getenv("ORS_API_KEY")
    if ors_key:
        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        # Test coordinates for Bangalore (SafeRoute context usually seems to be India/Bangalore)
        body = {"coordinates":[[77.5946, 12.9716],[77.6046, 12.9816]]}
        headers = {'Authorization': ors_key, 'Content-Type': 'application/json'}
        try:
            resp = requests.post(url, json=body, headers=headers)
            if resp.status_code == 200:
                print("✅ ORS API is Working")
            else:
                print(f"❌ ORS API Error: {resp.status_code} - {resp.text[:100]}")
        except Exception as e:
            print(f"❌ ORS Connection Error: {e}")

if __name__ == "__main__":
    verify_backend()
