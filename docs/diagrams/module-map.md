# Module & Component Map

## Backend Modules

```mermaid
graph TD
    subgraph AppModule
        subgraph GatewayModule
            GW["game.gateway.ts\njoin_room · start_game · next_round\ntrace_word · end_round · end_game"]
        end

        subgraph LobbyModule
            LC["lobby.controller.ts\nPOST /lobby\nGET /lobby/:code\nGET /qr/:code"]
            LS["lobby.service.ts\nclaimHost · startRound · activateRound\nrecordFound · endRound · isLastRound"]
        end

        subgraph GameModule
            GS["game.service.ts\ngenerateGrid (sparse)\nvalidateTrace\nrankRound"]
            GT["game.types.ts\nRoom · Player · Round\nLetterGrid · PlayerRoundState\nRoundRankEntry · PodiumEntry"]
            GC["game.constants.ts\nPREVIEW_MS=5000\nROUND_DURATION_MS=90000\nMAX_ROUNDS=3\nNON_FINISH_PENALTY_MS=120000"]
        end

        subgraph TopicsModule
            TS["topics.service.ts\nresolveTopic(idOrLabel)\ngetWords"]
            TD["topics.data.ts\nAnimals · Foods · Countries\nColors · Sports"]
        end
    end

    GW --> LS
    GW --> GS
    GW --> TS
    TS --> TD
    GS --> GT
    GS --> GC
    LS --> GT
```

## Frontend Components

```mermaid
graph TD
    subgraph "Host View — /host/[code]"
        HV["HostView.tsx\nphase machine"]
        HBP["HostBoardPreview.tsx\n5s preview · board left · word list right"]
        LB1["LetterBoard.tsx\ncellSize=lg · grey dead cells"]
        RT["RoundTimer.tsx\ncountdown from endsAt"]
        FT["FinishTracker.tsx\nlive finish list + times"]
        RR["RoundRankings.tsx\nbetween-round table"]
        TS["TopicSelector.tsx\ntopic picker"]
        PD["Podium.tsx\nfinal 3/2/1 by lowest time"]

        HV --> HBP
        HV --> RT
        HV --> FT
        HV --> RR
        HV --> TS
        HV --> PD
        HBP --> LB1
        HV --> LB1
    end

    subgraph "Player View — /play/[code]"
        PV["PlayerView.tsx\nphase machine"]
        LB2["LetterBoard.tsx\ncellSize=md"]
        WT["WordTracer.tsx\ndrag-to-trace\nskips cells without data-idx"]
        WC["WordCounter.tsx\ngrey boxes → green on find"]
        PD2["Podium.tsx"]

        PV --> LB2
        PV --> WT
        PV --> WC
        PV --> PD2
        WT --> LB2
    end

    subgraph "Shared"
        UR["useRoom.ts\nsocket state\nround_starting → round_active\n→ round_over → game_over"]
        TY["lib/types.ts\nfrontend mirror of game.types.ts"]
        FM["lib/format.ts\nformatMs → '21.34s'"]
    end

    HV --> UR
    PV --> UR
    UR --> TY
    RT --> FM
    FT --> FM
    RR --> FM
    PD --> FM
    PD2 --> FM
```

## Data Flow — `trace_word`

```mermaid
flowchart LR
    PH["Player\n(phone)"] -->|"trace_word\n{ word, letterIndices }"| GW2["Gateway"]
    GW2 -->|"rate-limit check\n≤10/s"| RL{within\nlimit?}
    RL -->|no| DROP["drop silently"]
    RL -->|yes| VAL["GameService\n.validateTrace"]
    VAL -->|"adjacency check\nword membership\nper-player dedup"| RES{result}
    RES -->|correct| RF["LobbyService\n.recordFound"]
    RES -->|incorrect| WI2["word_incorrect\n→ submitter only"]
    RF --> DONE{all words\nfound?}
    DONE -->|no| WC2["word_correct\n→ submitter only"]
    DONE -->|yes| PF2["player_finished\n→ host + player\nauto round-end if all done"]
```
