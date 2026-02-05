import firebase_admin
from firebase_admin import credentials, firestore
import os

# Setup Firebase
cred_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    print("❌ serviceAccountKey.json not found!")
    exit(1)

def check_number(phone):
    print(f"\n🔍 Searching for: '{phone}' in criminal_blacklist")
    
    # Try exact match
    docs = list(db.collection('criminal_blacklist').where('phoneNumber', '==', phone).stream())
    
    if docs:
        print("   ❌ MATCH FOUND (BLOCKED):")
        for doc in docs:
            print(f"      ID: {doc.id}, Data: {doc.to_dict()}")
    else:
        print("   ✅ No match found (Clean).")

if __name__ == "__main__":
    check_number("+918688027739")
    check_number("8688027739")
