from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.market_data import CandleResponse, IndicatorResponse, NewsEventResponse, CalendarEventResponse
from app.services.market_data_service import MarketDataService
from app.models.models import User

router = APIRouter(prefix="/market-data", tags=["Market Data"])


@router.get("/candles", response_model=List[CandleResponse])
async def get_candles(
    pair: str = Query(..., description="e.g. EUR/USD"),
    timeframe: str = Query("1h", description="e.g. 5m, 1h, 1d"),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[CandleResponse]:
    """
    Retrieve historic OHLCV candles data.
    Automatically fetches external updates from AlphaVantage/yfinance on db miss.
    """
    candles = await MarketDataService.get_candles(db, pair, timeframe, limit)
    return candles


@router.get("/indicators", response_model=List[IndicatorResponse])
async def get_indicators(
    pair: str = Query(..., description="e.g. EUR/USD"),
    timeframe: str = Query("1h", description="e.g. 1h"),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[IndicatorResponse]:
    """
    Fetch calculated technical trend and momentum indicator lines (RSI, MA, ATR, Supertrend overlays).
    """
    indicators = await MarketDataService.get_indicators(db, pair, timeframe, limit)
    return indicators


@router.get("/calendar", response_model=List[CalendarEventResponse])
async def get_economic_calendar(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[CalendarEventResponse]:
    """
    Query current economic calendar schedule details (FOMC, NFP releases).
    """
    events = await MarketDataService.get_economic_calendar(db, limit)
    return events


@router.get("/news", response_model=List[NewsEventResponse])
async def get_news_events(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[NewsEventResponse]:
    """
    Retrieve current news stream sentiment tags and currency correlations.
    """
    news = await MarketDataService.get_news_events(db, limit)
    return news
