"""Quick test of Gamma API connectivity."""
import requests

url = "https://gamma-api.polymarket.com/events"
params = {"closed": "true", "limit": 3}

print("Testing Gamma API...")
try:
    resp = requests.get(url, params=params, timeout=15)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    if isinstance(data, list):
        print(f"Got {len(data)} events")
        if data:
            print(f"First event title: {data[0].get('title', 'N/A')}")
    else:
        print(f"Response type: {type(data)}")
        print(f"Keys: {data.keys() if hasattr(data, 'keys') else 'N/A'}")
except Exception as e:
    print(f"Error: {e}")
