# WowAdder — Agent Guide

## Stack
- **Desktop:** Tauri v2 (Rust backend, React 19 + TypeScript frontend)
- **Build:** Bun, Vite 7, Tailwind CSS v4
- **Routing:** React Router DOM v7 (`BrowserRouter` in `src/App.tsx`)
- **No test framework** in dependencies

## Key Commands
| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server on port 1420 (strict port) |
| `bun run build` | `tsc && vite build` — **must pass before committing** |
| `bun tauri dev` | Full Tauri desktop dev mode |
| `bun tauri build` | Build MSI installer |
| `bun run sync-version` | Sync `package.json` version → `Cargo.toml` + `tauri.conf.json` |
| `bun run release <patch\|minor\|major>` | Bump version + git tag |
| `bun run tags:push` | Push tags → triggers CI release workflow |

## Project Structure
```
src/
  App.tsx              — BrowserRouter + routes (/, /addon/:id, /installed, /settings)
  index.css            — Tailwind @theme tokens + data-theme overrides
  main.tsx             — Entry point
  components/
    Layout.tsx          — Header nav + Outlet + update banner
    wow/                — WoW-themed primitives: WoWButton, WoWPanel, WoWBadge, WoWIcon, WoWDivider
  pages/               — One file per route
  services/
    curseforge.ts       — CFV2Client wrapper (searchMods, getMod, getModFileDownloadUrl)
    addonManager.ts     — Install/uninstall/scan/import via Tauri invoke + plugin-store
    preferences.ts      — localStorage-based user prefs (colorScheme, pageSize, etc.)
src-tauri/
  src/lib.rs           — Tauri commands: install_addon, import_zip
  tauri.conf.json      — App config (window 1200x800, updater endpoints)
  capabilities/default.json — Permissions (fs:**, dialog, store, updater)
```

## Architecture Rules

### Adding a page
1. Create `src/pages/YourPage.tsx` with a default export
2. Add `<Route path="/your-path" element={<YourPage />} />` inside the `<Route element={<Layout />}>` block in `src/App.tsx`
3. Optionally add a `<Link>` in `src/components/Layout.tsx`

### Styling
- All styling via **Tailwind CSS v4** utility classes using `wow-*` theme tokens (`bg-wow-panel`, `text-wow-gold`, `border-wow-border-gold`)
- Theme switching: `<html data-theme="...">` — overrides defined in `index.css` (`[data-theme="emerald"]`, `[data-theme="crimson"]`, etc.)
- Available schemes: `default` | `emerald` | `crimson` | `nightelf` | `frost`
- Use `WoWPanel`, `WoWButton`, `WoWDivider`, `WoWBadge`, `WoWIcon` from `src/components/wow/` for consistent styling
- Fonts: `font-wow-heading` (IM Fell English) for titles, `font-wow-body` (Inter) for body text

### Preferences
- `src/services/preferences.ts` — localStorage under `wowadder_pref_settings`
- Import `loadPrefs()` / `savePrefs(partial)` to persist user settings
- Apply theme on app mount via `document.documentElement.setAttribute("data-theme", prefs.colorScheme)` in `App.tsx`

### Tauri Backend
- Rust commands in `src-tauri/src/lib.rs`: `install_addon` (download + extract ZIP), `import_zip`
- Invoke via `import { invoke } from "@tauri-apps/api/core"` → `invoke<string>("command_name", { args })`
- Install progress emitted as events: `app_handle.emit("install-progress", value)` with values 0, 30, 50, 100
- Addon database stored at `<AddOnsFolder>/.wowadder/db.json` as JSON
- Addons folder path stored via `@tauri-apps/plugin-store`
- File system permissions allow `**` (broad access)

### Version Management
- Single source of truth: `package.json` `"version"`
- `scripts/sync-version.js` propagates to `Cargo.toml` and `tauri.conf.json`
- CI in `.github/workflows/release.yml` verifies tag matches `package.json` version
- Build the app frontend version from `package.json` via `import { version } from "../../package.json"` (tsconfig has `resolveJsonModule: true`)

### CI/Release
- Push tag `v*` triggers `.github/workflows/release.yml`
- Builds MSI on `windows-latest`, generates `updater.json`, creates GitHub Release
- Requires WiX 4.0.5 (`dotnet tool install --global wix --version 4.0.5`)

### TypeScript Constraints
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — unused imports/vars cause build failure
- `resolveJsonModule: true` — direct JSON imports allowed

### .env
- `VITE_CURSEFORGE_API_KEY` is required (warns at build if placeholder)
- Copy from `.env.example`