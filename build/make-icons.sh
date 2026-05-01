#!/usr/bin/env bash
# Generate every icon format from build/icon.svg.
#
# Outputs:
#   build/icon.png              — 1024×1024 master, used by Linux
#   build/icon.icns             — macOS (multi-resolution bundle)
#   build/icon.ico              — Windows (multi-resolution, requires npx png-to-ico)
#   web/public/favicon-32.png   — favicon raster fallback
#   web/public/apple-touch-icon.png — 180×180 for iOS home-screen
#   web/public/og.png           — 1200×630 social share (light cream bg)
#
# Requires: macOS (uses qlmanage, sips, iconutil) and `npx png-to-ico`.

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SVG="$HERE/icon.svg"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if [ ! -f "$SVG" ]; then
  echo "Missing $SVG"
  exit 1
fi

echo "→ Rendering 1024×1024 master from SVG via qlmanage…"
qlmanage -t -s 1024 -o "$TMP" "$SVG" >/dev/null
mv "$TMP/icon.svg.png" "$TMP/master.png"

echo "→ Writing build/icon.png (Linux)"
cp "$TMP/master.png" "$HERE/icon.png"

echo "→ Building build/icon.iconset/ for iconutil"
ICONSET="$TMP/icon.iconset"
mkdir -p "$ICONSET"
sips -z 16 16     "$TMP/master.png" --out "$ICONSET/icon_16x16.png"        >/dev/null
sips -z 32 32     "$TMP/master.png" --out "$ICONSET/icon_16x16@2x.png"     >/dev/null
sips -z 32 32     "$TMP/master.png" --out "$ICONSET/icon_32x32.png"        >/dev/null
sips -z 64 64     "$TMP/master.png" --out "$ICONSET/icon_32x32@2x.png"     >/dev/null
sips -z 128 128   "$TMP/master.png" --out "$ICONSET/icon_128x128.png"      >/dev/null
sips -z 256 256   "$TMP/master.png" --out "$ICONSET/icon_128x128@2x.png"   >/dev/null
sips -z 256 256   "$TMP/master.png" --out "$ICONSET/icon_256x256.png"      >/dev/null
sips -z 512 512   "$TMP/master.png" --out "$ICONSET/icon_256x256@2x.png"   >/dev/null
sips -z 512 512   "$TMP/master.png" --out "$ICONSET/icon_512x512.png"      >/dev/null
cp "$TMP/master.png" "$ICONSET/icon_512x512@2x.png"

echo "→ Writing build/icon.icns (macOS)"
iconutil -c icns "$ICONSET" -o "$HERE/icon.icns"

echo "→ Writing web/public/favicon-32.png + apple-touch-icon.png"
sips -z 32 32  "$TMP/master.png" --out "$ROOT/web/public/favicon-32.png" >/dev/null
sips -z 180 180 "$TMP/master.png" --out "$ROOT/web/public/apple-touch-icon.png" >/dev/null

echo "→ Writing build/icon.ico (Windows) via npx png-to-ico"
# Compose a few sizes for the .ico
ICOSRC="$TMP/ico-src"
mkdir -p "$ICOSRC"
sips -z 16 16  "$TMP/master.png" --out "$ICOSRC/16.png" >/dev/null
sips -z 32 32  "$TMP/master.png" --out "$ICOSRC/32.png" >/dev/null
sips -z 48 48  "$TMP/master.png" --out "$ICOSRC/48.png" >/dev/null
sips -z 64 64  "$TMP/master.png" --out "$ICOSRC/64.png" >/dev/null
sips -z 128 128 "$TMP/master.png" --out "$ICOSRC/128.png" >/dev/null
sips -z 256 256 "$TMP/master.png" --out "$ICOSRC/256.png" >/dev/null
( cd "$ICOSRC" && npx --yes png-to-ico 16.png 32.png 48.png 64.png 128.png 256.png > "$HERE/icon.ico" )

echo "✓ Done. Wrote:"
echo "  $HERE/icon.png"
echo "  $HERE/icon.icns"
echo "  $HERE/icon.ico"
echo "  $ROOT/web/public/favicon-32.png"
echo "  $ROOT/web/public/apple-touch-icon.png"
