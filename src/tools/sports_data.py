"""
Sports Data Fetcher for AI PolyMarket Sports Picker

This module fetches historical sports data from free APIs:
- ESPN API (unofficial, no key required)
- Sports Reference (via web scraping)
- Ball Don't Lie API (NBA, free)
- The Sports DB (free tier)

The data is used to train our Historical Model.
"""

import os
import json
import time
import logging
from typing import Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
from enum import Enum

import requests
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

# Free Sports APIs
ESPN_API_URL = "https://site.api.espn.com/apis/site/v2/sports"
BALL_DONT_LIE_URL = "https://api.balldontlie.io/v1"
SPORTS_DB_URL = "https://www.thesportsdb.com/api/v1/json/3"  # Free tier

# Cache directory
CACHE_DIR = Path("artifacts/sports_cache")


class Sport(str, Enum):
    """Supported sports."""
    NBA = "nba"
    NFL = "nfl"
    MLB = "mlb"
    NHL = "nhl"
    SOCCER = "soccer"
    MMA = "mma"


# =============================================================================
# Pydantic Models
# =============================================================================

class Team(BaseModel):
    """Represents a sports team."""
    id: str
    name: str
    abbreviation: str = ""
    logo_url: Optional[str] = None
    
    
class Game(BaseModel):
    """Represents a sports game/match."""
    id: str
    sport: str
    home_team: Team
    away_team: Team
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    winner: Optional[str] = None  # 'home', 'away', 'tie'
    game_date: str
    status: str = "scheduled"  # scheduled, in_progress, final
    venue: Optional[str] = None
    season: Optional[str] = None
    week: Optional[int] = None  # For NFL
    
    @property
    def is_complete(self) -> bool:
        return self.status.lower() in ["final", "complete", "completed"]
    
    def determine_winner(self) -> Optional[str]:
        """Determine winner based on scores."""
        if self.home_score is None or self.away_score is None:
            return None
        if self.home_score > self.away_score:
            return "home"
        elif self.away_score > self.home_score:
            return "away"
        return "tie"


class TeamStats(BaseModel):
    """Team statistics for a season."""
    team_id: str
    team_name: str
    sport: str
    season: str
    wins: int = 0
    losses: int = 0
    ties: int = 0
    points_for: float = 0.0
    points_against: float = 0.0
    win_percentage: float = 0.0
    home_record: str = ""
    away_record: str = ""


# =============================================================================
# ESPN API Client (Free, No Key Required)
# =============================================================================

class ESPNClient:
    """
    Client for fetching data from ESPN's unofficial API.
    
    No API key required - this is the same API used by ESPN.com.
    
    Supported sports:
    - basketball/nba
    - football/nfl
    - baseball/mlb
    - hockey/nhl
    - soccer/usa.1 (MLS)
    """
    
    SPORT_PATHS = {
        Sport.NBA: "basketball/nba",
        Sport.NFL: "football/nfl",
        Sport.MLB: "baseball/mlb",
        Sport.NHL: "hockey/nhl",
        Sport.SOCCER: "soccer/usa.1",
    }
    
    def __init__(self, cache_dir: Path = CACHE_DIR):
        self.base_url = ESPN_API_URL
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make GET request to ESPN API."""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"ESPN API request failed: {e}")
            return {}
    
    def get_scoreboard(
        self,
        sport: Sport,
        date: Optional[str] = None,
    ) -> list[Game]:
        """
        Get games for a specific date.
        
        Args:
            sport: Sport type
            date: Date in YYYYMMDD format (default: today)
            
        Returns:
            List of games
        """
        sport_path = self.SPORT_PATHS.get(sport, "basketball/nba")
        
        params = {}
        if date:
            params["dates"] = date
        
        data = self._get(f"{sport_path}/scoreboard", params)
        
        games = []
        for event in data.get("events", []):
            try:
                competition = event.get("competitions", [{}])[0]
                competitors = competition.get("competitors", [])
                
                if len(competitors) < 2:
                    continue
                
                # ESPN lists home team first in some cases, check homeAway field
                home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
                away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])
                
                home_team = Team(
                    id=home.get("team", {}).get("id", ""),
                    name=home.get("team", {}).get("displayName", ""),
                    abbreviation=home.get("team", {}).get("abbreviation", ""),
                    logo_url=home.get("team", {}).get("logo"),
                )
                
                away_team = Team(
                    id=away.get("team", {}).get("id", ""),
                    name=away.get("team", {}).get("displayName", ""),
                    abbreviation=away.get("team", {}).get("abbreviation", ""),
                    logo_url=away.get("team", {}).get("logo"),
                )
                
                home_score = int(home.get("score", 0)) if home.get("score") else None
                away_score = int(away.get("score", 0)) if away.get("score") else None
                
                game = Game(
                    id=event.get("id", ""),
                    sport=sport.value,
                    home_team=home_team,
                    away_team=away_team,
                    home_score=home_score,
                    away_score=away_score,
                    game_date=event.get("date", ""),
                    status=event.get("status", {}).get("type", {}).get("name", "scheduled"),
                    venue=competition.get("venue", {}).get("fullName"),
                    season=str(event.get("season", {}).get("year", "")),
                )
                
                # Determine winner
                game.winner = game.determine_winner()
                
                games.append(game)
            except Exception as e:
                logger.warning(f"Failed to parse game: {e}")
                continue
        
        return games
    
    def get_games_range(
        self,
        sport: Sport,
        start_date: str,
        end_date: str,
    ) -> list[Game]:
        """
        Get games for a date range.
        
        Args:
            sport: Sport type
            start_date: Start date (YYYYMMDD)
            end_date: End date (YYYYMMDD)
            
        Returns:
            List of all games in range
        """
        all_games = []
        
        # Parse dates
        start = datetime.strptime(start_date, "%Y%m%d")
        end = datetime.strptime(end_date, "%Y%m%d")
        
        current = start
        while current <= end:
            date_str = current.strftime("%Y%m%d")
            logger.info(f"Fetching {sport.value} games for {date_str}...")
            
            games = self.get_scoreboard(sport, date_str)
            all_games.extend(games)
            
            # Rate limiting
            time.sleep(0.5)
            current += timedelta(days=1)
        
        return all_games
    
    def get_teams(self, sport: Sport) -> list[Team]:
        """
        Get all teams for a sport.
        
        Args:
            sport: Sport type
            
        Returns:
            List of teams
        """
        sport_path = self.SPORT_PATHS.get(sport, "basketball/nba")
        data = self._get(f"{sport_path}/teams")
        
        teams = []
        for team_data in data.get("sports", [{}])[0].get("leagues", [{}])[0].get("teams", []):
            team = team_data.get("team", {})
            teams.append(Team(
                id=team.get("id", ""),
                name=team.get("displayName", ""),
                abbreviation=team.get("abbreviation", ""),
                logo_url=team.get("logos", [{}])[0].get("href") if team.get("logos") else None,
            ))
        
        return teams
    
    def get_standings(self, sport: Sport, season: Optional[int] = None) -> list[TeamStats]:
        """
        Get standings/team stats for a season.
        
        Args:
            sport: Sport type
            season: Season year (default: current)
            
        Returns:
            List of team stats
        """
        sport_path = self.SPORT_PATHS.get(sport, "basketball/nba")
        
        params = {}
        if season:
            params["season"] = season
        
        data = self._get(f"{sport_path}/standings", params)
        
        stats = []
        for group in data.get("children", []):
            for standing in group.get("standings", {}).get("entries", []):
                team = standing.get("team", {})
                team_stats = standing.get("stats", [])
                
                # Parse stats
                wins = 0
                losses = 0
                for stat in team_stats:
                    if stat.get("name") == "wins":
                        wins = int(stat.get("value", 0))
                    elif stat.get("name") == "losses":
                        losses = int(stat.get("value", 0))
                
                total = wins + losses
                
                stats.append(TeamStats(
                    team_id=team.get("id", ""),
                    team_name=team.get("displayName", ""),
                    sport=sport.value,
                    season=str(season or datetime.now().year),
                    wins=wins,
                    losses=losses,
                    win_percentage=wins / total if total > 0 else 0.0,
                ))
        
        return stats


# =============================================================================
# Ball Don't Lie API (NBA - Free)
# =============================================================================

class BallDontLieClient:
    """
    Client for Ball Don't Lie NBA API.
    
    Free tier: 30 requests/minute.
    Documentation: https://docs.balldontlie.io/
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.base_url = BALL_DONT_LIE_URL
        self.api_key = api_key or os.getenv("BALL_DONT_LIE_KEY", "")
        self.session = requests.Session()
        
        if self.api_key:
            self.session.headers["Authorization"] = self.api_key
    
    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict:
        """Make GET request."""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            response = self.session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Ball Don't Lie API error: {e}")
            return {}
    
    def get_games(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        per_page: int = 100,
    ) -> list[Game]:
        """
        Get NBA games.
        
        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            per_page: Results per page
            
        Returns:
            List of games
        """
        params = {"per_page": per_page}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        
        data = self._get("games", params)
        
        games = []
        for game_data in data.get("data", []):
            home = game_data.get("home_team", {})
            away = game_data.get("visitor_team", {})
            
            game = Game(
                id=str(game_data.get("id", "")),
                sport="nba",
                home_team=Team(
                    id=str(home.get("id", "")),
                    name=home.get("full_name", ""),
                    abbreviation=home.get("abbreviation", ""),
                ),
                away_team=Team(
                    id=str(away.get("id", "")),
                    name=away.get("full_name", ""),
                    abbreviation=away.get("abbreviation", ""),
                ),
                home_score=game_data.get("home_team_score"),
                away_score=game_data.get("visitor_team_score"),
                game_date=game_data.get("date", ""),
                status="final" if game_data.get("status") == "Final" else "scheduled",
                season=str(game_data.get("season")),
            )
            
            game.winner = game.determine_winner()
            games.append(game)
        
        return games


# =============================================================================
# Sports Data Aggregator
# =============================================================================

class SportsDataFetcher:
    """
    Unified interface for fetching sports data from multiple sources.
    
    Usage:
        fetcher = SportsDataFetcher()
        
        # Get recent NBA games
        games = fetcher.get_recent_games(Sport.NBA, days=7)
        
        # Get historical games for training
        games = fetcher.get_historical_games(Sport.NFL, "20230901", "20231231")
    """
    
    def __init__(self):
        self.espn = ESPNClient()
        self.ball_dont_lie = BallDontLieClient()
        self.cache_dir = CACHE_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def get_recent_games(
        self,
        sport: Sport,
        days: int = 7,
    ) -> list[Game]:
        """
        Get games from the last N days.
        
        Args:
            sport: Sport type
            days: Number of days to look back
            
        Returns:
            List of recent games
        """
        end = datetime.now()
        start = end - timedelta(days=days)
        
        start_str = start.strftime("%Y%m%d")
        end_str = end.strftime("%Y%m%d")
        
        return self.espn.get_games_range(sport, start_str, end_str)
    
    def get_historical_games(
        self,
        sport: Sport,
        start_date: str,
        end_date: str,
        use_cache: bool = True,
    ) -> list[Game]:
        """
        Get historical games for a date range.
        
        Args:
            sport: Sport type
            start_date: Start date (YYYYMMDD)
            end_date: End date (YYYYMMDD)
            use_cache: Whether to use cached data
            
        Returns:
            List of games
        """
        cache_file = self.cache_dir / f"{sport.value}_{start_date}_{end_date}.json"
        
        # Check cache
        if use_cache and cache_file.exists():
            logger.info(f"Loading from cache: {cache_file}")
            with open(cache_file, "r") as f:
                data = json.load(f)
                return [Game(**g) for g in data]
        
        # Fetch fresh data
        games = self.espn.get_games_range(sport, start_date, end_date)
        
        # Save to cache
        if games:
            with open(cache_file, "w") as f:
                json.dump([g.model_dump() for g in games], f, indent=2, default=str)
            logger.info(f"Cached {len(games)} games to {cache_file}")
        
        return games
    
    def get_team_stats(self, sport: Sport, season: Optional[int] = None) -> list[TeamStats]:
        """Get team standings/stats."""
        return self.espn.get_standings(sport, season)
    
    def get_teams(self, sport: Sport) -> list[Team]:
        """Get all teams for a sport."""
        return self.espn.get_teams(sport)
    
    def export_training_data(
        self,
        games: list[Game],
        output_path: str,
    ) -> str:
        """
        Export games to a format suitable for ML training.
        
        Args:
            games: List of games
            output_path: Output file path
            
        Returns:
            Output file path
        """
        # Filter to completed games only
        completed = [g for g in games if g.is_complete]
        
        # Convert to training format
        training_data = []
        for game in completed:
            training_data.append({
                "game_id": game.id,
                "sport": game.sport,
                "date": game.game_date,
                "home_team": game.home_team.name,
                "away_team": game.away_team.name,
                "home_score": game.home_score,
                "away_score": game.away_score,
                "winner": game.winner,  # 'home' or 'away'
                "home_win": 1 if game.winner == "home" else 0,  # Binary label
                "score_diff": (game.home_score or 0) - (game.away_score or 0),
            })
        
        # Save
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(training_data, f, indent=2)
        
        logger.info(f"Exported {len(training_data)} games to {output_path}")
        return output_path


# =============================================================================
# CLI Entry Point
# =============================================================================

def main():
    """Test the sports data fetcher."""
    print("=" * 60)
    print("[SPORTS] Sports Data Fetcher")
    print("=" * 60)
    
    fetcher = SportsDataFetcher()
    
    # Test NBA data
    print("\n[*] Fetching recent NBA games (last 3 days)...")
    nba_games = fetcher.get_recent_games(Sport.NBA, days=3)
    print(f"[OK] Found {len(nba_games)} NBA games")
    
    # Show sample games
    completed = [g for g in nba_games if g.is_complete]
    print(f"     Completed: {len(completed)}")
    
    for game in completed[:5]:
        winner = game.home_team.name if game.winner == "home" else game.away_team.name
        print(f"  - {game.away_team.abbreviation} @ {game.home_team.abbreviation}: "
              f"{game.away_score}-{game.home_score} (Winner: {winner})")
    
    # Test NFL teams
    print("\n[*] Fetching NFL teams...")
    nfl_teams = fetcher.get_teams(Sport.NFL)
    print(f"[OK] Found {len(nfl_teams)} NFL teams")
    for team in nfl_teams[:5]:
        print(f"  - {team.abbreviation}: {team.name}")
    
    # Export sample training data
    if completed:
        print("\n[*] Exporting training data...")
        output = fetcher.export_training_data(
            nba_games,
            "artifacts/training_data/nba_sample.json"
        )
        print(f"[OK] Exported to {output}")
    
    print("\n" + "=" * 60)
    print("[SUMMARY]")
    print(f"  NBA games fetched: {len(nba_games)}")
    print(f"  Completed games: {len(completed)}")
    print(f"  NFL teams: {len(nfl_teams)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
