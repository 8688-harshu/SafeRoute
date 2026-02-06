from firebase_service import firebase_svc

print("--- LISTING ALL ZONES ---")
zones = firebase_svc.get_risk_zones()
print(f"Total Risk Zones: {len(zones)}")
for z in zones:
    print(f"🔴 {z.get('name', 'Unknown')} ({z.get('lat')}, {z.get('lng')})")

acc = firebase_svc.get_accidental_zones()
print(f"\nTotal Accidental Zones: {len(acc)}")
for a in acc:
    print(f"🟡 {a.get('name', 'Unknown')} ({a.get('lat')}, {a.get('lng')})")
