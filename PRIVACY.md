# Privacy Policy

**Last updated:** June 12, 2026

WowAdder is a desktop addon manager for World of Warcraft. This policy describes what information the application collects, how it is used, and your rights.

## Data Collection

### What We Collect

**Local preferences** — stored in your browser's localStorage:

- UI theme, heading font, page size, sort options, search history, and category filters
- Download watch folder paths and toggle states (developer support, ZIP cleanup, deep linking)

**Installed addon database** — stored as a JSON file in your WoW AddOns folder:

- CurseForge mod IDs, file IDs, version strings, folder names, and install timestamps
- This data never leaves your machine

**Addons folder path** — stored via Tauri's plugin-store in your system's app data directory

### What We Do NOT Collect

- No personal information (name, email, address)
- No account credentials or passwords
- No IP address logging
- No hardware or device identifiers
- No system information (OS, screen resolution, etc.)
- No telemetry, analytics, or usage statistics
- No crash reports or error logs sent externally
- No cookies
- No clipboard, camera, microphone, or location data
- No network scanning or local network enumeration

## Network Communications

All external traffic uses HTTPS only.

| Service                                                | Purpose                       | Data Sent                                                     |
| ------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------- |
| **CurseForge API** (`api.curseforge.com`)              | Searching and browsing addons | Search terms, mod IDs, category/sort filters, project API key |
| **CurseForge CDN** (`edge.forgecdn.net`)               | Downloading addon ZIP files   | Public file IDs and filenames                                 |
| **GitHub Releases** (`github.com/TheGloved1/WowAdder`) | Checking for app updates      | Standard HTTP request (no identifying data)                   |

No data from your addon library, preferences, or usage patterns is ever sent to the application developer or any analytics service.

## Filesystem Access

WowAdder reads and writes files only in locations you explicitly configure:

- Your selected WoW **AddOns folder** (reading `.toc` files, managing addon files, storing the addon database)
- **Download watch folders** you choose (detecting downloaded ZIP files)
- **ZIP files** you select via the system file picker (importing addons)

The app does not scan or access files outside these paths without your direction.

## Third-Party Services

- **CurseForge** provides the addon catalog and download hosting. Your interactions with their API are subject to [CurseForge's privacy policy](https://www.curseforge.com/privacy).
- **GitHub** hosts the update manifest and application releases. Update checks are governed by [GitHub's privacy policy](https://docs.github.com/en/site-policy/privacy-policies).

## Data Retention & Deletion

All data is stored locally on your machine:

- **Preferences** — cleared if you clear your browser/localStorage data
- **Addon database** — located at `<AddOnsFolder>/.wowadder/db.json`; delete the `.wowadder` folder to remove it
- **Complete removal** — uninstalling WowAdder and deleting its configuration directories removes all stored data

## Your Rights

Since all data is stored locally and no personal data is collected by the developer, you have full control:

- View or modify preferences within the app's Settings page
- Delete the addon database at any time via your file system
- Uninstall the application to remove all local data

## Changes to This Policy

If this policy changes, the "Last updated" date at the top will reflect the revision. Continued use of the application after changes constitutes acceptance of the updated policy.

## Contact

For questions about this privacy policy, open an issue at:
[https://github.com/TheGloved1/WowAdder/issues](https://github.com/TheGloved1/WowAdder/issues)
