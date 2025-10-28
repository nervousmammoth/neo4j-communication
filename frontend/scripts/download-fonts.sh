#!/bin/bash
# Download Geist fonts for self-hosting (on-prem deployment)
# Run this script when you have internet access to download fonts for offline use

set -e

FONTS_DIR="public/fonts"
TEMP_DIR="/tmp/geist-fonts"

echo "📦 Downloading Geist fonts for self-hosting..."

# Create directories
mkdir -p "$FONTS_DIR"
mkdir -p "$TEMP_DIR"

# Download Geist fonts from official repository
echo "⬇️  Downloading Geist Sans & Geist Mono..."

# Geist fonts are available from Vercel's repository
GEIST_RELEASE="https://github.com/vercel/geist-font/releases/latest/download"

# Download Geist Sans
curl -L "$GEIST_RELEASE/Geist.zip" -o "$TEMP_DIR/Geist.zip"
curl -L "$GEIST_RELEASE/GeistMono.zip" -o "$TEMP_DIR/GeistMono.zip"

# Extract fonts
echo "📂 Extracting fonts..."
unzip -q "$TEMP_DIR/Geist.zip" -d "$TEMP_DIR/Geist"
unzip -q "$TEMP_DIR/GeistMono.zip" -d "$TEMP_DIR/GeistMono"

# Copy variable fonts to public directory
echo "📋 Copying fonts to $FONTS_DIR..."
find "$TEMP_DIR/Geist" -name "*.woff2" -type f -exec cp {} "$FONTS_DIR/" \;
find "$TEMP_DIR/GeistMono" -name "*.woff2" -type f -exec cp {} "$FONTS_DIR/" \;

# Clean up
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

echo "✅ Fonts downloaded successfully to $FONTS_DIR/"
echo ""
echo "Next steps:"
echo "1. Update app/layout.tsx to use local fonts (see app/layout.local-fonts.tsx.example)"
echo "2. Commit the fonts to your repository"
echo "3. Deploy to on-prem environment"
