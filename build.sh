#!/bin/bash
set -e

VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
OUTPUT="aims-better-experience-v${VERSION}.zip"

zip -r "$OUTPUT" \
  manifest.json \
  assets/ \
  src/ \
  -x "manifest.dev.json" \
  -x "src/content/content.js" \
  -x "src/content/content.css" \
  -x "src/rules.json"

echo "✅ Built: $OUTPUT"
