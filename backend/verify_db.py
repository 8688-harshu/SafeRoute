import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Setup Firebase
cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase Connected")
else:
    print("❌ serviceAccountKey.json not found!")
    exit(1)

def check_collection(name):
    print(f"\n🔍 Checking Collection: '{name}'")
    docs = list(db.collection(name).limit(5).stream())
    
    if not docs:
        print(f"   ⚠️ Collection is EMPTY or does not exist.")
        return

    print(f"   ✅ Found {len(docs)} documents (showing sample).")
    for doc in docs:
        data = doc.to_dict()
        print(f"   📄 ID: {doc.id}")
        print(f"      Data: {json.dumps(data, indent=2, default=str)}")
        
        # Validation Checks for Suitability
        if name in ['risk_zones', 'accidental_zones']:
            if 'lat' not in data or 'lng' not in data:
                print("      ❌ ALERT: Missing coordinates (lat/lng)")
            if 'radius_meters' not in data and 'radius' not in data and 'radius_km' not in data:
                print("      ❌ ALERT: Missing radius information")
            if name == 'accidental_zones' and data.get('risk_level') != 'MEDIUM':
                 print(f"      ⚠️ WARNING: Expected risk_level='MEDIUM' for accidental zone, got '{data.get('risk_level')}'")

if __name__ == "__main__":
    check_collection("risk_zones")
    check_collection("accidental_zones")
    check_collection("safety_reports")
    check_collection("emergency_logs")
    check_collection("criminal_blacklist")
