from src.socket.game_state import (
    rooms, sid_to_code,
    Player,
    HOST_SENTINEL,
)


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
