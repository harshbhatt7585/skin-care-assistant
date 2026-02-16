#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${ROOT_DIR}/.venv-bg"
PYTHON_BIN="${VENV_DIR}/bin/python"

if [[ ! -d "${VENV_DIR}" ]]; then
  echo "Creating virtualenv at ${VENV_DIR}"
  python3 -m venv "${VENV_DIR}"
fi

if ! "${PYTHON_BIN}" -c "import rembg, PIL" >/dev/null 2>&1; then
  echo "Installing dependencies (rembg, onnxruntime, pillow)..."
  "${PYTHON_BIN}" -m pip install rembg onnxruntime pillow
fi

exec "${PYTHON_BIN}" "${ROOT_DIR}/scripts/build_showcase_assets.py" \
  --urls-file "scripts/showcase_urls.txt" \
  --clean-output \
  "$@"
