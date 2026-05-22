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
if [ ! -f "$SIG_FILE" ]; then
  echo "Error: No .sig file found at $SIG_FILE"
  exit 1
fi

SIGNATURE=$(cat "$SIG_FILE")
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
cat updater.json