#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT=${1:-"$ROOT/build/CreatureSaver.saver"}
CONTENTS="$OUT/Contents"
rm -rf "$OUT"
mkdir -p "$CONTENTS/MacOS"
swiftc -emit-library -module-name CreatureSaver \
  -framework AppKit -framework ScreenSaver \
  "$ROOT/CreatureSaver/CreatureSaverView.swift" \
  -o "$CONTENTS/MacOS/CreatureSaver"
swiftc -parse-as-library "$ROOT/CreatureSaver/CreatureSaverImport.swift" -o "$CONTENTS/MacOS/CreatureSaverImport"
cp "$ROOT/CreatureSaver/Info.plist" "$CONTENTS/Info.plist"
printf '%s\n' "Built unsigned development bundle: $OUT"
