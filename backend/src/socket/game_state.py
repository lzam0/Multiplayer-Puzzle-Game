import asyncio
import random
import string
from dataclasses import dataclass, field
from typing import Optional

HOST_SENTINEL = "__host__"
PREVIEW_MS = 5_000
ROUND_DURATION_MS = 90_000
PENALTY_MS = 30_000
TOTAL_ROUNDS = 3


@dataclass
class PlayerRoundState:
    found_words: set = field(default_factory=set)
    completed_at: Optional[float] = None  # epoch ms


@dataclass
class RoundState:
    index: int
    topic: str
    board: object  # LetterGrid
    go_live_at: Optional[float] = None
    ends_at: Optional[float] = None
    player_states: dict = field(default_factory=dict)  # sid → PlayerRoundState
    timer_task: Optional[asyncio.Task] = None
    phase: str = "preview"  # preview | active | ended


@dataclass
class Player:
    id: str
    name: str
    total_time_ms: float = 0.0
    rounds_counted: int = 0


@dataclass
class Room:
    code: str
    host_id: str = "pending"
    players: dict = field(default_factory=dict)  # sid → Player (non-host only)
    status: str = "waiting"  # waiting | in_progress | finished
    rounds: list = field(default_factory=list)  # list[RoundState]


rooms: dict[str, Room] = {}
sid_to_code: dict[str, str] = {}


def make_code() -> str:
    for _ in range(100):
        code = "".join(random.choices(string.ascii_uppercase, k=4))
        if code not in rooms:
            return code
    raise RuntimeError("Could not generate unique room code")
