#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== OpenCowork Setup ===${NC}"

check_command() {
  if command -v "$1" &> /dev/null; then
    echo -e "${GREEN}✓${NC} $1 found: $($1 --version 2>&1 | head -1)"
    return 0
  else
    echo -e "${RED}✗${NC} $1 not found"
    return 1
  fi
}

NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Node.js ≥18 is required. Found: $(node --version 2>/dev/null || echo 'none')${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

check_command npm || exit 1

if check_command python3; then
  PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
  PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
  PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
  if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 9 ]; then
    echo -e "${GREEN}✓${NC} Python $PY_VERSION"
    echo -e "${YELLOW}Installing Python skill dependencies...${NC}"
    pip3 install python-docx python-pptx openpyxl reportlab 2>/dev/null || \
      echo -e "${YELLOW}⚠ Failed to install Python packages. Skills requiring Python will be unavailable.${NC}"
  else
    echo -e "${YELLOW}⚠ Python ≥3.9 recommended (found $PY_VERSION). Some skills may not work.${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Python 3 not found. Document creation skills (docx, pptx, xlsx) will be unavailable.${NC}"
fi

echo ""
echo -e "${GREEN}Installing npm dependencies...${NC}"
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}Created .env from .env.example — please add your API keys.${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo "Run 'npm run dev' to start the app in development mode."
