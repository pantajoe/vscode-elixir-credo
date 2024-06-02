# Change Log

All notable changes to the "vscode-elixir-credo" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Complete rewrite of the extension

## [0.8.3] - 2023-04-17

### Added

- Ignore `SIGTERM` errors from credo and don't show an error message (#379, credit to @wceolin)
- Added diagnostic count to debug logs whenever a new linting run is triggered (#380)

### Fixed

- Upgraded all dependencies

## [0.8.2] - 2022-07-29

### Unrelated changes

- reverted "adapted `tsconfig.json` to allow synthetic default imports and enable `esModuleInterop` flag"

### Changed

- default merge base for Credo's diff mode is now `main` instead of `HEAD`
- correctly uses mix project folder instead of workspace folder (#163)

## [0.8.1] - 2022-07-29

### Fixed

- now looks up mix project folder recursively starting from the opened document (#163)

### Unrelated changes

- adapted `tsconfig.json` to allow synthetic default imports and enable `esModuleInterop` flag

## [0.8.0] - 2022-07-29

### Added

- added Credo's [diff mode](https://hexdocs.pm/credo/diff_command.html#from-git-merge-base) against a merge base (#104)
  - enable with setting `elixir.credo.diffMode.enabled`
  - change the default merge base `"HEAD"` by using the setting `elixir.credo.diffMode.mergeBase`

## [0.7.3] - 2022-07-28

### Added

- now searches for configuration file both in project root and `config/` directory (#81)

### Unrelated changes

- upgraded dependencies
- use @antfu's eslint configuration

## [0.7.2] - 2021-12-01

### Fixed

- do not show error messages for `SIGTERM` errors (#42)

## [0.7.1] - 2021-12-01

### Fixed

- do not treat `SIGTERM` error as a failure (no warning message) (#42)

## [0.7.0] - 2021-11-29

### Added

- Only execute credo for files within mix projects (#34)

### Changed

- **BREAKING CHANGE**: Now required minimum version of VS Code is `1.62.0`

### Fixed

- Update dev dependencies to latest version
- Update test dependencies to latest version
- Setup prettier and configure ESLint

## [0.6.2] - 2021-11-25

- Make most configurations also available in folder settings.

## [0.6.1] - 2021-09-06

- Small improvements to README

## [0.6.0] - 2021-09-04

### Added

- Allow specifying `Checks With Tag(s)`, so only checks with specified tags are used by credo (#30)
- Allow specifying `Checks Without Tag(s)`, so checks with specified tags are ignored by credo (#30)

### Changed

- Changed display name to `Credo (Elixir Linter)`

## [0.5.0] - 2021-07-20

### Changed

- rework internal `ConfigurationProvider`: instead of using a singleton, use functional approach

### Fixed

- Fixes evaluation of triggers within Credo issues as they can be arrays or other unknown types (#27)

## [0.4.5] - 2021-07-04

### Fixed

- Only add the configuration file configured in the extension's configuration to all found configuration file
  if it's an absolute path, the file exists, and it is not already found (#4)
- File paths in the output channel are not surronded by quotes anymore to resolve issues when opening these paths with `Cmd + Click` / `Ctrl + Click`

## [0.4.4] - 2021-04-16

### Fixed

- Only interrupt if an exit status code like ENOENT, 126 or 127 is present instead of using the stderr as well

## [0.4.3] - 2021-04-16

### Fixed

- Only interrupt due to errors when credo's exit status is ENOENT, 126, or 127, or when credo logs something to stderr

## [0.4.2] - 2021-04-16

### Changed

- Improve error reporting
  - Show proper error codes when executing commands and more information
  - Show working directory of a process executing credo
  - Fix a typo in an error message

## [0.4.1] - 2021-04-13

### Fixed

- Fixed Windows Support (#18, #19)

## [0.4.0] - 2021-04-10

### Added

- Support multiple workspaces (#8)
- Add an output channel to track the extension's processes
  - Added a configuration option `enableDebug` that enables extensive logging to the output channel, such as
    - configuration changes
    - spawned processes
    - credo CLI args
    - etc.

### Changed

- Remove configuration option `onSave` as this is the default and probably not toggled by anyone
- Rework of the codebase (no further changes in functionality)
- Increase test coverage

## [0.3.0] - 2021-03-27

### Added

- Support this extension also on Windows platforms by using the mix executable `mix.bat` (#10)
- Respect Credo's settings for including/excluding files when linting an Elixir file. (#6)
  - Added a config named `lintEverything` that enables one to bypass the config's file inclusion/exclusion mechanism if set to `true`,
    and, thus, lint any Elixir file.
- Only mark the `trigger` in the line, even if credo adds method arity to the trigger

### Changed

- Forward any warning/error message coming from credo itself ([#8.1](https://github.com/pantajoe/vscode-elixir-credo/issues/8#issuecomment-797399444))

### Fixed

- Fixed a bug where no credo command was issued after a command was cancelled (when a document was closed/deleted, for instance)
- Fixed bug where credo issues with the field `trigger` present, but without the trigger occurring unchanged in the line of the issue would not be created. (#9)

## [0.2.0] - 2021-01-12

### Added

- Added a configuration option `ignoreWarningMessages` in order to be able to ignore the following warning messages (especially if they come repeatedly, see #4):
  - "Found multiple files ... will use ..."
  - "... file does not exist. Ignoring ..."

### Fixed

- Improve warning message if the credo output is empty
- Try to capture only the JSON-part of the credo output if it includes info messages from mix, for instance.

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
