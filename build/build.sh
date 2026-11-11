#!/bin/bash
# Empacota o Claude Videos Collection como app de macOS e gera o .dmg de instalação.
# Uso: npm run build            (só empacota em dist/)
#      npm run build -- install (empacota e copia para /Applications)
set -euo pipefail
cd "$(dirname "$0")/.."
ARCH="$(uname -m)"; [ "$ARCH" = "x86_64" ] && ARCH=x64

# ícone
if [ ! -f build/icon.icns ] || [ build/icon.swift -nt build/icon.icns ]; then
  TMP="$(mktemp -d)"
  swift build/icon.swift "$TMP/icon.png"
  mkdir "$TMP/icon.iconset"
  for s in 16 32 128 256 512; do
    sips -z $s $s "$TMP/icon.png" --out "$TMP/icon.iconset/icon_${s}x${s}.png" >/dev/null
    d=$((s * 2))
    sips -z $d $d "$TMP/icon.png" --out "$TMP/icon.iconset/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$TMP/icon.iconset" -o build/icon.icns
  cp "$TMP/icon.png" build/icon.png
  rm -rf "$TMP"
fi

rm -rf dist
NAME="Claude Videos Collection"
npx @electron/packager . "$NAME" \
  --platform=darwin --arch="$ARCH" \
  --out=dist --overwrite \
  --icon=build/icon.icns \
  --app-bundle-id=local.claude-videos-collection \
  --app-category-type=public.app-category.video \
  --ignore='^/dist' --ignore='^/build' --ignore='^/\.claude' >/dev/null

APP="dist/$NAME-darwin-$ARCH/$NAME.app"
codesign --force --deep --sign - "$APP" >/dev/null 2>&1

# imagem de instalação (arrastar para Aplicativos)
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "$NAME" -srcfolder "$STAGE" -ov -format UDZO "dist/Claude-Videos-Collection.dmg" >/dev/null
rm -rf "$STAGE"

if [ "${1:-}" = "install" ]; then
  pkill -f "/Applications/$NAME.app/Contents/MacOS/" >/dev/null 2>&1 || true
  rm -rf "/Applications/$NAME.app"
  cp -R "$APP" "/Applications/"
  echo "Instalado em /Applications/$NAME.app"
fi
echo "Pronto: $APP e dist/Claude-Videos-Collection.dmg"
