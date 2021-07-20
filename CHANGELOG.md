# Change Log

All notable changes to the "vscode-elixir-credo" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
