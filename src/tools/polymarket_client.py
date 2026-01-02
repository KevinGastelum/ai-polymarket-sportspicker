"""
Polymarket CLOB API Client

This module provides a Python client for interacting with the Polymarket
CLOB (Central Limit Order Book) API. Focused on fetching sports-related
prediction markets for our AI Sports Picker.

API Documentation: https://docs.polymarket.com/developers/CLOB
Base URL: https://clob.polymarket.com
"""

import os
import time
import json
import logging
from typing import Optional, TypedDict
from datetime import datetime
from pathlib import Path

import requests
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

CLOB_API_URL = os.getenv("CLOB_API_URL", "https://clob.polymarket.com")
GAMMA_API_URL = os.getenv("GAMMA_API_URL", "https://gamma-api.polymarket.com")

# Sports-related market tags
SPORTS_TAGS = [
    "sports",
    "nba",
    "nfl",
    "mlb",
    "nhl",
    "soccer",
    "football",
    "basketball",
    "baseball",
    "hockey",
    "tennis",
    "golf",
    "mma",
    "ufc",
    "boxing",
    "f1",
    "racing",
    "olympics",
    "esports",
]


# =============================================================================
# Pydantic Models
# =============================================================================

class Token(BaseModel):
    """Represents a binary outcome token in a prediction market."""
    token_id: str
    outcome: str
    price: Optional[float] = None


class Market(BaseModel):
    """Represents a Polymarket prediction market."""
    condition_id: str
    question_id: str
    question: str = ""
    description: str = ""
    market_slug: str = ""
    end_date_iso: Optional[str] = None
    game_start_time: Optional[str] = None
    tokens: list[Token] = Field(default_factory=list)
    active: bool = True
    closed: bool = False
    accepting_orders: bool = True
    tags: Optional[list[str]] = Field(default_factory=list)
    
    # Computed fields for sports analysis
    sport_type: Optional[str] = None
    
    @property
    def safe_tags(self) -> list[str]:
        """Get tags as list, handling None."""
        return self.tags if self.tags else []
    
    def is_sports_market(self) -> bool:
        """Check if this market is sports-related."""
        tags_lower = [t.lower() for t in self.safe_tags]
        question_lower = self.question.lower()
        
        for sport_tag in SPORTS_TAGS:
            if sport_tag in tags_lower or sport_tag in question_lower:
                return True
        return False
    
    def get_yes_price(self) -> Optional[float]:
        """Get the current YES token price (probability)."""
        for token in self.tokens:
            if token.outcome.upper() == "YES":
                return token.price
        return None
    
    def get_no_price(self) -> Optional[float]:
        """Get the current NO token price."""
        for token in self.tokens:
            if token.outcome.upper() == "NO":
                return token.price
        return None


class TradeEntry(BaseModel):
    """Represents a trade from the CLOB API."""
    trade_id: str = ""
    market_id: str = ""
    token_id: str = ""
    side: str = ""  # BUY or SELL
    price: float = 0.0
    size: float = 0.0
    timestamp: str = ""


class MarketsResponse(BaseModel):
    """Response from markets endpoint."""
    markets: list[Market] = Field(default_factory=list)
    next_cursor: Optional[str] = None


# =============================================================================
# API Client
# =============================================================================

class PolymarketClient:
    """
    Client for interacting with Polymarket CLOB API.
    
    Usage:
        client = PolymarketClient()
        sports_markets = client.get_sports_markets()
        for market in sports_markets:
            print(f"{market.question}: {market.get_yes_price()}")
    """
    
    def __init__(
        self,
        clob_url: str = CLOB_API_URL,
        gamma_url: str = GAMMA_API_URL,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        """
        Initialize the Polymarket client.
        
        Args:
            clob_url: Base URL for CLOB API
            gamma_url: Base URL for Gamma API (market metadata)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.clob_url = clob_url.rstrip("/")
        self.gamma_url = gamma_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
        })
        
        # Cache for reducing API calls
        self._cache: dict = {}
        self._cache_ttl = 60  # seconds
    
    def _request(
        self,
        method: str,
        url: str,
        params: Optional[dict] = None,
        data: Optional[dict] = None,
    ) -> dict:
        """
        Make an HTTP request with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Full URL to request
            params: Query parameters
            data: Request body data
            
        Returns:
            JSON response as dictionary
            
        Raises:
            requests.RequestException: If request fails after retries
        """
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=data,
                    timeout=self.timeout,
                )
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.RequestException as e:
                last_error = e
                logger.warning(
                    f"Request failed (attempt {attempt + 1}/{self.max_retries}): {e}"
                )
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
        
        raise last_error or Exception("Request failed")
    
    def get_markets(
        self,
        next_cursor: Optional[str] = None,
        limit: int = 100,
    ) -> MarketsResponse:
        """
        Fetch markets from the CLOB API.
        
        Args:
            next_cursor: Pagination cursor
            limit: Number of markets to fetch
            
        Returns:
            MarketsResponse with list of markets
        """
        params = {"limit": limit}
        if next_cursor:
            params["next_cursor"] = next_cursor
        
        url = f"{self.clob_url}/markets"
        data = self._request("GET", url, params=params)
        
        markets = []
        for item in data.get("data", data if isinstance(data, list) else []):
            try:
                # Parse tokens
                tokens = []
                for t in item.get("tokens", []):
                    tokens.append(Token(
                        token_id=t.get("token_id", ""),
                        outcome=t.get("outcome", ""),
                        price=float(t.get("price", 0)) if t.get("price") else None,
                    ))
                
                market = Market(
                    condition_id=item.get("condition_id", ""),
                    question_id=item.get("question_id", ""),
                    question=item.get("question", ""),
                    description=item.get("description", ""),
                    market_slug=item.get("market_slug", ""),
                    end_date_iso=item.get("end_date_iso"),
                    game_start_time=item.get("game_start_time"),
                    tokens=tokens,
                    active=item.get("active", True),
                    closed=item.get("closed", False),
                    accepting_orders=item.get("accepting_orders", True),
                    tags=item.get("tags", []),
                )
                markets.append(market)
            except Exception as e:
                logger.warning(f"Failed to parse market: {e}")
                continue
        
        return MarketsResponse(
            markets=markets,
            next_cursor=data.get("next_cursor"),
        )
    
    def get_all_markets(self, max_pages: int = 10) -> list[Market]:
        """
        Fetch all markets with pagination.
        
        Args:
            max_pages: Maximum number of pages to fetch
            
        Returns:
            List of all markets
        """
        all_markets = []
        next_cursor = None
        
        for page in range(max_pages):
            logger.info(f"Fetching markets page {page + 1}...")
            response = self.get_markets(next_cursor=next_cursor)
            all_markets.extend(response.markets)
            
            if not response.next_cursor:
                break
            next_cursor = response.next_cursor
        
        logger.info(f"Fetched {len(all_markets)} total markets")
        return all_markets
    
    def get_sports_markets(self, max_pages: int = 10) -> list[Market]:
        """
        Fetch only sports-related markets.
        
        Args:
            max_pages: Maximum number of pages to fetch
            
        Returns:
            List of sports markets
        """
        all_markets = self.get_all_markets(max_pages=max_pages)
        
        sports_markets = [m for m in all_markets if m.is_sports_market()]
        
        # Sort by end date (upcoming first)
        sports_markets.sort(
            key=lambda m: m.end_date_iso or "9999",
            reverse=False,
        )
        
        logger.info(f"Found {len(sports_markets)} sports markets")
        return sports_markets
    
    def get_market_by_id(self, condition_id: str) -> Optional[Market]:
        """
        Fetch a specific market by its condition ID.
        
        Args:
            condition_id: The market's condition ID
            
        Returns:
            Market object or None if not found
        """
        url = f"{self.clob_url}/markets/{condition_id}"
        
        try:
            data = self._request("GET", url)
            
            tokens = []
            for t in data.get("tokens", []):
                tokens.append(Token(
                    token_id=t.get("token_id", ""),
                    outcome=t.get("outcome", ""),
                    price=float(t.get("price", 0)) if t.get("price") else None,
                ))
            
            return Market(
                condition_id=data.get("condition_id", ""),
                question_id=data.get("question_id", ""),
                question=data.get("question", ""),
                description=data.get("description", ""),
                market_slug=data.get("market_slug", ""),
                end_date_iso=data.get("end_date_iso"),
                game_start_time=data.get("game_start_time"),
                tokens=tokens,
                active=data.get("active", True),
                closed=data.get("closed", False),
                accepting_orders=data.get("accepting_orders", True),
                tags=data.get("tags", []),
            )
        except Exception as e:
            logger.error(f"Failed to fetch market {condition_id}: {e}")
            return None
    
    def get_trades(
        self,
        market_id: Optional[str] = None,
        token_id: Optional[str] = None,
        limit: int = 100,
    ) -> list[TradeEntry]:
        """
        Fetch trade history.
        
        Args:
            market_id: Filter by market ID
            token_id: Filter by token ID
            limit: Number of trades to fetch
            
        Returns:
            List of trade entries
        """
        params = {"limit": limit}
        if market_id:
            params["market_id"] = market_id
        if token_id:
            params["token_id"] = token_id
        
        url = f"{self.clob_url}/trades"
        
        try:
            data = self._request("GET", url, params=params)
            
            trades = []
            for item in data.get("data", []):
                trades.append(TradeEntry(
                    trade_id=item.get("trade_id", ""),
                    market_id=item.get("market_id", ""),
                    token_id=item.get("token_id", ""),
                    side=item.get("side", ""),
                    price=float(item.get("price", 0)),
                    size=float(item.get("size", 0)),
                    timestamp=item.get("timestamp", ""),
                ))
            
            return trades
        except Exception as e:
            logger.error(f"Failed to fetch trades: {e}")
            return []
    
    def get_price_history(
        self,
        token_id: str,
        interval: str = "1h",
        limit: int = 100,
    ) -> list[dict]:
        """
        Fetch price history for a token.
        
        Args:
            token_id: Token ID to get history for
            interval: Time interval (1m, 5m, 1h, 1d)
            limit: Number of data points
            
        Returns:
            List of price points with timestamp and price
        """
        url = f"{self.clob_url}/prices-history"
        params = {
            "token_id": token_id,
            "interval": interval,
            "limit": limit,
        }
        
        try:
            data = self._request("GET", url, params=params)
            return data.get("history", [])
        except Exception as e:
            logger.error(f"Failed to fetch price history: {e}")
            return []


# =============================================================================
# Utility Functions
# =============================================================================

def format_market_summary(market: Market) -> str:
    """
    Format a market as a human-readable summary.
    
    Args:
        market: Market to format
        
    Returns:
        Formatted string summary
    """
    yes_price = market.get_yes_price()
    probability = f"{yes_price * 100:.1f}%" if yes_price else "N/A"
    
    status = "[ACTIVE]" if market.active and not market.closed else "[CLOSED]"
    
    return f"""
[MARKET] {market.question}
   Probability: {probability}
   Status: {status}
   End Date: {market.end_date_iso or 'N/A'}
   Tags: {', '.join(market.safe_tags) or 'None'}
"""


def save_markets_to_json(markets: list[Market], filepath: str) -> None:
    """
    Save markets to a JSON file.
    
    Args:
        markets: List of markets to save
        filepath: Path to save JSON file
    """
    data = [m.model_dump() for m in markets]
    
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)
    
    logger.info(f"Saved {len(markets)} markets to {filepath}")


# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    """Main entry point for testing the client."""
    print("=" * 60)
    print("[SPORTS] Polymarket Sports Markets Scanner")
    print("=" * 60)
    
    client = PolymarketClient()
    
    # Fetch sports markets
    print("\n[*] Fetching sports markets from Polymarket...")
    sports_markets = client.get_sports_markets(max_pages=5)
    
    if not sports_markets:
        print("[X] No sports markets found!")
        print("\nTrying to fetch all markets to see what's available...")
        all_markets = client.get_all_markets(max_pages=2)
        print(f"Found {len(all_markets)} total markets")
        if all_markets:
            print("\nSample market tags:")
            for m in all_markets[:10]:
                print(f"  - {m.question[:50]}... | Tags: {m.safe_tags}")
        return
    
    # Separate by accepting_orders (better indicator of tradable markets)
    tradable_markets = [m for m in sports_markets if m.accepting_orders]
    closed_markets = [m for m in sports_markets if not m.accepting_orders]
    
    print(f"\n[OK] Found {len(sports_markets)} sports markets!")
    print(f"     - Tradable (accepting orders): {len(tradable_markets)}")
    print(f"     - Closed: {len(closed_markets)}")
    
    # Display top tradable markets
    if tradable_markets:
        print("\n[TRADABLE] Top 10 Active Sports Markets:")
        print("-" * 60)
        for i, market in enumerate(tradable_markets[:10], 1):
            print(f"{i}. {format_market_summary(market)}")
    else:
        print("\n[!] No tradable sports markets found.")
        print("    This may mean Polymarket doesn't have active sports betting right now.")
        print("    Showing most recent closed markets for reference:")
        print("-" * 60)
        # Sort by end_date descending to show most recent
        recent_closed = sorted(
            closed_markets,
            key=lambda m: m.end_date_iso or "0000",
            reverse=True
        )[:10]
        for i, market in enumerate(recent_closed, 1):
            print(f"{i}. {format_market_summary(market)}")
    
    # Save to file
    output_path = "artifacts/sports_markets.json"
    save_markets_to_json(sports_markets, output_path)
    print(f"\n[SAVED] All markets saved to {output_path}")
    
    # Also save tradable markets separately
    if tradable_markets:
        active_path = "artifacts/tradable_sports_markets.json"
        save_markets_to_json(tradable_markets, active_path)
        print(f"[SAVED] Tradable markets saved to {active_path}")
    
    # Summary stats
    print("\n" + "=" * 60)
    print("[SUMMARY]")
    print(f"  Total sports markets found: {len(sports_markets)}")
    print(f"  Currently tradable: {len(tradable_markets)}")
    print(f"  Historical (closed): {len(closed_markets)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
