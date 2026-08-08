# WebSocket Event Flow

## Full Round Sequence (two players)

```mermaid
sequenceDiagram
    actor Host
    participant S as Server
    actor A as Player A
    actor B as Player B

    Host->>S: join_room { playerName: "__host__" }
    S->>Host: room_joined { room }
    A->>S: join_room { playerName: "Alice" }
    S->>A: room_joined { room }
    S->>Host: player_joined { player: Alice }
    B->>S: join_room { playerName: "Bob" }
    S->>B: room_joined { room }
    S->>Host: player_joined { player: Bob }

    Note over Host: Host can kick a player before game starts
    Host->>S: kick_player { code, playerId }
    S->>Host: player_kicked { playerId, name }
    S->>A: player_kicked { playerId, name }
    S->>B: player_kicked { playerId, name }

    rect rgb(240, 248, 255)
        Note over Host,B: Round 1 — Preview (5s) ✓ Implemented
        Host->>S: start_game { code, topic }
        Note over S: generate_words(topic) via Groq
        Note over S: generate_grid(words)
        S->>Host: round_starting { round, board, previewMs, totalRounds }
        Note over A,B: Players receive nothing
    end

    rect rgb(240, 255, 240)
        Note over Host,B: Round 1 — Active ✓ Implemented
        S->>Host: round_active { round, board, endsAt, durationMs }
        S->>A: round_active { round, board, endsAt, durationMs }
        S->>B: round_active { round, board, endsAt, durationMs }
    end

    rect rgb(255, 240, 200)
        Note over Host,B: ⚠ Not yet implemented in Python backend
        A->>S: trace_word { word, letterIndices }
        S->>A: word_correct { word, score, remaining }

        B->>S: trace_word { word, letterIndices }
        S->>B: word_incorrect { word }

        Note over A: All words found
        S->>Host: player_finished { playerId, completionTimeMs }
        S->>A: player_finished { playerId, completionTimeMs }

        S->>Host: round_over { rankings, roundIndex, isLastRound }
        S->>A: round_over { rankings, roundIndex, isLastRound }
        S->>B: round_over { rankings, roundIndex, isLastRound }
    end

    Note over Host,B: Rounds 2 and 3 follow the same pattern

    rect rgb(255, 240, 200)
        Note over Host,B: ⚠ Not yet implemented in Python backend
        Host->>S: end_game { code }
        S->>Host: game_over { scores, podium }
        S->>A: game_over { scores, podium }
        S->>B: game_over { scores, podium }
    end
```

## Event Audiences

```mermaid
graph LR
    subgraph "Client → Server — Implemented ✓"
        JR[join_room]
        LR[leave_room]
        KP[kick_player]
        SG[start_game]
        NR[next_round]
    end

    subgraph "Client → Server — Pending ⏳"
        TW[trace_word]
        ER[end_round]
        EG[end_game]
        RB[reset_board]
    end

    subgraph "Server → Client — Implemented ✓"
        RJ[room_joined]:::joiner
        PJ[player_joined]:::allplayers
        PL[player_left]:::allplayers
        PK[player_kicked]:::allplayers
        RS[round_starting]:::hostonly
        RA[round_active]:::allplayers
        ERR[error]:::submitter
    end

    subgraph "Server → Client — Pending ⏳"
        WC[word_correct]:::submitter
        WI[word_incorrect]:::submitter
        PF[player_finished]:::hostandplayer
        RO[round_over]:::allplayers
        GO[game_over]:::allplayers
        BR[board_reset]:::submitter
    end

    classDef hostonly fill:#dbeafe,stroke:#3b82f6
    classDef allplayers fill:#dcfce7,stroke:#22c55e
    classDef submitter fill:#fef9c3,stroke:#eab308
    classDef hostandplayer fill:#fce7f3,stroke:#ec4899
    classDef joiner fill:#f3e8ff,stroke:#a855f7

    RS -.- HL["🖥️ Host only"]:::hostonly
    RA -.- AL["🌐 All (host + players)"]:::allplayers
    PJ -.- AL
    PL -.- AL
    PK -.- AL
    RO -.- AL
    GO -.- AL
    WC -.- SL["👤 Submitter only"]:::submitter
    WI -.- SL
    ERR -.- SL
    BR -.- SL
    PF -.- HL2["🖥️👤 Host + that player"]:::hostandplayer
    RJ -.- JL["🔌 Joiner only"]:::joiner
```
