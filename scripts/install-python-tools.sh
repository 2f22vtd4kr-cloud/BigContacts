#!/usr/bin/env bash
# Install Python OSINT tools for ApexFinder Pro
# Run once after import; safe to re-run (idempotent).
#
# Replit Python is managed by the module system — packages install into
# .pythonlibs/ automatically; no --user or --target flags needed.

set -e

echo "=== ApexFinder Python OSINT Tools Setup ==="
python3 --version
echo ""

PIP="python3 -m pip install -q"

# ── Holehe: email → 120+ platform presence checks ────────────────────────────
echo "[1/3] Installing holehe..."
$PIP holehe && echo "  ✓ holehe installed" || echo "  ✗ holehe failed (non-fatal)"

# ── Maigret: username → 3000+ site dossier ───────────────────────────────────
echo "[2/3] Installing maigret..."
$PIP maigret && echo "  ✓ maigret installed" || echo "  ✗ maigret failed (non-fatal)"

# ── theHarvester requires Python ≥3.12 ───────────────────────────────────────
# The PyPI 'theHarvester' package is a 0.0.1 stub; the real one (GitHub) needs ≥3.12.
# Current environment has Python 3.11 — skipping automatically.
echo "[3/3] theHarvester — skipped (requires Python ≥3.12, have $(python3 --version 2>&1 | awk '{print $2}'))"
echo "      To enable: install Python 3.12 module, then run: python3 -m pip install git+https://github.com/laramies/theHarvester.git"

echo ""
echo "=== Tool availability ==="
python3 -c "import holehe; print('  holehe:       ✓')" 2>/dev/null || echo "  holehe:       ✗"
python3 -c "import maigret; print('  maigret:      ✓')" 2>/dev/null || echo "  maigret:      ✗"
echo "  theHarvester: ✗ (needs Python ≥3.12)"
python3 -c "import gliner;  print('  gliner:       ✓')" 2>/dev/null || echo "  gliner:       ✗ (optional — heavy deps)"

echo ""
echo "=== Done ==="
echo "Run 'python3 scripts/gliner_service.py' to start the GLiNER NER microservice on port 7890."
