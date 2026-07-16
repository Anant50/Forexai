from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from datetime import timezone, datetime

from app.models.models import JournalEntry, OutcomeType
from app.schemas.journal import JournalEntryCreate, JournalEntryUpdate, PerformanceSummary


class JournalService:

    @staticmethod
    async def create_entry(
        db: AsyncSession, user_id: str, entry_in: JournalEntryCreate
    ) -> JournalEntry:
        """Create new trading journal logs details."""
        risk_reward = None
        if entry_in.take_profit and entry_in.stop_loss:
            risk_reward = abs(entry_in.take_profit - entry_in.entry_price) / abs(entry_in.entry_price - entry_in.stop_loss)

        entry = JournalEntry(
            user_id=user_id,
            prediction_id=entry_in.prediction_id,
            pair=entry_in.pair,
            direction=entry_in.direction,
            entry_price=entry_in.entry_price,
            stop_loss=entry_in.stop_loss,
            take_profit=entry_in.take_profit,
            position_size_lots=entry_in.position_size_lots,
            risk_reward=risk_reward or entry_in.risk_reward,
            confidence_at_entry=entry_in.confidence_at_entry,
            ai_suggested=entry_in.ai_suggested,
            trade_taken=entry_in.trade_taken,
            actual_entry_price=entry_in.actual_entry_price,
            actual_exit_price=entry_in.actual_exit_price,
            actual_pnl=entry_in.actual_pnl,
            outcome=entry_in.outcome,
            tags=entry_in.tags,
            notes=entry_in.notes,
            screenshot_url=entry_in.screenshot_url,
            trade_date=entry_in.trade_date or datetime.now(timezone.utc)
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def list_entries(
        db: AsyncSession, user_id: str, skip: int = 0, limit: int = 50
    ) -> List[JournalEntry]:
        """Fetch list of user journal logs."""
        query = select(JournalEntry).filter(JournalEntry.user_id == user_id).order_by(JournalEntry.created_at.desc()).offset(skip).limit(limit)
        res = await db.execute(query)
        return list(res.scalars().all())

    @staticmethod
    async def get_entry_by_id(
        db: AsyncSession, user_id: str, entry_id: str
    ) -> Optional[JournalEntry]:
        """Fetch single journal log details."""
        query = select(JournalEntry).filter(JournalEntry.id == entry_id, JournalEntry.user_id == user_id)
        res = await db.execute(query)
        return res.scalars().first()

    @staticmethod
    async def update_entry(
        db: AsyncSession, user_id: str, entry_id: str, update_in: JournalEntryUpdate
    ) -> Optional[JournalEntry]:
        """Modify fields in active journal entry."""
        entry = await JournalService.get_entry_by_id(db, user_id, entry_id)
        if not entry:
            return None

        update_dict = update_in.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(entry, key, val)

        entry_price_val = entry.actual_entry_price or entry.entry_price
        if entry_price_val and entry.actual_exit_price and not entry.actual_pnl:
            # Simple simulation of pnl calculations based on standard pip targets
            dir_factor = 1.0 if entry.direction == "long" else -1.0
            entry.actual_pnl = (float(entry.actual_exit_price) - float(entry_price_val)) * dir_factor * 1000  # standard conversion multiplier mock

        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry

    @staticmethod
    async def delete_entry(
        db: AsyncSession, user_id: str, entry_id: str
    ) -> bool:
        """Remove journal logs from the system database."""
        entry = await JournalService.get_entry_by_id(db, user_id, entry_id)
        if not entry:
            return False
        await db.delete(entry)
        await db.commit()
        return True

    @staticmethod
    async def calculate_summary(
        db: AsyncSession, user_id: str
    ) -> PerformanceSummary:
        """Calculate complete statistics summaries for User trading profile dashboards."""
        query = select(JournalEntry).filter(JournalEntry.user_id == user_id)
        res = await db.execute(query)
        entries = list(res.scalars().all())

        total = len(entries)
        if total == 0:
            return PerformanceSummary(
                total_trades=0, win_rate=0.0, profit_factor=0.0, total_pnl=0.0,
                wins=0, losses=0, breakeven=0, open_trades=0, average_win=0.0,
                average_loss=0.0, max_drawdown=0.0, expectancy=0.0
            )

        wins = [e for e in entries if e.outcome == OutcomeType.win]
        losses = [e for e in entries if e.outcome == OutcomeType.loss]
        breakevens = [e for e in entries if e.outcome == OutcomeType.breakeven]
        opens = [e for e in entries if e.outcome == OutcomeType.open]

        total_pnl = float(sum((e.actual_pnl or 0.0) for e in entries))
        win_count = len(wins)
        loss_count = len(losses)
        
        win_rate = win_count / (win_count + loss_count) if (win_count + loss_count) > 0 else 0.0

        pnl_wins = float(sum((e.actual_pnl or 0.0) for e in wins))
        pnl_losses = float(abs(sum((e.actual_pnl or 0.0) for e in losses)))
        
        profit_factor = pnl_wins / pnl_losses if pnl_losses > 0 else 1.0 if pnl_wins > 0 else 0.0
        
        avg_win = pnl_wins / win_count if win_count > 0 else 0.0
        avg_loss = pnl_losses / loss_count if loss_count > 0 else 0.0

        # Drawdown estimator mockup
        max_drawdown = -0.045 # Default standard mock 4.5% drawdown

        # expectancy = (WinRate * AvgWin) - (LossRate * AvgLoss)
        loss_rate = 1.0 - win_rate
        expectancy = (win_rate * avg_win) - (loss_rate * avg_loss)

        return PerformanceSummary(
            total_trades=total,
            win_rate=win_rate,
            profit_factor=profit_factor,
            total_pnl=total_pnl,
            wins=win_count,
            losses=loss_count,
            breakeven=len(breakevens),
            open_trades=len(opens),
            average_win=avg_win,
            average_loss=avg_loss,
            max_drawdown=max_drawdown,
            expectancy=expectancy
        )
