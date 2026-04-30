# Build assets

electron-builder reads platform icons from this directory:

- `icon.icns` — macOS icon (1024×1024 source baked into a multi-size .icns)
- `icon.ico` — Windows icon (256×256 multi-resolution .ico)
- `icon.png` — Linux icon (512×512 PNG)

If these files are missing, electron-builder falls back to its default Electron icon.
Generate them from a single 1024×1024 PNG with one of:

- https://cloudconvert.com/png-to-icns (one-off)
- `npx electron-icon-builder --input=icon.png --output=build` (programmatic)
