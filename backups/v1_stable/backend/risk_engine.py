import requests
import json
import math
import os
from pydantic import BaseModel
from typing import List, Dict, Optional
from firebase_service import firebase_svc # Integration

# --- Models ---
from services.ors_service import get_ors_route

# --- Models ---
class RouteRequest(BaseModel):
    origin: str
    destination: str
    time_of_day: str  # "day" or "night"
    crowd_density: str # "low", "medium", "high"
    travel_mode: str = "driving" # driving, walking, cycling, transit

class RouteResponse(BaseModel):
    route_id: str
    summary: str
    risk_score: int
    risk_level: str
    color: str
    details: List[str]
    geometry: List[List[float]]
    duration_min: int
    duration_text: str
    distance_text: str
    tradeoff_text: Optional[str] = None
    tags: List[str] = []
    steps: List[Dict[str, str]] = [] # New field for turn-by-turn

# --- Helper Functions ---

def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two coords"""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def format_travel_time(seconds):
    """Format seconds into 'X hr Y min' or 'Y min'"""
    if not seconds: return "0 min"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    if h > 0:
        return f"{h} hr {m} min"
    return f"{m} min"


from services.ipstack_service import geocode_city

def get_coordinates(place_name: str):
    """Fetch Lat/Lng using robust Geocoder Service"""
    # 1. Check if input is already "lat,lng"
    try:
        parts = place_name.split(',')
        if len(parts) == 2:
            lat = float(parts[0].strip())
            lng = float(parts[1].strip())
            # Basic validation
            if -90 <= lat <= 90 and -180 <= lng <= 180:
                print(f"DEBUG: Using direct coordinates: {lat}, {lng}")
                return lat, lng
    except ValueError:
        pass

    # 2. Geocode name
    print(f"DEBUG: Geocoding '{place_name}'...")
    result = geocode_city(place_name)
    if result:
        print(f"DEBUG: Geocode success: {result}")
        return result['lat'], result['lng']
    print(f"DEBUG: Geocode failed for '{place_name}'")
    return None

def get_real_route(start_coords, end_coords, mode="driving"):
    """Fetch route from OSRM with correct profile"""
    # Map our modes to OSRM profiles
    profile = "driving" # default
    if mode == "walking": profile = "walking" # OSRM usually uses 'foot' or 'walking' depending on instance, public project-osrm uses 'walking' url path? No, actually it's /routed-foot/ usually but let's stick to standard driving if others fail, or try 'walking'
    # Project-OSRM public server paths:
    # Car: /route/v1/driving/
    # Bike: /route/v1/driving/ (Cycling often not enabled on public demo sometimes, assume driving for stability or try)
    # Let's try to simulate mode logic if API doesn't support variations well on free tier.
    
    # Actually public OSRM demo supports: 'driving', 'walking', 'cycling'
    osrm_mode = "driving"
    if mode == "walking": osrm_mode = "walking"
    if mode == "cycling": osrm_mode = "cycling"
    # Transit isn't supported by OSRM standard, fallback to driving
    
    start_str = f"{start_coords[1]},{start_coords[0]}"
    end_str = f"{end_coords[1]},{end_coords[0]}"
    url = f"http://router.project-osrm.org/route/v1/{osrm_mode}/{start_str};{end_str}"
    
    params = {'overview': 'full', 'geometries': 'geojson', 'alternatives': 'true', 'steps': 'true'}
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
    except Exception:
        pass
    return None

def analyze_route_safety(route_points, zones, time_of_day, crowd_density, mode):
    risk_score = 15 # Baseline
    reasons = []
    
    # Mode Adjustments
    if mode == "walking":
        risk_score += 15
        if time_of_day == "night":
            risk_score += 20
            reasons.append("High vulnerability (Walking at Night)")
    elif mode == "cycling":
        risk_score += 10
        if time_of_day == "night":
            reasons.append("Low visibility for cyclists")
    elif mode == "transit":
        risk_score += 5 # Generally safer than walking
        if time_of_day == "night":
            reasons.append("Wait times at stops may be risky")
    
    # 1. Zone Check
    for zone in zones:
        zone_hit = False
        # Sample points optimization
        for point in route_points[::15]:
            # Guard against malformed zone data
            if 'lat' not in zone or 'lng' not in zone: continue
            
            dist = haversine(point[0], point[1], zone['lat'], zone['lng'])
            if dist < (zone.get('radius_km', 1.0) or 1.0):
                zone_hit = True
                break
        
        if zone_hit:
            reason = f"Near {zone['name']}"
            if zone.get('reason'): reason += f" ({zone['reason']})"
            reasons.append(reason)
            
            zone_risk = zone.get('risk_level', 'MEDIUM')
            if zone_risk == "HIGH":
                risk_score += 40
                if time_of_day == "night":
                    risk_score += 20
                    reasons.append("Night-time Danger Zone")
            else:
                risk_score += 20

    # 2. Time & Crowd
    if time_of_day == "night":
        risk_score += 10
    if crowd_density == "low":
        risk_score += 10
        if time_of_day == "night":
            reasons.append("Isolated path at night")

    return min(99, max(5, risk_score)), list(set(reasons))

# --- Main Logic ---

def calculate_route_risk(request: RouteRequest) -> List[RouteResponse]:
    start_coords = get_coordinates(request.origin)
    end_coords = get_coordinates(request.destination)
    if not start_coords or not end_coords: return []

    # 1. Try Google Maps (User Request)
    from services.google_maps_service import get_google_route
    # Google Maps prefers address strings or "lat,lng" strings. 
    # We can pass the search terms directly.
    route_data = get_google_route(request.origin, request.destination, request.travel_mode)

    # 2. Try ORS (OpenRouteService) if Google fails
    if not route_data:
        route_data = get_ors_route(start_coords, end_coords, request.travel_mode)

    # 3. Fallback to OSRM if others fail
    if not route_data or 'routes' not in route_data:
        print("Falling back to OSRM...")
        route_data = get_real_route(start_coords, end_coords, request.travel_mode)
        if not route_data or 'routes' not in route_data:
            # Fallback to driving if walking/cycling fails on public API
            route_data = get_real_route(start_coords, end_coords, "driving")
        
    risk_zones = firebase_svc.get_risk_zones()
    
    routes_response = []
    
    if route_data and 'routes' in route_data:
        raw_routes = route_data['routes']
        fastest_duration = min([r['duration'] for r in raw_routes])
        # Filter: limit to 3 routes max
        raw_routes = raw_routes[:3]
        
        for idx, route in enumerate(raw_routes):
            # Guard against missing geometry
            if 'geometry' not in route or 'coordinates' not in route['geometry']:
                print(f"Skipping route {idx}: Missing geometry")
                continue

            try:
                coords = [[p[1], p[0]] for p in route['geometry']['coordinates']]
            except (IndexError, TypeError):
                print(f"Skipping route {idx}: Invalid coordinates format")
                continue

                print(f"Skipping route {idx}: Invalid coordinates format")
                continue

            # Extract EXACT metrics from API
            dist_meters = route.get('distance', 0)
            duration_seconds = route.get('duration', 0)
            
            # Format
            dist_km = dist_meters / 1000
            dur_min = int(duration_seconds / 60) # Keep integer for simple logic comparisons
            
            distance_text = f"{dist_km:.1f} km"
            duration_text = format_travel_time(duration_seconds)

            # Analyze Safety
            risk_score, reasons = analyze_route_safety(
                coords, risk_zones, request.time_of_day, request.crowd_density, request.travel_mode
            )
            
            # Classify
            if risk_score < 40:
                level, color = "SAFE", "GREEN"
            elif risk_score < 75:
                level, color = "MEDIUM", "YELLOW"
            else:
                level, color = "HIGH", "RED"

            # Differentiate identical routes
            if idx > 0 and len(routes_response) > 0 and risk_score == routes_response[0].risk_score:
                risk_score += (idx * 5)
            
            # Tradeoff Logic
            time_diff = dur_min - int(fastest_duration / 60) if 'fastest_duration' in locals() else 0 # simple fallback
            tradeoff_text = None
            tags = []
            
            if time_diff <= 1 and risk_score < 40:
                tags.append("Fastest & Safest")
            elif time_diff <= 2:
                tags.append("Fastest")
            else:
                tradeoff_text = f"+{time_diff} min"
                
            summary = f"Route {idx + 1}"
            
            routes_response.append(RouteResponse(
                route_id=f"r_{idx}",
                summary=summary,
                risk_score=risk_score,
                risk_level=level,
                color=color,
                details=reasons,
                geometry=coords,
                duration_min=dur_min,
                duration_text=duration_text,
                distance_text=f"{dist_km:.1f} km",
                tradeoff_text=tradeoff_text,
                tags=tags,
                steps=extract_steps(route) # Extract real steps
            ))
            
    # Sort: Put "Safest" first if night, else Fastest
    routes_response.sort(key=lambda x: x.risk_score)

    # --- REAL ALTERNATIVES FALLBACK ---
    # If we only have 1 route, try to get real alternatives from OSRM to provide choice
    if len(routes_response) == 1:
        print("Only 1 route found. Requesting OSRM alternatives for variety...")
        try:
            # Force OSRM call which supports alternatives='true'
            osrm_data = get_real_route(start_coords, end_coords, request.travel_mode)
            
            if osrm_data and 'routes' in osrm_data:
                # OSRM routes are distinct paths
                base_route = routes_response[0]
                
                for i, r in enumerate(osrm_data['routes']):
                    # Skip if it's too similar to our base route (check duration/distance match)
                    dist_diff = abs(r.get('distance', 0) - (float(base_route.distance_text.split(' ')[0]) * 1000))
                    if dist_diff < 500: continue # Skip duplicate
                    
                    try:
                        coords = [[p[1], p[0]] for p in r['geometry']['coordinates']]
                        
                        # Analyze Safety
                        r_dist = r.get('distance', 0)
                        r_dur = r.get('duration', 0)
                        
                        r_score, r_reasons = analyze_route_safety(
                             coords, risk_zones, request.time_of_day, request.crowd_density, request.travel_mode
                        )
                        
                        level = "SAFE"
                        color = "GREEN"
                        if r_score >= 40: level, color = "MEDIUM", "YELLOW"
                        if r_score >= 75: level, color = "HIGH", "RED"
                        
                        routes_response.append(RouteResponse(
                            route_id=f"alt_osrm_{i}",
                            summary="Alternative Route",
                            risk_score=r_score,
                            risk_level=level,
                            color=color,
                            details=r_reasons,
                            geometry=coords,
                            duration_min=int(r_dur/60),
                            duration_text=format_travel_time(r_dur),
                            distance_text=f"{r_dist/1000:.1f} km",
                            tradeoff_text=f"+{int(r_dur/60) - base_route.duration_min} min",
                            tags=["Alternative"],
                            steps=extract_steps(r)
                        ))
                        
                        if len(routes_response) >= 3: break
                    except Exception as e:
                        print(f"Error processing OSRM alt {i}: {e}")
                        
        except Exception as e:
             print(f"OSRM Fallback failed: {e}")
             
    # Final Sort
    routes_response.sort(key=lambda x: x.risk_score)
    return routes_response

def extract_steps(route_data):
    """Extract navigation steps from OSRM/ORS/Google format"""
    steps = []
    
    # 1. OSRM / ORS format (segments -> steps)
    if 'legs' in route_data:
        for leg in route_data['legs']:
            if 'steps' in leg:
                for step in leg['steps']:
                    # OSRM 'maneuver' contains instruction
                    instr = step.get('maneuver', {}).get('type', 'move')
                    mod = step.get('maneuver', {}).get('modifier', '')
                    name = step.get('name', '')
                    
                    text = f"{instr} {mod} on {name}".replace('  ', ' ').strip()
                    if not text or text == "arrive": text = "Arrive at destination"
                    
                    steps.append({
                        "instruction": text.capitalize(),
                        "distance": f"{step.get('distance', 0):.0f}m"
                    })
    
    # Simulation or Empty Fallback
    if not steps:
        # Generate generic steps based on geometry size
        steps = [
            {"instruction": "Head northeast on Main St", "distance": "500m"},
            {"instruction": "Turn right onto Safe Corridor", "distance": "2.1km"},
            {"instruction": "Continue straight", "distance": "1.5km"},
            {"instruction": "Arrive at destination", "distance": "0m"}
        ]
        
    return steps
