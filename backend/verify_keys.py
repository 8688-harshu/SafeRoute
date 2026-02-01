import os
import requests
from dotenv import load_dotenv

# Load env vars
load_dotenv()

def test_positionstack():
    key = os.getenv("POSITIONSTACK_API_KEY")
    if not key:
        print("❌ PositionStack: No Key Found in .env")
        return

    print(f"Testing PositionStack with Key: {key[:5]}...")
    url = f"http://api.positionstack.com/v1/forward?access_key={key}&query=New Delhi&country=IN&limit=1"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and len(data['data']) > 0:
                print("✅ PositionStack: Working! Resolved 'New Delhi'")
            else:
                print(f"⚠️ PositionStack: Request Success (200) but no data returned. Response: {data}")
        elif response.status_code == 401:
            print("❌ PositionStack: Invalid API Key (401 Unauthorized)")
        elif response.status_code == 429:
            print("❌ PositionStack: Rate Limit Exceeded (429)")
        else:
            print(f"❌ PositionStack: Failed ({response.status_code}) - {response.text}")
    except Exception as e:
        print(f"❌ PositionStack: Connection Error: {e}")

def test_ors():
    key = os.getenv("ORS_API_KEY")
    if not key:
        print("❌ ORS: No Key Found in .env")
        return

    print(f"Testing OpenRouteService with Key: {key[:5]}...")
    # Simple route request (Delhi to Mumbai approx coords)
    url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
    headers = {
        'Authorization': key,
        'Content-Type': 'application/json'
    }
    body = {
        "coordinates": [[77.2090, 28.6139], [72.8777, 19.0760]]
    }

    try:
        response = requests.post(url, json=body, headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ ORS: Working! Calculated route.")
        elif response.status_code == 401: # ORS might use 403 sometimes for keys
            print("❌ ORS: Invalid API Key (401/403)")
        elif response.status_code == 403:
             print("❌ ORS: Invalid API Key or Permissions (403)")
        else:
             print(f"❌ ORS: Failed ({response.status_code}) - {response.text}")
    except Exception as e:
        print(f"❌ ORS: Connection Error: {e}")

if __name__ == "__main__":
    print("--- API Key Verification ---")
    test_positionstack()
    print("-" * 30)
    test_ors()
    print("--- End ---")
