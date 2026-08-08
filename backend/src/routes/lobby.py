from fastapi import APIRouter, HTTPException
from src.socket.game_state import rooms, make_code, Room

router = APIRouter()


@router.post("")
async def create_room():
    code = make_code()
    rooms[code] = Room(code=code)
    return {"code": code}


@router.get("/{code}")
async def get_room(code: str):
    room = rooms.get(code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {
        "code": room.code,
        "playerCount": len(room.players),
        "status": room.status,
    }
