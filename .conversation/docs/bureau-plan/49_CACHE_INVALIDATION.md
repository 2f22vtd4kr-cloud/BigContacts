# Volume 49 — Cache Invalidation

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

After promote/rehydrate: invalidate entity list query cache so desk does not show empty cards until full refresh.

Status cache short (2s class). React Query staleTime should not hide fresh promotes beyond one poll.
