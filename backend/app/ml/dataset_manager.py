import pandas as pd
import io
from datetime import timezone, datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.models import Candle, ImportedDataset, DataSource, Prediction, JournalEntry, OutcomeType

class DatasetManager:
    
    @staticmethod
    async def import_csv_dataset(
        db: AsyncSession,
        csv_content: str,
        pair: str,
        timeframe: str,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Parses market tick data from raw CSV strings, saves candle records, 
        and updates system log tracking imports.
        """
        df = pd.read_csv(io.StringIO(csv_content))
        
        # Standardize columns to lowercase and clean whitespaces
        df.columns = [col.lower().strip() for col in df.columns]
        
        # Date column locator
        date_col = None
        for possible in ["date", "time", "timestamp", "open_time"]:
            if possible in df.columns:
                date_col = possible
                break
                
        if not date_col:
            raise ValueError("CSV dataset must contain a timestamp column (e.g. date, time, timestamp).")
            
        # Standard price columns validation
        for col_name in ["open", "high", "low", "close"]:
            if col_name not in df.columns:
                # Try mappings suffix fallback
                if f"{col_name}_price" in df.columns:
                    df[col_name] = df[f"{col_name}_price"]
                else:
                    raise ValueError(f"CSV dataset must contain '{col_name}' price column.")
                    
        if "volume" not in df.columns:
            df["volume"] = 0.0

        df[date_col] = pd.to_datetime(df[date_col])
        df = df.sort_values(date_col).reset_index(drop=True)
        
        row_count = 0
        min_date = df[date_col].min()
        max_date = df[date_col].max()
        
        for _, row in df.iterrows():
            # Seed candles directly
            candle = Candle(
                pair=pair,
                timeframe=timeframe,
                open_time=row[date_col].to_pydatetime(),
                open_price=float(row["open"]),
                high_price=float(row["high"]),
                low_price=float(row["low"]),
                close_price=float(row["close"]),
                volume=float(row["volume"]),
                source=DataSource.manual
            )
            db.add(candle)
            row_count += 1
            
        import_log = ImportedDataset(
            pair=pair,
            timeframe=timeframe,
            row_count=row_count,
            start_time=min_date.to_pydatetime(),
            end_time=max_date.to_pydatetime(),
            imported_by=user_id
        )
        db.add(import_log)
        await db.commit()
        
        return {
            "row_count": row_count,
            "start_time": min_date,
            "end_time": max_date,
            "pair": pair,
            "timeframe": timeframe
        }

    @staticmethod
    async def assemble_training_dataset(
        db: AsyncSession,
        pair: str,
        timeframe: str
    ) -> pd.DataFrame:
        """
        Collects prediction items matched with outcome results in the journal log,
        generating tabular learning dataframes.
        """
        query = select(Prediction, JournalEntry).join(
            JournalEntry, Prediction.id == JournalEntry.prediction_id
        ).filter(
            Prediction.pair == pair,
            Prediction.timeframe == timeframe
        )
        res = await db.execute(query)
        rows = res.all()
        
        data = []
        for pred, journal in rows:
            features = pred.indicator_signals
            if not features:
                continue
                
            # Classify directional targets (win = 1, loss = 0)
            target = None
            if journal.outcome == OutcomeType.win:
                target = 1
            elif journal.outcome == OutcomeType.loss:
                target = 0
                
            if target is not None:
                record = {
                    "rsi": float(features.get("rsi", 50.0)),
                    "macd_histogram": float(features.get("macd_histogram", 0.0)),
                    "ema_200_dist": float(pred.entry_price - features.get("ema_200", pred.entry_price)),
                    "confidence": float(pred.confidence_value),
                    "target": target
                }
                data.append(record)
                
        return pd.DataFrame(data)
