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

Host view: `http://localhost:3000`
Backend: `http://localhost:3001`

## Docs

See the [`docs/`](./docs/) folder for:
- Architecture overview
- WebSocket event reference
- Game design spec
- Topic format guide
