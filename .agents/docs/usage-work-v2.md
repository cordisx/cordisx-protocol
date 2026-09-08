# Work usage v2

[Public types](../../types/usage.v2.d.ts) add `ctx.usage.readWork()` with the same
`usage.read` permission. v1 `read()` remains unchanged. Work totals have an
independent persisted ledger and epoch, beginning with a baseline observation;
consumers must not reuse v1 watermarks or subtract the two aggregates.

Only validated root-session metadata with an absolute non-game initial working
directory is eligible. Host-generated game workspaces use the reserved
`state/profiles/<profile>/agent-loop/game-workspaces/<owner-hash>/<command-hash>`
path. Those sources, all forks/subagents, and unknown or missing cwd metadata
are excluded before increments enter the work ledger. Initial session metadata
classifies the entire source, even if later turn cwd changes. No source path,
message, token value, task label or author-provided category is exposed.

Coverage remains partial: scanning and counter continuity retain v1 constraints.
`classification.version = host-game-cwd-v1` attests this bounded exclusion
policy, not a universal detector of game-related user tasks. Ordinary eligible
root work can continue accruing. Fork work is conservatively excluded until a
future ancestry-aware contract establishes attribution. Consumers enable work
rewards only for this explicit policy/classification and a fresh epoch baseline.
