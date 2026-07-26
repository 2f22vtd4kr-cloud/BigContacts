#!/usr/bin/env bash
# Install Python OSINT tools for ApexFinder Pro
# Run once after import; safe to re-run (idempotent).
# Tools installed: holehe, maigret, theHarvester, gliner

set -e

echo "=== ApexFinder Python OSINT Tools Setup ==="
echo "Python: $(python3 --version)"
echo "pip:    $(pip3 --version)"
echo ""

# NixOS: /nix/store is read-only. Install into user site-packages.
BPS="--user --break-system-packages"

# Upgrade pip silently (non-fatal)
pip3 install --upgrade pip --quiet $BPS 2>/dev/null || true

# ── Holehe: email → 120+ platform presence checks ────────────────────────────
echo "[1/4] Installing holehe..."
pip3 install holehe --quiet $BPS && echo "  ✓ holehe installed" || echo "  ✗ holehe failed (non-fatal)"

# ── Maigret: username → 3000+ site dossier ───────────────────────────────────
echo "[2/4] Installing maigret..."
pip3 install maigret --quiet $BPS && echo "  ✓ maigret installed" || echo "  ✗ maigret failed (non-fatal)"

# ── theHarvester: domain → emails/subdomains from public sources ──────────────
echo "[3/4] Installing theHarvester..."
pip3 install theHarvester --quiet $BPS && echo "  ✓ theHarvester installed" || echo "  ✗ theHarvester failed (non-fatal)"

# ── GLiNER: zero-shot NER (larger deps — torch/onnxruntime) ──────────────────
echo "[4/4] Installing GLiNER..."
# Install CPU-only torch first to avoid downloading the huge CUDA build
pip3 install torch --index-url https://download.pytorch.org/whl/cpu --quiet $BPS 2>/dev/null \
  || pip3 install torch --quiet $BPS 2>/dev/null \
  || echo "  ! torch install had warnings (may still work)"
pip3 install gliner --quiet $BPS && echo "  ✓ gliner installed" || echo "  ✗ gliner failed (non-fatal)"

echo ""
echo "=== Tool availability ==="
python3 -c "import holehe; print('  holehe:       ✓')" 2>/dev/null || echo "  holehe:       ✗"
python3 -c "import maigret; print('  maigret:      ✓')" 2>/dev/null || echo "  maigret:      ✗"
python3 -c "import theHarvester; print('  theHarvester: ✓')" 2>/dev/null \
  || which theHarvester &>/dev/null && echo "  theHarvester: ✓ (CLI)" || echo "  theHarvester: ✗"
python3 -c "import gliner; print('  gliner:       ✓')" 2>/dev/null || echo "  gliner:       ✗"

echo ""
echo "=== Done ==="
echo "Run 'python3 scripts/gliner_service.py' to start the GLiNER NER microservice on port 7890."
