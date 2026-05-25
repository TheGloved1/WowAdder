# WowAdder — Agent Guide

## Stack
- **Desktop:** Tauri v2 (Rust backend, React 19 + TypeScript frontend)
- **Build:** Bun, Vite 7, Tailwind CSS v4
- **Data fetching:** TanStack Query v5 (`@tanstack/react-query`) for CurseForge API calls
- **Routing:** React Router DOM v7 (`BrowserRouter` in `src/App.tsx`)
- **No test framework** in dependencies

## Key Commands
| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server on port 1420 (strict port) |
| `bun run build` | `tsc && vite build` — **must pass before committing** |
| `bun run format` | Prettier (`printWidth: 125`, single quotes, imports sorted) |
| `bun tauri dev` | Full Tauri desktop dev mode |
| `bun tauri build` | Build MSI installer |
| `bun run sync-version` | Sync `package.json` version → `Cargo.toml` + `tauri.conf.json` |
| `bun run release <patch\|minor\|major>` | Bump version + git tag |

## Project Structure
```
src/
  App.tsx              — QueryClientProvider + BrowserRouter + routes
  main.tsx             — Entry point
  components/
    Layout.tsx          — Header nav + Outlet + update banner (skipped in dev)
    Pagination.tsx      — Shared pagination UI
    wow/                — WoW-themed primitives: WoWButton, WoWPanel, WoWBadge, WoWIcon, WoWDivider
  hooks/
    useCurseforge.ts    — React Query hooks wrapping curseforge.ts services
  pages/               — One file per route (/, /addon/:id, /installed, /settings)
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

### React Query (CurseForge API calls)
- All CurseForge API calls use `@tanstack/react-query` via `src/hooks/useCurseforge.ts`
- **Do not** call `curseforge.ts` functions directly from components — use the hooks
- Query keys: `["gameVersions", gameId]`, `["searchMods", params]`, `["mod", modId]`, `["modFiles", modId, params]`, `["modDescription", modId]`
- All hooks are disabled when `VITE_CURSEFORGE_API_KEY` is unconfigured (checked via `getClientStatus()`)
- **`placeholderData: (prev) => prev`** on `useSearchMods`, `useMod`, `useModFiles` keeps previous data visible during refetches
- In `BrowsePage`, check `isPlaceholderData` to show loading skeleton when switching pages/filters while preserving pagination info: `const loading = searchModsQuery.isLoading || searchModsQuery.isPlaceholderData`
- `QueryClient` in `App.tsx` has `refetchOnWindowFocus: false`, `retry: 2`

### Dev mode guard
- `Layout.tsx` skips the Tauri updater check in dev mode: `if (import.meta.env.DEV) return`

### Adding a page
1. Create `src/pages/YourPage.tsx` with a default export
2. Add `<Route path="/your-path" element={<YourPage />} />` inside the `<Route element={<Layout />}>` block in `src/App.tsx`
3. Optionally add a `<Link>` in `src/components/Layout.tsx`

### Styling
- All styling via **Tailwind CSS v4** utility classes using `wow-*` theme tokens (`bg-wow-panel`, `text-wow-gold`, `border-wow-border-gold`)
- Theme switching: `<html data-theme="...">` — overrides defined in `index.css`
- Available schemes: `default` | `emerald` | `crimson` | `nightelf` | `frost`
- Use `WoWPanel`, `WoWButton`, `WoWDivider`, `WoWBadge`, `WoWIcon` from `src/components/wow/` for consistent styling
- Fonts: `font-wow-heading` (IM Fell English) for titles, `font-wow-body` (Inter) for body text
- Format with `bun run format` — Prettier config: `printWidth: 125`, `singleQuote: true`, `jsxSingleQuote: true`, uses `prettier-plugin-organize-imports` + `prettier-plugin-tailwindcss`

### Preferences
- `src/services/preferences.ts` — localStorage under `wowadder_pref_settings`
- `loadPrefs()` returns defaults-merged settings, `savePrefs(partial)` writes partial updates
- Apply theme on app mount via `document.documentElement.setAttribute("data-theme", prefs.colorScheme)` in `App.tsx`

### Tauri Backend
- Rust commands: `install_addon` (download + extract ZIP), `import_zip`
- Invoke via `import { invoke } from "@tauri-apps/api/core"` → `invoke<string>("command_name", { args })`
- Install progress emitted as events: `listen<number>("install-progress")` with values 0, 30, 50, 100
- Addon database stored at `<AddOnsFolder>/.wowadder/db.json` as JSON
- Addons folder path stored via `@tauri-apps/plugin-store`

### Version Management
- Single source of truth: `package.json` `"version"`
- `scripts/sync-version.js` propagates to `Cargo.toml` and `tauri.conf.json`

### TypeScript Constraints
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — unused imports/vars cause build failure
- `resolveJsonModule: true` — direct JSON imports allowed

### .env
- `VITE_CURSEFORGE_API_KEY` is required (warns at build if placeholder — see `vite.config.ts`)
- Copy from `.env.example`
