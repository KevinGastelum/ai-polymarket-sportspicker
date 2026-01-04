import requests
import json

GAMMA_API_URL = "https://gamma-api.polymarket.com"

def inspect():
    url = f"{GAMMA_API_URL}/events"
    params = {
        "closed": "true",
        "tag_slug": "nba",
        "limit": 1
    }
    resp = requests.get(url, params=params)
    data = resp.json()
    
    # Dump to file for easy reading
    with open("event_dump.json", "w") as f:
        json.dump(data, f, indent=2)
    
    print("Dumped 1 event to event_dump.json")

    # Access first event if exists
    if isinstance(data, list):
        event = data[0]
    else:
        event = data.get('events', [])[0]
        
    print("Keys in event:", event.keys())
    if 'markets' in event:
        print("Number of markets:", len(event['markets']))
        if len(event['markets']) > 0:
            m = event['markets'][0]
            print("Keys in first market:", m.keys())
            if 'tokens' in m:
                print("Tokens in market:", m['tokens'])
            else:
                print("NO 'tokens' KEY in market!")
                
if __name__ == "__main__":
    inspect()
