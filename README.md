# WowAdder

A lightweight, native World of Warcraft addon manager built with [Tauri](https://tauri.app/) v2, React 19, and the CurseForge Core API v2.

## How It's Different

### Lightweight & Native (No Electron)
Built on **Tauri v2** with a Rust backend and a compiled MSI installer (~5 MB). No Electron overhead, no bundled Chromium, no excessive RAM usage. The frontend is a lean React 19 + [Tailwind CSS v4](https://tailwindcss.com/) app served by your OS's native webview.

### No Account, No Ads, No Tracking
Connects directly to the **CurseForge Core API v2** (official API) using a bundled key. No CurseForge account needed. No ads. No telemetry. No background processes. Just launch and go.

### Smart Addon Detection
Scans your `Interface/AddOns` folder by parsing `.toc` metadata files (Title, Version). Detects addons installed outside WowAdder and can **match and adopt** them into its database — no manual reinstallation required.

### Safe Upgrades
When upgrading an addon, downloads and extracts the new version **before** removing old folders — eliminating the window where addon files are missing if something goes wrong mid-upgrade.

### Multi-Folder Addon Support
Handles addons that span multiple folders (some addons ship as several separate directories). Tracks all folder names per addon for clean uninstall/upgrade.

### Native ZIP Import
Import addons from `.zip` files directly — pick the archive and it's extracted to your AddOns folder via the Rust backend, then detected automatically.

### CurseForge CDN Downloads
Downloads files directly from the CurseForge edge CDN for maximum speed. Falls back to the API download URL if the CDN path is unavailable.

### Version-Aware Browsing
Browse and filter addons by specific World of Warcraft game version. The file list on each addon detail page shows only compatible files, with the option to view all versions.

### Auto-Updating
Built-in auto-updater powered by Tauri's updater plugin — checks for new releases on GitHub and downloads/installs them with a progress bar. No manual download hunting.

### WoW-Themed UI
A custom World of Warcraft-inspired design featuring gold accents, dark stone textures, serif headings, and item-quality-colored badges (green/blue/purple/orange matching WoW's rarity colors).

## Features

- Browse & search addons from CurseForge
- Filter by game version, category, and sort order
- One-click install to your AddOns folder
- View addon descriptions rendered as HTML
- Manage installed addons (list, uninstall, scan for externals)
- Import addons from ZIP archives
- Sync external addons into the managed database
- Automatic updates

## Getting Started

### Prerequisites

- Windows (for the MSI installer — other platforms can build from source)

### Installation

1. Download the latest MSI from [Releases](https://github.com/TheGloved1/WowAdder/releases)
2. Run the installer
3. Launch WowAdder and select your World of Warcraft `Interface/AddOns` folder

### Building from Source

```bash
bun install
bun run sync-version
bun tauri build
```

Requires [Bun](https://bun.sh/), [Rust](https://www.rust-lang.org/), and the Tauri v2 CLI.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Framework | [Tauri v2](https://v2.tauri.app/) (Rust backend) |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| API Client | [`curseforge-v2`](https://www.npmjs.com/package/curseforge-v2) |
| Routing | React Router v7 |
| Build Tool | Vite 7 |
| Package Manager | Bun |
| Installer | WiX MSI |