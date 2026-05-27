#!/usr/bin/env bash
set -euo pipefail

PKG_VER="$(bun -e "console.log(require('./package.json').version)")"
echo "Generating updater.json for version $PKG_VER"

MSI_DIR="src-tauri/target/release/bundle/msi"
MSI_FILE=$(ls "$MSI_DIR"/*.msi 2>/dev/null | head -1)
if [ -z "$MSI_FILE" ]; then
  echo "Error: No MSI file found in $MSI_DIR"
  exit 1
fi
echo "MSI: $MSI_FILE"

SIG_FILE="${MSI_FILE}.sig"
SIGNATURE=""

# Attempt manual signing via the private key from env
if [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
  echo "Attempting signature generation..."
  SIGNER_OUTPUT=$(SHELL=/bin/bash bun tauri signer sign \
    -k "$TAURI_SIGNING_PRIVATE_KEY" \
    -p "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" \
    "$MSI_FILE" 2>/dev/null || true)
  SIGNATURE=$(echo "$SIGNER_OUTPUT" | sed -n '/^Public signature:/{n;p}')
  if [ -n "$SIGNATURE" ]; then
    echo "$SIGNATURE" > "$SIG_FILE"
    echo "Signature generated successfully (${#SIGNATURE} chars)"
  fi
fi

if [ -z "$SIGNATURE" ]; then
  echo "Warning: No signature generated — updater will reject unsigned updates"
fi

MSI_BASENAME=$(basename "$MSI_FILE")
TAG_NAME="v${PKG_VER}"
DOWNLOAD_URL="https://github.com/TheGloved1/WowAdder/releases/download/${TAG_NAME}/${MSI_BASENAME}"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

CHANGELOG_FILE="changelogs/v${PKG_VER}.md"
NOTES=""
if [ -f "$CHANGELOG_FILE" ]; then
  NOTES=$(cat "$CHANGELOG_FILE")
  echo "Changelog loaded from $CHANGELOG_FILE"
else
  echo "No changelog found at $CHANGELOG_FILE, notes will be empty"
fi

# Escape NOTES for JSON string (backslash, newline, quote, tab, carriage return)
NOTES_ESCAPED=$(printf '%s' "$NOTES" | awk '{
  gsub(/\\/, "\\\\")
  gsub(/"/, "\\\"")
  gsub(/\t/, "\\t")
  gsub(/\r/, "\\r")
  if (NR > 1) printf "\\n"
  printf "%s", $0
}')

cat > updater.json <<EOF
{
  "version": "${PKG_VER}",
  "notes": "${NOTES_ESCAPED}",
  "pub_date": "${PUB_DATE}",
  "platforms": {
    "windows-x86_64": {
      "signature": "${SIGNATURE}",
      "url": "${DOWNLOAD_URL}"
    }
  }
}
EOF

echo "updater.json generated successfully"