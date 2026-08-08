# Game Flow — State Machine

## Host Phase Machine

```mermaid
stateDiagram-v2
    [*] --> Lobby: room created

    Lobby --> Preview: host emits start_game\n(round_starting → host only)
    Preview --> Active: server asyncio.sleep 5s\n(round_active → all)
    Active --> RoundResult: all finish / host end_round / 90s timer\n(round_over → all)\n⚠ end_round / round_over not yet implemented
    RoundResult --> Preview: host emits next_round\n(rounds 2 and 3)
    RoundResult --> Podium: host emits end_game\nafter round 3\n(game_over → all)\n⚠ end_game / game_over not yet implemented
    Podium --> [*]

    Preview: Preview (5s)\nHost sees board\nPlayers see nothing
    Active: Active (≤90s)\nHost: reference board + timer + finish tracker\nPlayers: interactive board
    RoundResult: Round Result\nRankings shown\nHost picks next topic
    Podium: Final Podium\nRanked by lowest total time
```

## Player Phase Machine

```mermaid
stateDiagram-v2
    [*] --> NameEntry
    NameEntry --> Lobby: join_room

    Lobby --> GetReady: round_starting (host preview)\n"Get ready…" — no board
    GetReady --> Solving: round_active\nboard appears on phone
    Solving --> Done: all words found\n(auto-submit)\n⚠ trace_word not yet implemented
    Solving --> Done: round_over (timer / host end)
    Done --> RoundResult: round_over
    RoundResult --> GetReady: next round starts
    RoundResult --> Podium: game_over
    Podium --> [*]

    GetReady: Get Ready\nTopic shown · no board
    Solving: Solving\nInteractive board\nWordCounter progress panel
    Done: Done\n"Waiting for others…"
```

Note: A player can also be kicked from the lobby before the game starts. The kicked player's client detects `player_kicked` with `playerId === socket.id` and redirects home.

## Solo Mode Phase Machine

```mermaid
stateDiagram-v2
    [*] --> TopicEntry

    TopicEntry --> Loading1: submit topic
    Loading1 --> WordsPreview: POST /topics/words succeeds\n6 words returned
    Loading1 --> TopicEntry: error (Groq or validation failed)\nerror message shown
    WordsPreview --> Loading2: player confirms words
    WordsPreview --> TopicEntry: player goes back
    Loading2 --> Playing: POST /board/generate succeeds\nboard returned
    Loading2 --> TopicEntry: generation failed
    Playing --> RoundResult: all words found\nclient stopwatch stops
    RoundResult --> TopicEntry: Next Round / Done

    TopicEntry: Topic Entry\nFree-text input
    Loading1: Loading\nPOST /topics/words\n12s client timeout
    WordsPreview: Words Preview\n6 words shown\nplayer can go back
    Loading2: Loading\nPOST /board/generate\n10s client timeout
    Playing: Playing\nClient-side stopwatch\nWordTracer + WordCounter\nClient-side path validation
    RoundResult: Round Result\nTime · session best · total
```

## Round Timer & Scoring

```mermaid
sequenceDiagram
    participant S as Server (Python)
    participant H as Host
    participant P as Player

    H->>S: start_game { code, topic }
    S->>S: generate_words(topic) via Groq
    S->>S: generate_grid(words)
    S->>H: round_starting { board, previewMs=5000 }
    Note over H: Shows board for 5s
    Note over P: Sees nothing (no board yet)

    S->>S: asyncio.sleep(5s)
    S->>H: round_active { board, endsAt, durationMs }
    S->>P: round_active { board, endsAt, durationMs }
    Note over P: Timer starts (server-authoritative)

    Note over P,S: trace_word / word_correct / word_incorrect\nplayer_finished / round_over / game_over\nnot yet implemented in Python backend

    S->>S: asyncio.sleep(ROUND_DURATION_MS) expires
    Note over S: round_over + ranking logic pending
```
