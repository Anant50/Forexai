from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.market_data import router as market_data_router
from app.api.v1.prediction import router as prediction_router
from app.api.v1.journal import router as journal_router
from app.api.v1.admin import router as admin_router
from app.api.v1.vision import router as vision_router
from app.api.v1.knowledge import router as knowledge_router
from app.api.v1.intelligence import router as intelligence_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(market_data_router)
api_router.include_router(prediction_router)
api_router.include_router(journal_router)
api_router.include_router(admin_router)
api_router.include_router(vision_router)
api_router.include_router(knowledge_router)
api_router.include_router(intelligence_router)

