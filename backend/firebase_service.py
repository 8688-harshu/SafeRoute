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
LOCAL_ACC_PATH = os.path.join(os.path.dirname(__file__), "data", "accidental_zones.json")

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
                print(f"⚠️ Firebase Init Error: {e}")
                print("\n" + "!"*50)
                print("CRITICAL WARNING: Running in Demo Mode.")
                print("Firebase failed to init. Data will NOT be saved to the cloud.")
                print("!"*50 + "\n")
        else:
            print("\n" + "!"*50)
            print("CRITICAL WARNING: serviceAccountKey.json is MISSING.")
            print("Running in Demo Mode. Data will NOT be saved to the cloud.")
            print("!"*50 + "\n")

    def get_risk_zones(self) -> List[Dict]:
        """Fetch risk zones from Firestore or Local JSON"""
        zones = []
        if not self.use_local and self.db:
            try:
                docs = self.db.collection('risk_zones').stream()
                for doc in docs:
                    data = doc.to_dict()
                    data = self._sanitize_data(data)
                    
                    if 'lat' not in data or 'lng' not in data:
                        # Try to find name
                        name = data.get('area_name') or data.get('area_name2') or data.get('name')
                        if name:
                            from services.geocoding_service import geocode_location
                            loc = geocode_location(name)
                            if loc:
                                data['lat'] = loc['lat']
                                data['lng'] = loc['lng']
                                data['name'] = name
                    
                    # Standardize Radius (Priority: radius_meters > radius > radius_km)
                    r = data.get('radius_meters') or data.get('radius')
                    if r is not None:
                        data['radius_meters'] = float(r)
                        data['radius_km'] = float(r) / 1000.0
                    elif 'radius_km' in data:
                         data['radius_meters'] = float(data['radius_km']) * 1000.0
                    else:
                        data['radius_meters'] = 2000.0 # Default 2km
                        data['radius_km'] = 2.0

                    if 'risk_level' not in data: data['risk_level'] = "HIGH"
                    if 'name' not in data: data['name'] = data.get('area_name', 'Unknown Zone')
                    
                    zones.append(data)
                
                print(f"DEBUG: Loaded {len(zones)} risk zones from Firebase")
                if len(zones) == 0:
                    print("⚠️ Firestore empty, using LOCAL DATA fallback.")
                    return self._load_local_zones()
                return zones
            except Exception as e:
                print(f"Firestore Read Error: {e}")
                local = self._load_local_zones()
                return local
        else:
            local = self._load_local_zones()
            return local

    def get_accidental_zones(self) -> List[Dict]:
        """Fetch accidental zones from Firestore"""
        zones = []
        if not self.use_local and self.db:
            try:
                docs = self.db.collection('accidental_zones').stream()
                for doc in docs:
                    data = doc.to_dict()
                    data = self._sanitize_data(data)
                    
                    # Standardize Radius (Priority: radius_meters > radius > radius_km)
                    r = data.get('radius_meters') or data.get('radius')
                    if r is not None:
                         # Heuristic: If user entered "1.5" in 'radius' field, they probably meant KM if it's < 10. 
                         # But user specifically said "updated in meter". So we trust 'radius' implies meters unless explicit km field used.
                         # However, to be safe, let's treat 'radius' as meters.
                        data['radius_meters'] = float(r)
                        data['radius_km'] = float(r) / 1000.0
                    elif 'radius_km' in data:
                         data['radius_meters'] = float(data['radius_km']) * 1000.0
                    else:
                        data['radius_meters'] = 500.0 # Default 500m
                        data['radius_km'] = 0.5

                    data['risk_level'] = 'MEDIUM' 
                    data['type'] = 'accidental'
                    if 'name' not in data: data['name'] = "Accident Prone Area"
                    
                    if 'name' not in data: data['name'] = "Accident Prone Area"
                    
                    zones.append(data)
                
                print(f"DEBUG: Loaded {len(zones)} accidental zones from Firebase")
                if len(zones) == 0:
                    print("⚠️ Firestore empty, using LOCAL ACCIDENTAL DATA fallback.")
                    return self._load_local_zones(LOCAL_ACC_PATH)
                return zones
            except Exception as e:
                print(f"Firestore Accidental Read Error: {e}")
                return self._load_local_zones(LOCAL_ACC_PATH)
        return self._load_local_zones(LOCAL_ACC_PATH)

    def add_safety_report(self, report_data: Dict):
        """Save report to Firestore and potentially update a risk zone"""
        if not self.use_local and self.db:
            try:
                self.db.collection('safety_reports').add(report_data)
                print(f"Report saved to Firebase: {report_data}")
                return True
            except Exception as e:
                print(f"Firestore Write Error: {e}")
                return False
        else:
            print(f"LOCAL SAVE (No DB): {report_data}")
            return True

    def log_emergency(self, data: Dict):
        """Log SOS to emergency_logs"""
        if not self.use_local and self.db:
            try:
                import time
                doc_id = f"{data['phone']}_{int(time.time())}"
                self.db.collection('emergency_logs').document(doc_id).set(data)
                print(f"SOS Logged to Firebase: {doc_id}")
                return True
            except Exception as e:
                print(f"Firestore SOS Error: {e}")
                return False
        else:
            print(f"LOCAL SOS LOG (No DB): {data}")
            return True

    def check_criminal_record(self, phone: str) -> bool:
        """Query criminal_blacklist for a specific phone number"""
        if not self.use_local and self.db:
            try:
                # Query exact match first
                docs = self.db.collection('criminal_blacklist').where('phoneNumber', '==', phone).limit(1).get()
                if len(docs) > 0:
                    print(f"⚠️ SECURITY ALERT: Criminal record found for {phone}")
                    return True
                
                # Try without '+' if it exists
                if phone.startswith('+'):
                    no_plus = phone[1:]
                    docs2 = self.db.collection('criminal_blacklist').where('phoneNumber', '==', no_plus).limit(1).get()
                    if len(docs2) > 0:
                         print(f"⚠️ SECURITY ALERT: Criminal record found for {no_plus}")
                         return True

                return False
            except Exception as e:
                print(f"Firestore Blacklist Error: {e}")
                return False
        return False # Fallback to safe if DB unavailable or local

    def _sanitize_data(self, data):
        """Convert Firestore types to JSON serializable types"""
        new_data = {}
        for k, v in data.items():
            if hasattr(v, 'isoformat'):
                new_data[k] = v.isoformat()
            else:
                new_data[k] = v
        return new_data

    def _load_local_zones(self, path=LOCAL_DB_PATH):
        if os.path.exists(path):
            with open(path, 'r') as f:
                return json.load(f)
        return []

# Singleton instance
firebase_svc = FirebaseService()
