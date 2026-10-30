#!/bin/sh
# Kopiert nur die Web-Dateien in dist/, damit Tauri nicht den ganzen Ordner einpackt.
set -e
cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist
cp index.html dist/
cp -R css js dist/
echo "dist/ erstellt"
