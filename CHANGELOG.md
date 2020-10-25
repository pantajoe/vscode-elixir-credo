# Change Log

All notable changes to the "vscode-elixir-credo" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

None

## [0.0.3] - 2020-10-24

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
