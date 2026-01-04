
import requests
import json

def debug_api():
    url = "https://gamma-api.polymarket.com/events"
    params = {
        "limit": 5,
        "closed": "false",
        "active": "true",
        "tag_slug": "nba" # Try simple filter first
    }
    
    print(f"Fetching {url} with {params}...")
    try:
        resp = requests.get(url, params=params)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"Got {len(data)} events")
            if len(data) > 0:
                print("First Event Structure:")
                print(json.dumps(data[0], indent=2))
                
                print("\nChecking Markets inside first event:")
                if 'markets' in data[0]:
                    print(json.dumps(data[0]['markets'][0], indent=2))
                else:
                    print("No 'markets' field found!")
        else:
            print(resp.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_api()
