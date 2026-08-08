# Topic Format Guide

Topics are generated dynamically by the Groq API on each round start. The host types any free-text topic string; the backend prompts `llama-3.3-70b-versatile` for a curated word list and generates the board from the response.

The generation logic lives in `backend/src/controllers/topics.py`.

## Word Format

Words returned by Groq are validated to this shape before use:

| Rule | Detail |
|---|---|
| All caps | `"FOX"` not `"fox"` — normalised automatically |
| Alpha only | No digits, hyphens, or symbols |
| 3–8 letters | Shorter or longer words are filtered out |
| No proper nouns | Enforced by the prompt instruction |
| Single words only | No phrases |

## Word Count

- **6 words per board** — Groq is prompted for 10 candidates; the validation pipeline filters, deduplicates, and drops prefix pairs, then takes up to 6
- Requires at least 6 valid words after filtering; if fewer remain the backend returns a 422 error and the player can try a different topic
- The prompt instructs the model to include at least 3 words of 3–4 letters to ensure a mix of short and longer words on every board

## Prefix-Pair Filtering

Any word that is a strict prefix of another word in the list is dropped before the count check.

Example: if Groq returns `["POKE", "POKEMON", ...]`, `POKE` is dropped because `POKEMON` starts with it. This is necessary because placing a prefix word on the board always produces at least two valid traceable paths (one through the prefix, one through the longer word), which would make board generation impossible under the strict uniqueness gate.

## Using Topics

Topics are not stored in code — any free-text string works:

1. Open a game room
2. Type any topic in the host's topic input (e.g. `"Kitchen"`, `"Space"`, `"90s Movies"`)
3. Press Start Game — the backend calls Groq and generates the word list live

To tune the word generation prompt, edit `backend/src/controllers/topics.py`.

## Groq Configuration

| Setting | Value |
|---|---|
| Model | `llama-3.3-70b-versatile` |
| Temperature | `0.7` |
| Timeout | `5000ms` |
| API key env var | `GROQ_API_KEY` in `backend/.env.dev` |

The Groq free tier allows 14,400 requests/day — well beyond any realistic game session volume.

## Board Generation and Word Overlap

Some topics produce word lists with high letter overlap (e.g. "pokemon" → CATCH, ATTACK, WATER, BATTLE). This makes the backtracking board packer exponentially harder under the strict uniqueness gate (each word must have exactly one traceable path).

To handle this, `generate_grid` uses a two-pass strategy:

1. **Strict pass (750ms)** — uniqueness gate on; each word has exactly one path; ideal puzzle clarity
2. **Relaxed pass (750ms fallback)** — uniqueness gate off; words placed in non-overlapping cells but may share traceable paths

The relaxed pass ensures a board is always produced for any valid topic. Both budgets are controlled by `GEN_TIME_BUDGET_S = 0.75` in `backend/src/controllers/board.py`.

## Rate Limits

| Scope | Limit |
|---|---|
| Per IP | 100 `POST /topics/words` requests / day |
| Global | 10,000 `POST /topics/words` requests / day across all IPs |

When the per-IP limit is hit, slowapi returns `429 Too Many Requests`. When the global daily cap is reached, `DailyCapMiddleware` returns `503 Service Unavailable` with the message `"Daily generation limit reached. Service will resume tomorrow."`.
