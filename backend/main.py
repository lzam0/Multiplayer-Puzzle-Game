from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import socketio
import os
import uvicorn
from dotenv import load_dotenv

from src.routes.health import router as health_router
from src.routes.topics import router as topics_router
from src.routes.board import router as board_router
from src.routes.lobby import router as lobby_router
from src.socket.events import register_events
from src.middleware.daily_cap import DailyCapMiddleware

# load environment variables from .env.dev
load_dotenv(".env.dev")

# per-IP rate limiter (injected into routes via state)
limiter = Limiter(key_func=get_remote_address)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# hard daily cap across all users — must be added after CORS
app.add_middleware(DailyCapMiddleware, daily_limit=10_000)

# register routes
app.include_router(health_router)
app.include_router(topics_router, prefix="/topics")
app.include_router(board_router, prefix="/board")
app.include_router(lobby_router, prefix="/lobby")

# register socket.io events
register_events(sio)

# mount socket.io alongside FastAPI
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    port = int(os.getenv("PORT"))
    host = os.getenv("HOST")
    uvicorn.run(socket_app, host=host, port=port)
