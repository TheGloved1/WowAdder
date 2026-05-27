## [0.3.24] - 2026-05-27

### Fixed

- **filters**: deselect categories without auto-excluding on toggle

### Other

- bump Cargo.lock version to 0.3.24

## [0.3.23] - 2026-05-27

### Added

- **cards**: redesigned addon cards with richer info and iconography
- **addon**: convert inline download dialog to shadcn Dialog component

## [0.3.22] - 2026-05-27

### Added

- **filters**: show active filter counts per section in sidebar

### Changed

- **preferences**: delegate localStorage to generic useLocalStorage hook

## [0.3.21] - 2026-05-27

### Changed

- **preferences**: replace imperative loadPrefs/savePrefs with reactive usePreferences hook

### Other

- **deps**: update Cargo.lock

## [0.3.20] - 2026-05-26

### Added

- add curseforge:// protocol handler and heading font picker

### Changed

- **curseforge**: switch to namespace import for discoverable type references

## [0.3.19] - 2026-05-26

### Changed

- **browse**: centralize browse state as URL-driven single source of truth

### Other

- **deps**: update Cargo.lock
- **readme**: reorder navigation, update prerequisites, add API key warning, refine tech stack

## [0.3.18] - 2026-05-26

### Added

- add shadcn/ui component library foundation
- **filters**: add multi-category/version sidebar with exclude support

### Changed

- **ui**: replace custom wow components with shadcn/ui

## [0.3.17] - 2026-05-25

### Added

- **backend**: add open_folder command and replace openPath with invoke

### Other

- update README with current feature set

## [0.3.16] - 2026-05-25

### Other

- enable supportDevs by default

## [0.3.15] - 2026-05-25

### Added

- **scripts**: add --undo flag to revert a release

### Changed

- **src-tauri**: optimize release and dev build profiles
- apply Prettier formatting across source files

## [0.3.14] - 2026-05-25

### Other

- **deps**: update Cargo.lock

## [0.3.13] - 2026-05-25

### Added

- bring window to foreground when download is detected

## [0.3.12] - 2026-05-25

### Added

- **backend**: add download watching infrastructure
- **ui**: add download dialog and watch folder settings

### Changed

- run Prettier across source files

## [0.3.11] - 2026-05-25

### Added

- add support-developers toggle to settings

### Changed

- **install**: track progress per file and remove installDone state

### Other

- bump Cargo.lock version to 0.3.10

## [0.3.10] - 2026-05-25

### Added

- **settings**: add GitHub link to settings page

## [0.3.9] - 2026-05-25

### Fixed

- **ui**: Add default cursor on button hover

## [0.3.8] - 2026-05-25

### Fixed

- **changelog**: correct release script to handle changelog entries with entries starting from top

## [0.3.7] - 2026-05-25

### Added

- add changelog preview command, auto-push release, and in-app changelog viewer

### Changed

- **css**: restructure global layout and add custom scrollbar styles

## [0.3.6] - 2026-05-25

### Added

- **scripts**: add automatic changelog generation to release script

### Changed

- **changelog**: remove redundant blank lines

## [0.3.5] - 2026-05-25

### Fixed

- **release**: update changelog entry and add missing tauri config files
- **hooks**: improve UX by adding placeholderData to keep previous data while fetching

## [0.3.4] - 2026-05-25

### Changed

- **release**: add helper function for "no" answers and standardize prompts

## [0.3.3] - 2026-05-25

### Added

- **scripts**: auto-push release and categorize unknown commits in CHANGELOG

### Fixed

- **scripts**: ensure changelog generation uses latest tag from remote

### Other

- update AGENTS.md with React Query patterns, dev mode guard, and format command
- **package.json**: remove unused release push scripts

## [0.3.2] - 2026-05-25

### Added

- **ci**: use tag-specific changelog as GitHub release body

## [0.3.1] - 2026-05-25

### Added

- **readme**: update project description and add work-in-progress labels
- add React Query with CurseForge data hooks

### Changed

- **pages**: convert to React Query and extract Pagination component
- **scripts**: swap release and release:no-changelog commands

## [0.3.0] - 2026-05-23

### Added

- **settings**: add color theme system with Settings page and theme switcher

### Changed

- **scripts**: extract changelog and tag push into separate commands
