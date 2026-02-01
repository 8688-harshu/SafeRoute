import requests
import os

def geocode_city(city_name: str):
    """
    Uses IPStack / PositionStack (often confused) or similar logic.
    Note: IPStack is for IP geolocation. For 'Forward Geocoding' (City -> Coords),
    we usually use 'positionstack' (by same company) or just simple OSRM/Nominatim if free.
    
    If the user strictly provided an 'IPSTACK_API_KEY', they might be using 'PositionStack' actually,
    or expected us to resolve *their* IP.
    
    For now, we will implement this as a robust Geocoder wrapper.
    If IPSTACK is provided, we assume they might mean 'PositionStack' (api.positionstack.com)
    which uses the same key format often.
    """
    key = os.getenv("POSITIONSTACK_API_KEY")
    if not key or "YOUR_" in key:
        print("PositionStack: No valid API Key found. Fallback to Nominatim.")
        return _fallback_nominatim(city_name)

    # Try PositionStack (The actual geocoder from the IPStack family)
    # Restrict to India to avoid global jumps
    url = f"http://api.positionstack.com/v1/forward?access_key={key}&query={city_name}&country=IN&limit=1"
    
    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if 'data' in data and len(data['data']) > 0:
            res = data['data'][0]
            lat = res['latitude']
            lng = res['longitude']
            print(f"IPStack/PositionStack Geocode Success: {city_name} -> {lat}, {lng}")
            return {'lat': lat, 'lng': lng}
        else:
             print(f"IPStack/PositionStack returned no data: {data}")
             return _fallback_nominatim(city_name)
             
    except Exception as e:
        print(f"IPStack Service Error: {e}")
        return _fallback_nominatim(city_name)

def _fallback_nominatim(city_name):
    # Free fallback, STRICTLY restricted to India
    try:
        headers = {'User-Agent': 'SafeRouteApp/1.0'}
        # Append India to query to be sure
        q = f"{city_name}, India" 
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={q}&countrycodes=in&limit=1"
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200 and len(resp.json()) > 0:
            loc = resp.json()[0]
            print(f"Nominatim Success: {loc['lat']}, {loc['lon']}")
            return {'lat': float(loc['lat']), 'lng': float(loc['lon'])}
        else:
            # Fallback for when specific query fails
            url = f"https://nominatim.openstreetmap.org/search?format=json&q={city_name}&countrycodes=in&limit=1"
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200 and len(resp.json()) > 0:
                loc = resp.json()[0]
                return {'lat': float(loc['lat']), 'lng': float(loc['lon'])}
    except Exception as e:
        print(f"Nominatim Fallback Error: {e}")
    return None
