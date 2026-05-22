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

# If .sig wasn't generated alongside the MSI, search broader or sign manually
if [ ! -f "$SIG_FILE" ]; then
  echo "No .sig at expected path, searching bundle directory..."
  ANY_SIG=$(find src-tauri/target/release/bundle -name "*.sig" 2>/dev/null | head -1)
  if [ -n "$ANY_SIG" ]; then
    echo "Found sig: $ANY_SIG"
    SIG_FILE="$ANY_SIG"
  fi
fi

# Still no sig? Try manual signing via the private key from env
if [ ! -f "$SIG_FILE" ] && [ -n "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
  echo "Attempting manual signature generation..."
  SIGNER_OUTPUT=$(SHELL=/bin/bash bun tauri signer sign \
    -k "$TAURI_SIGNING_PRIVATE_KEY" \
    -p "${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}" \
    "$MSI_FILE" 2>/dev/null || true)
  # Extract the line after "Public signature:" — that's the actual base64 signature
  SIGNATURE=$(echo "$SIGNER_OUTPUT" | sed -n '/^Public signature:/{n;p}')
  if [ -n "$SIGNATURE" ]; then
    SIG_FILE="${MSI_FILE}.sig"
    echo "$SIGNATURE" > "$SIG_FILE"
    echo "Manual signature generated successfully"
  fi
fi

if [ -f "$SIG_FILE" ]; then
  SIGNATURE=$(cat "$SIG_FILE")
  echo "Signature loaded (${#SIGNATURE} chars)"
else
  echo "Warning: No signature found — updater will reject unsigned updates"
  SIGNATURE=""
fi

MSI_BASENAME=$(basename "$MSI_FILE")
TAG_NAME="v${PKG_VER}"
DOWNLOAD_URL="https://github.com/TheGloved1/WowAdder/releases/download/${TAG_NAME}/${MSI_BASENAME}"
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

cat > updater.json <<EOF
{
  "version": "${PKG_VER}",
  "notes": "",
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