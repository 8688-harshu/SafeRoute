import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import googlemaps
import requests
from typing import List, Dict

# Path to service account key (user needs to place this file)
CRED_PATH = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "risk_zones.json")

class FirebaseService:
    def __init__(self):
        self.db = None
        self.use_local = True
        self.gmaps = None
        
        # Init Google Maps for Geocoding Fallback
        key = os.getenv("GOOGLE_MAPS_API_KEY")
        if key:
            try:
                self.gmaps = googlemaps.Client(key=key)
            except Exception as e:
                print(f"Maps Client Init Error: {e}")

        # Try to initialize Firebase
        if os.path.exists(CRED_PATH):
            try:
                cred = credentials.Certificate(CRED_PATH)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.use_local = False
                print("✅ Firebase Connected Successfully")
            except Exception as e:
                print(f"⚠️ Firebase Init Error: {e}. Switching to Local Mode.")
        else:
            print("⚠️ No serviceAccountKey.json found. Running in LOCAL/DEMO mode.")

    def get_risk_zones(self) -> List[Dict]:
        """Fetch risk zones from Firestore or Local JSON"""
        zones = []
        if not self.use_local and self.db:
            try:
                docs = self.db.collection('risk_zones').stream()
                for doc in docs:
                    data = doc.to_dict()
                    
                    # INTELLIGENT FIX: Check if coordinates are missing
                    if 'lat' not in data or 'lng' not in data:
                        # Try to find name
                        name = data.get('area_name') or data.get('area_name2') or data.get('name')
                        if name:
                            print(f"Geocoding missing location for Risk Zone: {name}")
                            from services.ipstack_service import geocode_city
                            
                            loc = geocode_city(name)
                            if loc:
                                data['lat'] = loc['lat']
                                data['lng'] = loc['lng']
                                data['name'] = name
                                print(f"  -> Found: {data['lat']}, {data['lng']}")
                            else:
                                print(f"  -> Geocode failed (no results)")
                        else:
                            continue
                            
                    # Standardize Defaults if missing
                    if 'radius_km' not in data: data['radius_km'] = 2.0
                    if 'risk_level' not in data: data['risk_level'] = "HIGH"
                    if 'name' not in data: data['name'] = data.get('area_name', 'Unknown Zone')
                    
                    zones.append(data)
                    
                return zones
            except Exception as e:
                print(f"Firestore Read Error: {e}")
                return self._load_local_zones()
        else:
            return self._load_local_zones()

    def add_safety_report(self, report_data: Dict):
        """Save report to Firestore and potentially update a risk zone"""
        if not self.use_local and self.db:
            try:
                # 1. Save Report
                self.db.collection('safety_reports').add(report_data)
                
                # 2. Update Risk Zone (Simplistic Logic: Create/Update zone at loc)
                # In real app, we would cluster reports. Here we just log it.
                print(f"Report saved to Firebase: {report_data}")
                return True
            except Exception as e:
                print(f"Firestore Write Error: {e}")
                return False
        else:
            # Mock save
            print(f"LOCAL SAVE: {report_data}")
            return True

    def log_emergency(self, data: Dict):
        """Log SOS to emergency_logs"""
        if not self.use_local and self.db:
            try:
                # Use phone_timestamp as ID
                import time
                doc_id = f"{data['phone']}_{int(time.time())}"
                self.db.collection('emergency_logs').document(doc_id).set(data)
                print(f"SOS Logged: {doc_id}")
                return True
            except Exception as e:
                print(f"Firestore SOS Error: {e}")
                return False
        else:
            print(f"LOCAL SOS LOG: {data}")
            return True

    def _load_local_zones(self):
        if os.path.exists(LOCAL_DB_PATH):
            with open(LOCAL_DB_PATH, 'r') as f:
                return json.load(f)
        return []

# Singleton instance
firebase_svc = FirebaseService()
