"""
Engine 1: Market Regime Detector
Identifies the primary market state (Trending, Sideways, Volatile, News-Driven)
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.models import Indicator, NewsEvent
from app.schemas.intelligence import RegimeType, RegimeResponse

logger = logging.getLogger("intelligence.regime_detector")

class MarketRegimeDetector:
    
    @classmethod
    async def detect_regime(cls, db: AsyncSession, pair: str, timeframe: str) -> RegimeResponse:
        """
        Detects the current market regime based on ADX (trend strength), 
        ATR (volatility), and recent News events.
        """
        # Fetch latest indicators
        q = select(Indicator).filter(
            Indicator.pair == pair,
            Indicator.timeframe == timeframe
        ).order_by(Indicator.candle_time.desc()).limit(1)
        
        res = await db.execute(q)
        indicator = res.scalars().first()
        
        adx = float(indicator.adx) if indicator and indicator.adx else 20.0
        atr = float(indicator.atr) if indicator and indicator.atr else 0.0010
        
        # Check for extreme news impacts in the last few hours
        news_q = select(NewsEvent).order_by(NewsEvent.published_at.desc()).limit(10)
        
        news_res = await db.execute(news_q)
        all_recent_news = list(news_res.scalars().all())
        
        # Filter in Python to avoid SQLAlchemy ARRAY.contains() dialect errors in SQLite
        pair_currencies = [pair[:3], pair[3:]]
        news_events = [
            n for n in all_recent_news 
            if any(c in n.affected_currencies for c in pair_currencies)
        ][:3]
        
        news_driven = any(n.impact.value in ('high', 'red') for n in news_events)
        
        regime = RegimeType.sideways
        severity = 0.5
        
        if news_driven:
            regime = RegimeType.news_driven
            severity = 0.95
        elif adx > 25:
            # Trending market
            # Simplistic direction check (can use MACD/EMA in production)
            trend_dir = "bull" if indicator and indicator.ema9 and indicator.ema21 and indicator.ema9 > indicator.ema21 else "bear"
            regime = RegimeType.trending_bull if trend_dir == "bull" else RegimeType.trending_bear
            severity = min(adx / 100.0, 0.9)
        elif atr > 0.0050: # Arbitrary high volatility threshold for FX
            regime = RegimeType.volatile
            severity = 0.8
        else:
            regime = RegimeType.sideways
            severity = max(0.1, 1 - (adx / 25.0))
            
        logger.debug("Regime detected for %s %s: %s (severity=%.2f)", pair, timeframe, regime, severity)
        
        return RegimeResponse(
            pair=pair,
            timeframe=timeframe,
            regime=regime,
            severity_score=round(severity, 2),
            adx_value=round(adx, 2),
            atr_value=round(atr, 4),
            news_impact=news_driven
        )
