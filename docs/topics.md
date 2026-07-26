# Topic Format Guide

Topics are the word sets used to generate each puzzle. They live in `backend/src/topics/topics.data.ts` as a plain TypeScript array — no database needed.

## Topic Shape

```typescript
interface Topic {
  id: string;        // unique kebab-case identifier
  label: string;     // display name shown to host
  words: string[];   // all-caps words used to build the grid
}
```

## Guidelines for Words

- **All caps** — `"FOX"` not `"fox"`
- **No proper nouns** (keep it accessible)
- **Minimum 3 letters, maximum 8 letters** per word
- **6–10 words per topic** — enough to fill a grid without making it too hard
- **Avoid duplicate letters across words** where possible — the grid packer will handle some overlap but fewer conflicts = cleaner boards
- **Test the total letter count**: aim for a grid size of 5×5 (25 letters) or 6×6 (36 letters)

## Example Topic

```typescript
{
  id: "ocean",
  label: "Ocean",
  words: ["WAVE", "REEF", "TIDE", "KELP", "CRAB", "SEAL", "BUOY"]
}
```

## Adding a New Topic

> **Note:** `topics.data.ts` does not exist yet. `TopicsService` is currently a stub. The steps below describe the intended workflow once it is implemented.

1. Create `backend/src/topics/topics.data.ts` if it doesn't exist, exporting a `TOPICS` array
2. Add an entry following the shape above
3. Inject `TopicsService` into the gateway and wire it to the `start_game` handler
4. Restart the backend — topics are loaded at startup
5. The new topic will appear in the host's topic selection dropdown automatically

## Planned Topics

- Animals
- Ocean
- Space
- Food
- Sports
- Countries
- Music
- Movies
- Nature
- Tech
