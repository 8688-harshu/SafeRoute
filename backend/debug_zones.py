import firebase_admin
from firebase_admin import credentials, firestore
import os
import googlemaps

# Setup paths (relative to script execution location in backend/)
CRED_PATH = "serviceAccountKey.json"

def debug_risk_zones():
    print("--- 1. Checking Credentials ---")
    if not os.path.exists(CRED_PATH):
        print(f"❌ '{CRED_PATH}' NOT FOUND.")
        return
    print(f"✅ Found '{CRED_PATH}'")

    print("\n--- 2. Connecting to Firebase ---")
    try:
        cred = credentials.Certificate(CRED_PATH)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Connected to Firestore")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return

    print("\n--- 3. Fetching 'risk_zones' Collection ---")
    try:
        docs = db.collection('risk_zones').stream()
        count = 0
        for doc in docs:
            count += 1
            data = doc.to_dict()
            print(f"\n[Document {doc.id}]")
            print(f"  Raw Data: {data}")
            
            # Check for keys
            has_coords = 'lat' in data and 'lng' in data
            print(f"  Has Coordinates? {'✅ Yes' if has_coords else '❌ NO'}")
            
            if not has_coords:
                print("  Trying to fix via Geocoding...")
                # Extract Name
                name = data.get('area_name') or data.get('area_name2') or data.get('name')
                print(f"  Target Name: '{name}'")
                
                # Try Geocoding
                key = os.getenv("GOOGLE_MAPS_API_KEY")
                if not key:
                    print("  ❌ No GOOGLE_MAPS_API_KEY env var found!")
                else:
                    try:
                        gmaps = googlemaps.Client(key=key)
                        res = gmaps.geocode(name)
                        if res:
                           loc = res[0]['geometry']['location']
                           print(f"  ✅ Geocode Success! Lat: {loc['lat']}, Lng: {loc['lng']}")
                        else:
                           print("  ⚠️ Geocode returned NO results.")
                    except Exception as ge:
                        print(f"  ❌ Geocode Exception: {ge}")

        if count == 0:
            print("\n⚠️ Collection 'risk_zones' is EMPTY.")
            
    except Exception as e:
        print(f"❌ Read Error: {e}")

if __name__ == "__main__":
    # Need to load env vars for API key if not set in shell
    from dotenv import load_dotenv
    load_dotenv()
    debug_risk_zones()
