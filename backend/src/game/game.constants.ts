// Tunable game parameters. All timing is server-authoritative.

/** Board is shown on the HOST screen for this long before it goes live on phones. */
export const PREVIEW_MS = 5000;

/** Per-round solve window once the board is live on players' phones. */
export const ROUND_DURATION_MS = 90000;

/** Fixed number of rounds per game (host-configurable later). */
export const MAX_ROUNDS = 3;

/**
 * Time charged to a player who did NOT finish a round: full round + 30s penalty.
 * Guarantees a non-finisher always contributes more than any finisher of that round.
 */
export const NON_FINISH_PENALTY_MS = ROUND_DURATION_MS + 30000; // 120000

/** Max board-generation attempts before giving up. */
export const MAX_GEN_ATTEMPTS = 60;

/** Hard wall-clock budget for a single generateGrid call (ms). Prevents event-loop hangs. */
export const GEN_TIME_BUDGET_MS = 750;

/** Per-socket trace_word rate limit (submissions per second). */
export const MAX_TRACE_PER_SEC = 10;
