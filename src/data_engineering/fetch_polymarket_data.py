"""
Market Calibration Data Fetcher

This script fetches historical market data from Polymarket for ALL sports.
It uses:
1. Gamma API: To find closed events and their markets across multiple sport categories.
2. CLOB API: To get historical price data for the winning outcome.

Output:
    data/polymarket_raw_all_sports.csv
"""

import os
import time
import json
import logging
import requests
import pandas as pd
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
GAMMA_API_URL = "https://gamma-api.polymarket.com"
CLOB_API_URL = "https://clob.polymarket.com"
OUTPUT_DIR = Path("data")
OUTPUT_FILE = OUTPUT_DIR / "polymarket_raw_all_sports.csv"

# Configuration
SPORT_TAGS = [
    'nba', 'nfl', 'soccer', 'mlb', 'esports', 
    'formula-1', 'tennis', 'golf', 'mma', 'cricket', 'rugby'
]
START_DATE_LIMIT = datetime(2023, 1, 1)

class MarketFetcher:
    def __init__(self):
        self.session = requests.Session()
    
    def _get_request(self, url: str, params: Dict[str, Any] = None) -> Any:
        try:
            response = self.session.get(url, params=params, timeout=10)
            if response.status_code == 429:
                logger.warning("Rate limited. Waiting 5s...")
                time.sleep(5)
                return self._get_request(url, params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed to {url}: {e}")
            return None

    def fetch_closed_events(self, sport_tag: str, limit: int = 20, offset: int = 0) -> List[Dict]:
        """Fetch closed events from Gamma API for a specific sport."""
        url = f"{GAMMA_API_URL}/events"
        params = {
            "closed": "true",
            "tag_slug": sport_tag,
            "limit": limit,
            "offset": offset,
            "order": "startDate",
            "ascending": "false"
        }
        return self._get_request(url, params)

    def fetch_price_history(self, token_id: str, start_ts: int, end_ts: int) -> List[Dict]:
        """Fetch price history from CLOB API."""
        url = f"{CLOB_API_URL}/prices-history"
        params = {
            "market": token_id,
            "interval": "1h",
            "start": start_ts,
            "end": end_ts
        }
        response_data = self._get_request(url, params)
        if response_data and 'history' in response_data:
            return response_data['history']
        return []

    def detect_market_type(self, title: str, description: str) -> str:
        """Detect market type from title/description."""
        text = f"{title} {description}".lower()
        
        if "by more than" in text or "by over" in text or re.search(r'\d+\.?\d*\s*points', text):
            return "spread"
        if any(x in text for x in ['championship', 'winner', 'mvp', 'finals', 'super bowl', 'world series']):
            return "futures"
        if any(x in text for x in ['draft', 'first pick', 'total', 'over/under']) or ("will" in text and "score" in text):
            return "prop"
        
        return "moneyline"

    def extract_spread_value(self, title: str) -> Optional[float]:
        """Extract numeric spread value from title."""
        match = re.search(r'(\d+\.?\d*)\s*(?:points|pts)?', title, re.IGNORECASE)
        if match:
            return float(match.group(1))
        return None

    def process_event(self, event: Dict, sport: str) -> List[Dict]:
        """Process an event and return data points for all valid markets."""
        results = []
        
        try:
            event_id = event.get('id')
            title = event.get('title')
            start_date_iso = event.get('startDate')
            
            if not start_date_iso:
                return []
                
            game_start_dt = datetime.fromisoformat(start_date_iso.replace('Z', '+00:00'))
            
            markets = event.get('markets', [])
            # print(f"DEBUG: Processing event '{title}' with {len(markets)} markets")

            # Process ALL markets in the event, not just one "Winner" market
            for market in markets:
                if not market.get('closed'): 
                    # print(f"DEBUG: Market '{market.get('question')}' not closed")
                    continue

                market_title = market.get('question') or title
                market_desc = market.get('description') or ''
                market_type = self.detect_market_type(market_title, market_desc)
                
                # Filter out complex multi-outcome markets for now if not binary
                # We focus on binary markets where we can easily track Yes/No or TeamA/TeamB
                try:
                    outcomes_str = market.get('outcomes', '[]')
                    clob_token_ids_str = market.get('clobTokenIds', '[]')
                    
                    if not clob_token_ids_str:
                        # print(f"DEBUG: No clobTokenIds for market '{market_title}', skipping")
                        continue

                    # Handle stringified json
                    outcomes_list = outcomes_str if isinstance(outcomes_str, list) else json.loads(outcomes_str)
                    clob_token_ids = clob_token_ids_str if isinstance(clob_token_ids_str, list) else json.loads(clob_token_ids_str)
                    
                    tokens = []
                    if len(outcomes_list) == len(clob_token_ids):
                         for i, outcome in enumerate(outcomes_list):
                             tokens.append({
                                 'token_id': clob_token_ids[i],
                                 'outcome': outcome
                             })
                except Exception as e:
                    # print(f"DEBUG: Failed to parse tokens/outcomes for '{market_title}': {e}")
                    continue

                if len(tokens) != 2:
                    # print(f"DEBUG: Market '{market_title}' has {len(tokens)} tokens, skipping")
                    continue

                # Prepare data point
                token_a = tokens[0] # Usually the "Yes" or "Home" or primary outcome
                
                # Fetch T-1h Odds
                t_minus_1h = game_start_dt - timedelta(hours=1)
                t_min = int(t_minus_1h.timestamp())
                t_max = int(game_start_dt.timestamp())
                
                # Check for history
                history = self.fetch_price_history(token_a['token_id'], t_min - 3600, t_max + 3600)
                if not history:
                    # print(f"DEBUG: No history for market '{market_title}' around T-1h")
                    continue
                    
                history.sort(key=lambda x: x['t'])
                
                # Get closest point to T-1h
                target_ts = t_minus_1h.timestamp()
                closest_point = min(history, key=lambda x: abs(x['t'] - target_ts))
                
                if abs(closest_point['t'] - target_ts) > 7200: # > 2 hours diff
                    # print(f"DEBUG: Closest point too far for '{market_title}'")
                    continue
                    
                market_implied_prob = closest_point['p']

                # Determine Actual Result (0 or 1)
                # Fetch history for T+2days
                t_resolve = int((game_start_dt + timedelta(days=2)).timestamp())
                history_post = self.fetch_price_history(token_a['token_id'], t_max, t_resolve)
                
                actual_result_binary = None
                if history_post:
                    last_price = history_post[-1]['p']
                    if last_price > 0.95: actual_result_binary = 1
                    elif last_price < 0.05: actual_result_binary = 0
                
                if actual_result_binary is None:
                    # print(f"DEBUG: Could not determine result for '{market_title}' (last price: {history_post[-1]['p'] if history_post else 'None'})")
                    continue

                results.append({
                    "event_id": event_id,
                    "market_id": market.get('id'),
                    "game_date": start_date_iso,
                    "sport": sport,
                    "market_type": market_type,
                    "outcome_name": token_a.get('outcome', 'Unknown'),
                    "market_title": market_title,
                    "point_value": self.extract_spread_value(market_title) if market_type in ['spread', 'prop'] else None,
                    "market_implied_prob": market_implied_prob,
                    "actual_result_binary": actual_result_binary,
                    "volume_usd": float(market.get('volume', 0)),
                    "market_slug": market.get('slug')
                })

        except Exception as e:
            logger.error(f"Error processing event {event.get('title')}: {e}")
            
        return results

    def run(self):
        print("Starting Data Fetcher for ALL Sports...", flush=True)
        all_data = []
        limit = 10 # Small batch per sport for initial test
        target_per_sport = 20 
        
        for sport in SPORT_TAGS:
            print(f"\nFetching data for sport: {sport}...", flush=True)
            offset = 0
            sport_fetched = 0
            
            while sport_fetched < target_per_sport:
                events_data = self.fetch_closed_events(sport, limit=limit, offset=offset)
                
                if not events_data:
                    break
                    
                events = events_data if isinstance(events_data, list) else events_data.get('events', [])
                if not events:
                    break

                print(f"  Got {len(events)} raw events.", flush=True)
                
                processed_count = 0
                for event in events:
                    data_points = self.process_event(event, sport)
                    if data_points:
                        all_data.extend(data_points)
                        processed_count += len(data_points)
                        # print(f"    + {len(data_points)} markets from '{event.get('title')}'")
                
                sport_fetched += processed_count
                offset += limit
                
                if processed_count == 0 and len(events) > 0:
                   # If we fetched events but none yielded valid markets (e.g. no 2-outcome markets), 
                   # we still increment offset but might hit loop limit.
                   # Just a safeguard to not loop infinitely if no valid data found
                   if offset > 100: break

                print(f"  Processed {processed_count} valid markets. Total for {sport}: {sport_fetched}", flush=True)
                time.sleep(1)

        # Save to CSV
        if all_data:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            df = pd.DataFrame(all_data)
            df.to_csv(OUTPUT_FILE, index=False)
            print(f"\nSaved {len(df)} records to {OUTPUT_FILE}", flush=True)
            
            # Simple stats
            print("\nDataset Summary:")
            print(df.groupby(['sport', 'market_type'])['event_id'].count())
            print(f"\nOverall Win Rate: {df['actual_result_binary'].mean():.2f}")
        else:
            print("No valid data collected!", flush=True)

if __name__ == "__main__":
    fetcher = MarketFetcher()
    fetcher.run()
