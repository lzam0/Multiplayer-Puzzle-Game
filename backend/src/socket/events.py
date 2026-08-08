import asyncio
import time as time_mod

from src.socket.game_state import (
    rooms, sid_to_code,
    Player, RoundState, PlayerRoundState,
    HOST_SENTINEL, PREVIEW_MS, ROUND_DURATION_MS, TOTAL_ROUNDS,
)
from src.controllers.topics import generate_words
from src.controllers.board import generate_grid


def _player_to_dict(player: Player) -> dict:
    return {
        "id": player.id,
        "name": player.name,
        "totalTimeMs": player.total_time_ms,
        "roundsCounted": player.rounds_counted,
    }


def _room_to_dict(room) -> dict:
    current_round = None
    if room.rounds:
        r = room.rounds[-1]
        current_round = {
            "index": r.index,
            "topicId": r.topic,
            "board": _grid_to_dict(r.board) if r.board else None,
            "phase": r.phase,
            "goLiveAt": r.go_live_at,
            "endsAt": r.ends_at,
        }
    return {
        "code": room.code,
        "hostId": room.host_id,
        "players": [_player_to_dict(p) for p in room.players.values()],
        "status": room.status,
        "currentRound": current_round,
        "roundNumber": len(room.rounds),
    }


def _grid_to_dict(board) -> dict:
    return {
        "letters": board.letters,
        "words": board.words,
        "rows": board.rows,
        "cols": board.cols,
        "paths": board.paths,
    }


async def _round_timer(sio, code: str, round_index: int):
    await asyncio.sleep(ROUND_DURATION_MS / 1000)
    # Phase 4 will handle expiry — stub for now
    print(f"[timer] round {round_index} expired for room {code}")


async def _start_round(sio, code: str, topic: str, round_index: int):
    room = rooms.get(code)
    if not room:
        return

    try:
        words = await generate_words(topic)
        board = await asyncio.to_thread(generate_grid, words)
    except Exception as e:
        room.status = "waiting"
        await sio.emit("error", {"message": str(e)}, to=room.host_id)
        return

    round_state = RoundState(index=round_index, topic=topic, board=board, phase="preview")
    room.rounds.append(round_state)

    await sio.emit("round_starting", {
        "round": round_index,
        "topic": topic,
        "board": _grid_to_dict(board),
        "previewMs": PREVIEW_MS,
        "totalRounds": TOTAL_ROUNDS,
    }, to=room.host_id)

    await asyncio.sleep(PREVIEW_MS / 1000)

    room = rooms.get(code)
    if not room or not room.rounds or room.rounds[-1].index != round_index:
        return

    now_ms = time_mod.time() * 1000
    ends_at_ms = now_ms + ROUND_DURATION_MS
    round_state.go_live_at = now_ms
    round_state.ends_at = ends_at_ms
    round_state.phase = "active"

    for sid in room.players:
        round_state.player_states[sid] = PlayerRoundState()

    await sio.emit("round_active", {
        "round": round_index,
        "topic": topic,
        "board": _grid_to_dict(board),
        "endsAt": ends_at_ms,
        "durationMs": ROUND_DURATION_MS,
    }, room=code)

    round_state.timer_task = asyncio.create_task(
        _round_timer(sio, code, round_index)
    )


def register_events(sio):

    @sio.event
    async def connect(sid, environ):
        print(f"[connect] {sid}")

    @sio.event
    async def disconnect(sid):
        print(f"[disconnect] {sid}")
        code = sid_to_code.pop(sid, None)
        if not code:
            return
        room = rooms.get(code)
        if not room:
            return
        if sid in room.players:
            room.players.pop(sid)
            await sio.emit("player_left", {"playerId": sid}, room=code)

    @sio.on("join_room")
    async def on_join_room(sid, data):
        code = data.get("code", "").upper()
        player_name = data.get("playerName", "").strip()

        room = rooms.get(code)
        if not room:
            await sio.emit("error", {"message": "Room not found"}, to=sid)
            return

        if player_name == HOST_SENTINEL:
            room.host_id = sid
            sid_to_code[sid] = code
            await sio.enter_room(sid, code)
            await sio.emit("room_joined", {"room": _room_to_dict(room)}, to=sid)
            return

        if not player_name or len(player_name) > 20:
            await sio.emit("error", {"message": "Invalid player name"}, to=sid)
            return

        player = Player(id=sid, name=player_name)
        room.players[sid] = player
        sid_to_code[sid] = code
        await sio.enter_room(sid, code)

        await sio.emit("room_joined", {"room": _room_to_dict(room)}, to=sid)
        await sio.emit("player_joined", {"player": _player_to_dict(player)}, room=code, skip_sid=sid)

    @sio.on("leave_room")
    async def on_leave_room(sid, data):
        code = data.get("code", "").upper()
        room = rooms.get(code)
        if not room:
            return
        if sid in room.players:
            room.players.pop(sid)
            await sio.emit("player_left", {"playerId": sid}, room=code)
        await sio.leave_room(sid, code)
        sid_to_code.pop(sid, None)

    @sio.on("kick_player")
    async def on_kick_player(sid, data):
        code = data.get("code", "").upper()
        player_id = data.get("playerId", "")

        room = rooms.get(code)
        if not room or room.host_id != sid:
            return

        player = room.players.pop(player_id, None)
        if not player:
            return

        await sio.emit(
            "player_kicked",
            {"playerId": player_id, "name": player.name},
            room=code,
        )
        await sio.leave_room(player_id, code)
        sid_to_code.pop(player_id, None)

    @sio.on("start_game")
    async def on_start_game(sid, data):
        code = data.get("code", "").upper()
        topic = data.get("topic", "").strip()

        room = rooms.get(code)
        if not room:
            await sio.emit("error", {"message": "Room not found"}, to=sid)
            return
        if room.host_id != sid:
            await sio.emit("error", {"message": "Not the host"}, to=sid)
            return
        if room.status != "waiting":
            await sio.emit("error", {"message": "Game already started"}, to=sid)
            return
        if not room.players:
            await sio.emit("error", {"message": "No players in room"}, to=sid)
            return
        if not topic:
            await sio.emit("error", {"message": "Topic required"}, to=sid)
            return

        room.status = "in_progress"
        asyncio.create_task(_start_round(sio, code, topic, 0))

    @sio.on("next_round")
    async def on_next_round(sid, data):
        code = data.get("code", "").upper()
        topic = data.get("topic", "").strip()

        room = rooms.get(code)
        if not room:
            await sio.emit("error", {"message": "Room not found"}, to=sid)
            return
        if room.host_id != sid:
            await sio.emit("error", {"message": "Not the host"}, to=sid)
            return
        if not room.rounds or room.rounds[-1].phase != "ended":
            await sio.emit("error", {"message": "Current round still in progress"}, to=sid)
            return

        next_index = room.rounds[-1].index + 1
        if next_index >= TOTAL_ROUNDS:
            await sio.emit("error", {"message": "All rounds complete"}, to=sid)
            return
        if not topic:
            await sio.emit("error", {"message": "Topic required"}, to=sid)
            return

        asyncio.create_task(_start_round(sio, code, topic, next_index))
