import firebase_admin
from firebase_admin import credentials, firestore
import os

# Setup paths
CRED_PATH = "serviceAccountKey.json"

def debug_risk_zones():
    print("--- DEBUGGING DATABASE CONTENTS ---")
    
    # Connect
    if not os.path.exists(CRED_PATH):
        print(f"❌ Missing {CRED_PATH}")
        return

    try:
        cred = credentials.Certificate(CRED_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase Connected")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # Check Collection
    print("\nReading 'risk_zones' collection...")
    try:
        docs = list(db.collection('risk_zones').stream())
        print(f"found {len(docs)} documents.")
        
        for i, doc in enumerate(docs):
            data = doc.to_dict()
            print(f"\n--- Document #{i+1} (ID: {doc.id}) ---")
            print(str(data))
            
            # Diagnose
            keys = data.keys()
            print("  Keys found:", list(keys))
            
            # Check for Location Info
            has_coords = 'lat' in data and 'lng' in data
            has_name = 'area_name' in data or 'area_name2' in data or 'name' in data or 'location' in data
            
            if has_coords:
                print(f"  ✅ Coordinates present: {data['lat']}, {data['lng']}")
            else:
                print("  ❌ NO Coordinates found (lat/lng missing)")
                
            if has_name:
                name = data.get('area_name') or data.get('area_name2') or data.get('name') or data.get('location')
                print(f"  ℹ️  Potential Name: '{name}'")
            else:
                print("  ⚠️ NO obvious Name field found (checked: area_name, area_name2, name, location)")

    except Exception as e:
        print(f"❌ Read Error: {e}")

if __name__ == "__main__":
    debug_risk_zones()
