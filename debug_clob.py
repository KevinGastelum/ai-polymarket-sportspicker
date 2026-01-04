import requests

def debug_request():
    token_id = "24501718340045326425158866071053082355145745256431627661439673874496705550344"
    url = "https://clob.polymarket.com/prices-history"
    params = {
        "market": token_id,
        "interval": "1h",
        "start": 1766840665,
        "end": 1766851465
    }
    
    print(f"Requesting: {url} with params {params}")
    resp = requests.get(url, params=params)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")

if __name__ == "__main__":
    debug_request()
