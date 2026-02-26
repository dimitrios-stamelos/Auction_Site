#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

VENV=".venv"

if command -v python3.12 >/dev/null 2>&1; then
  PY=python3.12
else
  PY=python3
fi

if [ ! -d "$VENV" ]; then
  echo "[recs] Creating virtual environment with $PY"
  "$PY" -m venv "$VENV"
  source "$VENV/bin/activate"
  PYVER=$($PY - <<'PY'
import sys
print(f"{sys.version_info.major}.{sys.version_info.minor}")
PY
)
  if [ "$PYVER" = "3.12" ]; then
    echo "[recs] Installing Pydantic v2 / FastAPI 0.111 stack"
    pip install -r requirements-py312.txt
  else
    echo "[recs] Installing Pydantic v1 / FastAPI 0.95 stack (Python $PYVER)"
    pip install -r requirements.txt
    if [ "$PYVER" = "3.13" ]; then
      echo "[recs] NOTE: Python 3.13 + Pydantic v1 can be problematic. If the service fails to start, install Python 3.12 (conda create -n rec-py312 python=3.12) and rerun."
    fi
  fi
else
  source "$VENV/bin/activate"
fi

echo "[recs] Starting uvicorn on :8090 (reloader excludes .venv)"
exec uvicorn app:app \
  --host 127.0.0.1 \
  --port 8090 \
  --reload \
  --reload-dir "$(pwd)" \
  --reload-exclude ".venv/*" \
  --reload-exclude "**/.venv/**" \
  --reload-exclude "**/site-packages/**" \
  --reload-exclude "**/__pycache__/**"
