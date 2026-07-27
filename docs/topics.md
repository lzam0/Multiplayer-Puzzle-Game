# Topic Format Guide

Topics are generated dynamically by the Groq API on each round start. The host types any free-text topic string; the backend prompts `llama-3.3-70b-versatile` for a curated word list and generates the board from the response.

There is no `topics.data.ts` file — hardcoded topic lists were removed in Phase 4.

## Word Format

Words returned by Groq are validated to this shape before use:

| Rule | Detail |
|---|---|
| All caps | `"FOX"` not `"fox"` — normalised automatically |
| Alpha only | No digits, hyphens, or symbols |
| 3–8 letters | Shorter or longer words are filtered out |
| No proper nouns | Enforced by the prompt instruction |

## Word Count

- **4–6 words per board** — Groq is prompted for 6; the validation pipeline filters and deduplicates, requiring at least 4 valid words to proceed
- The prompt requires at least 2 words to be 3 or 4 letters long, ensuring a mix of short and longer words on every board
- If fewer than 4 valid words remain after filtering, the gateway emits an `error` event to the host and they can try a different topic

## Adding / Changing Topics

Topics are no longer stored in code. To use a new topic:

1. Start a game room
2. Type any topic string in the host's topic input field (e.g. `"Kitchen"`, `"Space"`, `"90s Movies"`)
3. Press Start Game — the backend calls Groq and generates the word list live

To tune the word generation, edit the prompt in `backend/src/topics/topics.service.ts`.

## Shipped Topics (Phases 1–3, now removed)

The following hardcoded topics existed before Phase 4 and have since been replaced by dynamic generation:

- Animals
- Foods
- Countries
- Colors
- Sports

These still work as free-text topic inputs — Groq will generate appropriate words for any of them.

## Groq Configuration

| Setting | Value |
|---|---|
| Model | `llama-3.3-70b-versatile` |
| Temperature | `0.7` |
| Timeout | `5000ms` |
| API key env var | `GROQ_API_KEY` in `backend/.env` |

The Groq free tier allows 14,400 requests/day — well beyond any realistic game session volume.
