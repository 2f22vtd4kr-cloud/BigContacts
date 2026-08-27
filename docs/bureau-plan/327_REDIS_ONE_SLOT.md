# Volume 327 — Redis One Slot Preference

Prefer one permanent REDIS_URL_1. Multiple free Upstash URLs + aggressive polling caused false “exhausted” and Launch no-ops. Jobs should degrade to in-memory when Redis is down rather than silent idle.
