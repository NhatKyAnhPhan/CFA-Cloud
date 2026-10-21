# OmniConvert

## Build the Windows desktop app

Install Node.js, install the project dependencies, then run these commands in PowerShell:

```powershell
npm install
npm run build:desktop
```

The desktop build downloads the official `yt-dlp.exe` release and bundles it with the app. An internet connection is required when building.

The Windows installer is written to `release/`. Media conversion features that use FFmpeg require `ffmpeg.exe` to be installed and available on `PATH`.
