from fastapi import APIRouter
from src.controllers.health import get_health

router = APIRouter()

@router.get("/")
def health_check():
    return get_health()
