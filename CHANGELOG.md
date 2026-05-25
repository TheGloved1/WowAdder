## [0.3.6] - 2026-05-25

### Added

- **scripts**: add automatic changelog generation to release script

### Changed

- **changelog**: remove redundant blank lines


## [0.3.7] - 2026-05-25

### Added

- add changelog preview command, auto-push release, and in-app changelog viewer

### Changed

- **css**: restructure global layout and add custom scrollbar styles

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
