import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

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

def upload_collection(collection_name, file_name):
    print(f"🚀 Uploading documents to '{collection_name}'...")
    # Fix: Ensure we are looking in the 'data' subdirectory
    file_path = os.path.join(os.path.dirname(__file__), "data", file_name)
    
    if not os.path.exists(file_path):
        print(f"⚠️ File {file_path} not found. Skipping.")
        return

    with open(file_path, 'r') as f:
        data = json.load(f)

    print(f"🚀 Uploading {len(data)} documents to '{collection_name}'...")
        
    for item in data:
        # Create a unique ID or let Firebase assign one
        # For blacklist, phone number is a good ID
        if collection_name == 'criminal_blacklist':
            db.collection(collection_name).document(item['phoneNumber']).set(item)
        else:
            db.collection(collection_name).document().set(item)
            
    print(f"✅ Successfully uploaded {len(data)} items to {collection_name}")

if __name__ == "__main__":
    upload_collection("risk_zones", "risk_zones.json")
    upload_collection("accidental_zones", "accidental_zones.json")
    upload_collection("criminal_blacklist", "criminal_blacklist.json")
