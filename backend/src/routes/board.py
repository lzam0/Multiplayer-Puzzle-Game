import asyncio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.controllers.board import generate_grid

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class BoardRequest(BaseModel):
    words: list[str] = Field(min_length=1, max_length=10)


@router.post("/generate")
@limiter.limit("200/day")
async def get_board(request: Request, body: BoardRequest):
    try:
        grid = await asyncio.to_thread(generate_grid, body.words)
        return {
            "letters": grid.letters,
            "words": grid.words,
            "rows": grid.rows,
            "cols": grid.cols,
            "paths": grid.paths,
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
