import pandas as pd
import numpy as np
from typing import List, Dict, Any

from app.models.models import Candle, Indicator


class FeatureEngineer:
    """
    Computes technical indicator overlays, trends, momentum, and pattern indexes
    from raw time series OHLCV candlesticks.
    """

    @staticmethod
    def candles_to_dataframe(candles: List[Candle]) -> pd.DataFrame:
        """Helper to convert ORM entities list to pandas DataFrame."""
        data = []
        for c in candles:
            data.append({
                "open_time": c.open_time,
                "open": float(c.open_price) if c.open_price is not None else 0.0,
                "high": float(c.high_price) if c.high_price is not None else 0.0,
                "low": float(c.low_price) if c.low_price is not None else 0.0,
                "close": float(c.close_price) if c.close_price is not None else 0.0,
                "volume": float(c.volume) if c.volume is not None else 0.0
            })
        df = pd.DataFrame(data)
        if not df.empty:
            df["open_time"] = pd.to_datetime(df["open_time"], utc=True)
            df = df.sort_values("open_time").reset_index(drop=True)
        return df

    @classmethod
    def compute_all_features(cls, candles: List[Candle]) -> pd.DataFrame:
        """
        Calculates indicators (RSI, MACD, Moving Averages, ATR, Bollinger Bands).
        """
        df = cls.candles_to_dataframe(candles)
        if df.empty or len(df) < 200: # Need at least 200 points for longer moving averages (EMA200)
            return df

        # 1. Simple and Exponential Moving Averages
        df["sma_20"] = df["close"].rolling(window=20).mean()
        df["sma_50"] = df["close"].rolling(window=50).mean()
        df["sma_200"] = df["close"].rolling(window=200).mean()

        df["ema_9"] = df["close"].ewm(span=9, adjust=False).mean()
        df["ema_21"] = df["close"].ewm(span=21, adjust=False).mean()
        df["ema_50"] = df["close"].ewm(span=50, adjust=False).mean()
        df["ema_200"] = df["close"].ewm(span=200, adjust=False).mean()

        # 2. RSI (Relative Strength Index)
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / (loss + 1e-10)
        df["rsi"] = 100 - (100 / (1 + rs))

        # 3. MACD (Moving Average Convergence Divergence)
        ema_12 = df["close"].ewm(span=12, adjust=False).mean()
        ema_26 = df["close"].ewm(span=26, adjust=False).mean()
        df["macd"] = ema_12 - ema_26
        df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
        df["macd_histogram"] = df["macd"] - df["macd_signal"]

        # 4. Bollinger Bands
        std_20 = df["close"].rolling(window=20).std()
        df["bb_middle"] = df["sma_20"]
        df["bb_upper"] = df["bb_middle"] + (std_20 * 2)
        df["bb_lower"] = df["bb_middle"] - (std_20 * 2)

        # 5. ATR (Average True Range)
        high_low = df["high"] - df["low"]
        high_close = (df["high"] - df["close"].shift()).abs()
        low_close = (df["low"] - df["close"].shift()).abs()
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        df["atr"] = true_range.rolling(window=14).mean()

        # Fill NaNs with backfill/forwardfill
        df = df.bfill().ffill()

        # 6. Pattern classifications heuristics
        df["is_bullish_engulfing"] = (
            (df["close"] > df["open"]) &
            (df["close"].shift() < df["open"].shift()) &
            (df["close"] >= df["open"].shift()) &
            (df["open"] <= df["close"].shift())
        ).astype(int)

        return df

    @classmethod
    def generate_indicators_orm(cls, pair: str, timeframe: str, candles: List[Candle]) -> List[Indicator]:
        """Runs computations and converts output dataframes back to Indicator ORM models."""
        df = cls.compute_all_features(candles)
        indicators = []
        
        for idxMsg, row in df.iterrows():
            ind = Indicator(
                pair=pair,
                timeframe=timeframe,
                candle_time=row["open_time"],
                rsi=float(row["rsi"]) if "rsi" in row else 50.0,
                macd=float(row["macd"]) if "macd" in row else 0.0,
                macd_signal=float(row["macd_signal"]) if "macd_signal" in row else 0.0,
                macd_histogram=float(row["macd_histogram"]) if "macd_histogram" in row else 0.0,
                ema9=float(row["ema_9"]) if "ema_9" in row else row["close"],
                ema21=float(row["ema_21"]) if "ema_21" in row else row["close"],
                ema50=float(row["ema_50"]) if "ema_50" in row else row["close"],
                ema200=float(row["ema_200"]) if "ema_200" in row else row["close"],
                sma20=float(row["sma_20"]) if "sma_20" in row else row["close"],
                sma50=float(row["sma_50"]) if "sma_50" in row else row["close"],
                sma200=float(row["sma_200"]) if "sma_200" in row else row["close"],
                atr=float(row["atr"]) if "atr" in row else 0.0015,
                bb_upper=float(row["bb_upper"]) if "bb_upper" in row else row["close"],
                bb_middle=float(row["bb_middle"]) if "bb_middle" in row else row["close"],
                bb_lower=float(row["bb_lower"]) if "bb_lower" in row else row["close"],
                computed_at=row["open_time"]
            )
            indicators.append(ind)
        return indicators
