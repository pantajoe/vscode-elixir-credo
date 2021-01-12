# Change Log

All notable changes to the "vscode-elixir-credo" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added a configuration option `ignoreWarningMessages` in order to be able to ignore the following warning messages (especially if they come repeatedly, see #4):
  - "Found multiple files ... will use ..."
  - "... file does not exist. Ignoring ..."

### Fixed

- Improve warning message if the credo output is empty

## [0.1.1] - 2020-11-24

### Fixed

- If the issue was found with the issue's `trigger`, include its last character.

## [0.1.0] - 2020-11-24

### Added

- Use credo issues' `trigger`s to mark the correct substring (#2)

### Changed

- Display `'refactor'` issues as `Information` instead of hints (#3).
  This allows the issues to be displayed more clearly and also shown in the `Problems` panel.

## [0.0.5] - 2020-10-27

### Changed

- Improved the warning message when the `mix` command does not work.

## [0.0.4] - 2020-10-26

### Added

- Added keywords `elixir`, `credo`, `linter` to the extension's `package.json` to make easier to find

## [0.0.3] - 2020-10-25

### Added

- Include the execute path given in the extension's config into the env variable `PATH` of the `mix credo` command
  - It solves issues with specifying a path to the asdf-vm shims

## [0.0.2] - 2020-10-25

### Changed

- Changed display name to 'Elixir Linter (Credo)'

## [0.0.1] - 2020-10-25

### Added

- Initial release
- Supports configuration of a configuration file
- Supports configuration of the utilized configuration for credo
- Supports configuration whether to use credo's strict mode
- Supports configuring whether the linter is run when a document is saved
- Supports configuration of `mix`'s execute path
