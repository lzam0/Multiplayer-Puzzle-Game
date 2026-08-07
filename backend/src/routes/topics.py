from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.controllers.topics import generate_words

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class TopicRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=50)

@router.post("/words")
@limiter.limit("100/day")
async def get_words(request: Request, body: TopicRequest):
    try:
        words = await generate_words(body.topic)
        return {"words": words}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
