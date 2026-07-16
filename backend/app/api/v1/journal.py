from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.journal import JournalEntryResponse, JournalEntryCreate, JournalEntryUpdate, PerformanceSummary
from app.services.journal_service import JournalService
from app.models.models import User

router = APIRouter(prefix="/journal", tags=["Trading Journal"])


@router.post("/entries", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    entry_in: JournalEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> JournalEntryResponse:
    """
    Log a trading position or forecast recommendation to user's journal database.
    """
    entry = await JournalService.create_entry(db, current_user.id, entry_in)
    return entry


@router.get("/entries", response_model=List[JournalEntryResponse])
async def list_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[JournalEntryResponse]:
    """
    Retrieve user journal logs history list (paginated).
    """
    entries = await JournalService.list_entries(db, current_user.id, skip, limit)
    return entries


@router.get("/entries/{id}", response_model=JournalEntryResponse)
async def get_entry_details(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> JournalEntryResponse:
    """
    Retrieve specific trade journal record parameters.
    """
    entry = await JournalService.get_entry_by_id(db, current_user.id, id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )
    return entry


@router.put("/entries/{id}", response_model=JournalEntryResponse)
async def update_entry(
    id: str,
    update_in: JournalEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> JournalEntryResponse:
    """
    Update notes, exit targets, and outcome states on active trade journal records.
    """
    entry = await JournalService.update_entry(db, current_user.id, id, update_in)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )
    return entry


@router.delete("/entries/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """
    Delete specific entry records permanently from user DB store logs.
    """
    success = await JournalService.delete_entry(db, current_user.id, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal entry not found"
        )
    return


@router.get("/performance", response_model=PerformanceSummary)
async def get_performance_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> PerformanceSummary:
    """
    Computes aggregates metrics for User trading profile dashboards (Drawdowns, Profit factors, Win rates).
    """
    summary = await JournalService.calculate_summary(db, current_user.id)
    return summary
