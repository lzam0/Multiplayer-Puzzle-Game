# Review Handoff: Reviewer → Implementer (NIT cleanup)
**Branch:** feature/frontend
**Date:** 2026-07-25
**Iteration:** 0 (post-approval NIT cleanup, not a re-review cycle)

## BLOCKERs (fix before re-review)
None.

## MAJORs (fix before completion)
None.

## NITs (fix all three, requested by user)
| ID | File | Line | Description | Suggested Fix |
|---|---|---|---|---|
| N-001 | frontend/src/app/play/[code]/PlayerView.tsx | 17, 24 | Dead `type Phase` and unused `[phase, setPhase]` state | Remove the `Phase` type and the unused state declaration and any references |
| N-002 | frontend/src/app/host/[code]/page.tsx | 3 | Unused `useEffect, useState` import | Remove the unused import (or the unused names from it) |
| N-003 | frontend/src/hooks/useRoom.ts | — | `errorMsg` is never cleared; a transient error banner persists | Clear `errorMsg` appropriately — e.g. reset it on successful `room_joined`/`game_started`, and/or expose a clear function / auto-clear after a timeout. Keep it minimal and consistent with existing patterns. |

## Scope Fence
Modify ONLY the three files above, only to resolve N-001/N-002/N-003. Do NOT touch the backend. Do NOT alter behavior beyond these cleanups. Do NOT address N-004 (accepted backend reconnect limitation). Re-run gates: `npx tsc --noEmit`, `npm run lint`, `npm run build` — all must PASS. Do NOT commit; the orchestrator commits and merges.
