#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../frontend"
exec npm run start -- --port "${PORT:-3000}"

