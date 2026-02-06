from firebase_service import firebase_svc

print("--- TESTING FIREBASE CONNECTION ---")

try:
    print("\n--- FETCHING RISK ZONES ---")
    zones = firebase_svc.get_risk_zones()
    print(f"Risk Zones Count: {len(zones)}")
    if len(zones) > 0:
        print(f"Sample 1 Name: {zones[0].get('name')}")
        print(f"Sample 1 Type: {type(zones[0])}")

    print("\n--- FETCHING ACCIDENTAL ZONES ---")
    acc = firebase_svc.get_accidental_zones()
    print(f"Accidental Zones Count: {len(acc)}")
    if len(acc) > 0:
        print(f"Sample 1 Name: {acc[0].get('name')}")

except Exception as e:
    print(f"ERROR: {e}")
