
import firebase_admin
from firebase_admin import credentials, firestore
import os

# Path to the key we just renamed on the Desktop
# Path to the key relative to this script
key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")

print(f"checking for key at: {key_path}")

if not os.path.exists(key_path):
    print("❌ Key file not found!")
else:
    try:
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ CONNECTION SUCCESSFUL!")
        print("   Database is connected and ready.")
        
        # Lists collections to be sure
        cols = db.collections()
        print("   Collections found:", [c.id for c in cols])
        
    except Exception as e:
        print("❌ Connection Failed")
        print(f"   Error: {e}")
