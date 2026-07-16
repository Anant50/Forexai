from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.deps import get_current_admin
from app.schemas.admin import (
    ModelVersionResponse, ModelApproveRequest, 
    AuditLogResponse, NotificationSendRequest, SystemMetricsSummary,
    ModelImportDatasetResponse, ModelRetrainRequest
)
from app.services.admin_service import AdminService
from app.models.models import User

router = APIRouter(prefix="/admin", tags=["Platform Administration"])


@router.get("/models", response_model=List[ModelVersionResponse])
async def list_model_versions(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> List[ModelVersionResponse]:
    """
    List all ML models registered inside registry catalog (training, approved, active).
    """
    return await AdminService.get_models(db)


@router.post("/models/{id}/approve", response_model=ModelVersionResponse)
async def approve_model_version(
    id: str,
    approve_in: ModelApproveRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> ModelVersionResponse:
    """
    Update model version review status to approved or rejected based on validation thresholds.
    """
    model = await AdminService.approve_model(db, id, admin.id, approve_in)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    return model


@router.post("/models/{id}/deploy", response_model=ModelVersionResponse)
async def deploy_model_version(
    id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> ModelVersionResponse:
    """
    Promote model version to production 'active' status and auto-archve legacy versions.
    """
    model = await AdminService.deploy_model(db, id, admin.id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version missing or has not passed review approval"
        )
    return model


@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> List[AuditLogResponse]:
    """
    Fetch platform administration tracking logs.
    """
    return await AdminService.list_audit_logs(db, limit)


@router.post("/notifications/broadcast", status_code=status.HTTP_201_CREATED)
async def broadcast_alerts(
    alert_in: NotificationSendRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> dict:
    """
    Broadcast system warnings, forecast announcements, or maintenance notices across active traders.
    """
    await AdminService.broadcast_notification(db, alert_in)
    return {"detail": f"Notification successfully broadcasted to active users"}


@router.get("/metrics", response_model=SystemMetricsSummary)
async def get_system_metrics(
    admin: User = Depends(get_current_admin)
) -> SystemMetricsSummary:
    """
    Diagnose active CPU, memory, database pool, and connection limits metrics logs.
    """
    return await AdminService.get_system_metrics()


@router.post("/models/import-dataset", response_model=ModelImportDatasetResponse, status_code=status.HTTP_201_CREATED)
async def import_dataset_csv(
    file: UploadFile = File(...),
    pair: str = Form(...),
    timeframe: str = Form(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> ModelImportDatasetResponse:
    """
    Administrative upload of manual historical candle data in CSV format.
    """
    content = await file.read()
    csv_str = content.decode("utf-8")
    
    from app.ml.dataset_manager import DatasetManager
    try:
        result = await DatasetManager.import_csv_dataset(
            db=db,
            csv_content=csv_str,
            pair=pair,
            timeframe=timeframe,
            user_id=admin.id
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse or save imported CSV file: {str(e)}"
        )


@router.post("/models/retrain", response_model=ModelVersionResponse, status_code=status.HTTP_201_CREATED)
async def retrain_model(
    payload: ModelRetrainRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> ModelVersionResponse:
    """
    Triggers an administrative on-demand model retraining cycle.
    """
    from app.ml.trainer import ModelTrainer
    trainer = ModelTrainer(db)
    try:
        model = await trainer.retrain_on_demand(
            pair=payload.pair,
            timeframe=payload.timeframe,
            version_tag=payload.version_tag,
            hyperparameters=payload.hyperparameters
        )
        return model
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"On-demand training pipeline execution failed: {str(e)}"
        )


@router.post("/models/{id}/rollback", response_model=ModelVersionResponse)
async def rollback_model(
    id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
) -> ModelVersionResponse:
    """
    Performs administrative rollback to replace the active production model tag with a historical version.
    """
    model = await AdminService.rollback_model(db, id, admin.id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version registry record not found"
        )
    return model
