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


def _validate_trace(board, word: str, letter_indices: list[int]) -> bool:
    if not letter_indices:
        return False
    if len(set(letter_indices)) != len(letter_indices):
        return False
    traced = ""
    for idx in letter_indices:
        r, c = divmod(idx, board.cols)
        if r < 0 or r >= board.rows or c < 0 or c >= board.cols:
            return False
        traced += board.letters[r][c]
    if traced != word:
        return False
    for i in range(len(letter_indices) - 1):
        r1, c1 = divmod(letter_indices[i], board.cols)
        r2, c2 = divmod(letter_indices[i + 1], board.cols)
        if abs(r1 - r2) + abs(c1 - c2) != 1:
            return False
    return True


def _compute_rankings(room) -> list[dict]:
    round_state = room.rounds[-1]
    go_live_at = round_state.go_live_at or 0
    rankings = []
    for sid, player in room.players.items():
        prs = round_state.player_states.get(sid)
        completed_at = prs.completed_at if prs else None
        completion_time_ms = (completed_at - go_live_at) if completed_at is not None else None
        words_found = len(prs.found_words) if prs else 0
        charged_ms = completion_time_ms if completion_time_ms is not None else (ROUND_DURATION_MS + 30_000)
        rankings.append({
            "playerId": sid,
            "name": player.name,
            "completionTimeMs": completion_time_ms,
            "wordsFound": words_found,
            "chargedMs": charged_ms,
        })
    finishers = sorted([r for r in rankings if r["completionTimeMs"] is not None], key=lambda r: r["completionTimeMs"])
    non_finishers = sorted([r for r in rankings if r["completionTimeMs"] is None], key=lambda r: -r["wordsFound"])
    ranked = finishers + non_finishers
    for i, r in enumerate(ranked):
        r["rank"] = i + 1
    return ranked


async def _end_round(sio, code: str):
    room = rooms.get(code)
    if not room or not room.rounds:
        return
    round_state = room.rounds[-1]
    if round_state.phase == "ended":
        return
    round_state.phase = "ended"
    if round_state.timer_task:
        round_state.timer_task.cancel()
        round_state.timer_task = None

    rankings = _compute_rankings(room)
    is_last_round = round_state.index >= TOTAL_ROUNDS - 1

    await sio.emit("round_over", {
        "rankings": rankings,
        "roundIndex": round_state.index,
        "isLastRound": is_last_round,
    }, room=code)


async def _round_timer(sio, code: str, round_index: int):
    await asyncio.sleep(ROUND_DURATION_MS / 1000)
    room = rooms.get(code)
    if not room or not room.rounds:
        return
    if room.rounds[-1].index != round_index or room.rounds[-1].phase == "ended":
        return
    await _end_round(sio, code)


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

    @sio.on("trace_word")
    async def on_trace_word(sid, data):
        code = data.get("code", "").upper()
        word = data.get("word", "").upper().strip()
        letter_indices = data.get("letterIndices", [])

        room = rooms.get(code)
        if not room or not room.rounds:
            return

        round_state = room.rounds[-1]
        if round_state.phase != "active":
            return

        player = room.players.get(sid)
        if not player:
            return

        prs = round_state.player_states.get(sid)
        if not prs:
            return

        if word in prs.found_words:
            await sio.emit("word_incorrect", {"word": word, "playerId": sid}, to=sid)
            return

        if word not in round_state.board.words or not _validate_trace(round_state.board, word, letter_indices):
            await sio.emit("word_incorrect", {"word": word, "playerId": sid}, to=sid)
            return

        prs.found_words.add(word)
        remaining = len(round_state.board.words) - len(prs.found_words)

        await sio.emit("word_correct", {
            "word": word,
            "foundBy": sid,
            "score": len(prs.found_words),
            "remaining": remaining,
        }, to=sid)

        if remaining == 0:
            now_ms = time_mod.time() * 1000
            prs.completed_at = now_ms
            completion_time_ms = now_ms - (round_state.go_live_at or now_ms)

            finished_payload = {
                "playerId": sid,
                "name": player.name,
                "completionTimeMs": completion_time_ms,
            }
            await sio.emit("player_finished", finished_payload, to=room.host_id)
            await sio.emit("player_finished", finished_payload, to=sid)

            all_finished = all(
                round_state.player_states.get(psid) and
                round_state.player_states[psid].completed_at is not None
                for psid in room.players
            )
            if all_finished:
                await _end_round(sio, code)

    @sio.on("end_round")
    async def on_end_round(sid, data):
        code = data.get("code", "").upper()
        room = rooms.get(code)
        if not room or room.host_id != sid:
            return
        if not room.rounds or room.rounds[-1].phase != "active":
            return
        await _end_round(sio, code)

    @sio.on("reset_board")
    async def on_reset_board(sid, data):
        code = data.get("code", "").upper()
        await sio.emit("board_reset", {"code": code}, to=sid)
