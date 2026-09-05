# Volume 19 — Secrets and Environment Reference

## Official secret names (ask all on from-zero)

From product from-zero discipline:

1. REDIS_URL_1
2. GROQ_API_KEY
3. GEMINI_API_KEY
4. NVIDIA_NIM_API_KEY
5. SERPER_API_KEY
6. TAVILY_API_KEY
7. EXA_API_KEY
8. EXA_API_KEY_2 (optional second)
9. SERPAPI_API_KEY
10. SCRAPFLY_API_KEY
11. ZENROWS_API_KEY
12. COMPANIES_HOUSE_API_KEY
13. WHOISJSON_API_KEY
14. MISTRAL_API_KEY
15. HF_TOKEN

Aliases commonly accepted in code (do not require operator to invent extras):

- NVIDIA_API_KEY / NVIDIA_KEY → NVIDIA
- GEMINI_KEY → Gemini
- WHOXY_API_KEY / WHOXY_KEY → Whoxy if used
- EXA_1 / EXA_2 → Exa
- REDIS_URL copy of REDIS_URL_1 if local path expects REDIS_URL

## Env flags

- ENABLE_AUTO_PIPELINE=false
- RESEARCH_DEPTH=standard (or deep for parity digs)
- LOG_LEVEL=info
- PORT=8080
- INSTALL_PYTHON_OSINT=false for credit-safe boot unless operator wants full CLI tools

## Redis policy

One permanent Upstash URL on free tier. Multiple free URLs plus frequent status polls exhaust quota and produce sticky failure flags. Paid multi-slot is a different ops profile.

## After change

Restart API. Confirm healthz. Never print secret values in chat or commits.
