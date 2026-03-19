# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2] - 2026-03-19

### Changed

- Refactored codebase from single-file to modular structure
  - `src/config.js` - Configuration management
  - `src/args.js` - CLI argument parsing
  - `src/speller.js` - Spell checking logic
  - `src/clipboard.js` - Platform-specific clipboard operations
  - `src/dictionary.js` - Dictionary API integration
- `bin/spell.js` is now the entry point orchestrating modules

### Added

- `files` field in package.json to ensure `src/` directory is included in npm packages

### Changed

- Dictionary definitions now show up to 2 definitions when available (instead of just the first one)

## [0.1.1] - Previous release

- Initial release with basic spelling correction
- Definition lookup via dictionaryapi.dev
- Clipboard support on Linux and macOS
- Persistent clipboard default configuration
