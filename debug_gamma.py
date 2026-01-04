import requests
import json

url = "https://gamma-api.polymarket.com/events"
params = {
    "closed": "true",
    "tag_slug": "nba",
    "limit": 5
}
try:
    print(f"Requesting {url} with params {params}...")
    response = requests.get(url, params=params, timeout=10)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response keys: {data.keys() if isinstance(data, dict) else 'Not a dict'}")
    if isinstance(data, list):
        print(f"Got list of {len(data)} items")
        if len(data) > 0:
            print("Sample item keys:", data[0].keys())
    elif isinstance(data, dict):
         print("Body:", json.dumps(data)[:200])
except Exception as e:
    print(f"Error: {e}")
