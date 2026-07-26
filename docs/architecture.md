# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        HOST SCREEN                          │
│              (Big screen / browser at localhost:3000)       │
│   Shows: QR code, room code, lobby list, game board         │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    NESTJS BACKEND                           │
│                   localhost:3001                             │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  REST API   │  │  WS Gateway  │  │   Game Engine    │  │
│  │  /lobby     │  │  (Socket.io) │  │  (in-memory      │  │
│  │  /qr        │  │              │  │   state)         │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    PLAYER DEVICES                           │
│              (Mobile browsers at localhost:3000/play)       │
│   Shows: name entry, game board, word trace interface       │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### No Database
All game state is held in-memory on the NestJS server using a `Map<roomCode, GameRoom>`. When the server restarts, all rooms are cleared. This is intentional — games are short-lived local sessions.

### In-Memory Room State
Each room holds:
- Room code (4-digit string)
- Host socket ID
- List of connected players (name + socket ID)
- Current game state (idle / in-progress / finished)
- The letter grid and word list for the active puzzle
- Which words have been found and by whom

### Two Frontend Views
- **Host view** (`/host/[code]`) — designed for a large shared screen. Shows the QR code for joining, the lobby list, and the full game board once started.
- **Player view** (`/play/[code]`) — designed for mobile. Shows the letter grid and lets the player trace words.

### WebSocket-First
All real-time game events (player joins, word traced, word found, game over) go through Socket.io. The REST API is only used for room creation and QR code generation.

## Module Breakdown

```
backend/src/
├── lobby/
│   ├── lobby.module.ts
│   ├── lobby.service.ts      # Room creation, code generation, player management  ✓ Done
│   └── lobby.controller.ts   # POST /lobby, GET /lobby/:code                       ✓ Done
├── game/
│   ├── game.module.ts
│   ├── game.service.ts       # Grid generation, word validation, state machine     ✗ Stub (empty)
│   └── game.types.ts         # Room, Player, GameState interfaces                  ✓ Done
├── gateway/
│   ├── gateway.module.ts
│   └── game.gateway.ts       # WebSocket event handlers                            ~ Partial
│                             #   join_room ✓, start_game (partial), disconnect ✓
│                             #   trace_word ✗, leave_room ✗
├── topics/
│   ├── topics.module.ts
│   ├── topics.service.ts     # Loads and serves topic word lists                   ✗ Stub (empty)
│   └── topics.data.ts        # The actual topic definitions                        ✗ Not created yet
└── app.module.ts
```

## Current Backend Port

The backend listens on port **8888** (configurable via `PORT` env var).
