# Multiplayer Puzzle Game — WEND

A real-time multiplayer adaptation of LinkedIn's WEND word puzzle game. Players join a shared lobby from their mobile devices and collaborate (or compete) to solve a themed letter grid together.

## What is WEND?

WEND is a letter grid puzzle where players connect adjacent letters (horizontally or vertically) to form hidden words. Every letter on the board must be used exactly once, and words cannot overlap. The round ends when all words are found and the board is cleared.

In this multiplayer version, a host creates a room, selects a topic, and a themed letter grid is generated for the whole group to solve together in real time.

## How to Join a Game

- Navigate to the game URL on your mobile device
- Enter the **4-digit room code** shown on the host screen, or scan the **QR code**
- Enter your name and you're in

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS + Socket.io (WebSockets) |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Real-time | Socket.io (server + client) |
| State | In-memory (no database) |

## Project Structure

```
.
├── backend/       # NestJS API + WebSocket gateway
├── frontend/      # Next.js host + player UI
└── docs/          # Architecture, game design, and API docs
```

## Running Locally

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm run dev
```

Host view: `http://localhost:3333`
Backend: `http://localhost:8888`

## Implementation Status

| Area | Status | Notes |
|---|---|---|
| Room creation (REST) | Done | `POST /lobby`, `GET /lobby/:code` |
| Lobby WebSocket join/leave | Done | `join_room`, disconnect handling |
| Host view (QR + lobby + topic) | Done | `/host/[code]` |
| Player view (name entry + lobby) | Done | `/play/[code]` |
| `start_game` event | Partial | Emits `game_started` with topic; board generation not yet implemented |
| `trace_word` event | Not started | Backend handler missing; `GameService` is a stub |
| Board / grid generation | Not started | `GameService` is empty |
| Topic data | Not started | `TopicsService` is a stub; `topics.data.ts` does not exist yet |
| `word_correct` / `word_incorrect` | Not started | Depends on board generation |
| Scoreboard / `game_over` | UI ready | Frontend complete; backend event not yet emitted |

## Docs

See the [`docs/`](./docs/) folder for:
- Architecture overview
- WebSocket event reference
- Game design spec
- Topic format guide
