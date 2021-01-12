# VS Code – Elixir Linter (Credo)

![CI](https://github.com/pantajoe/vscode-elixir-credo/workflows/CI/badge.svg)

This VS Code extension provides display of the output of the static code analysis tool [Credo](https://github.com/rrrene/credo)
for the programming language [Elixir](https://elixir-lang.org).

## Features

* Lint all opened documents and display diagnostics
* Specify whether the linting happens on save of a document
* Specify a custom configuration file for Credo
* Specify a custom configuration for Credo
* Specify a custom execute path for the `mix` binary

![Demo](./images/demo.gif)

## Requirements

Add the Elixir linter [Credo](https://github.com/rrrene/credo) to your dependencies in your project's `mix.exs` file
and install it by running `mix deps.get`.

## Extension Settings

This extension contributes the following settings:

* `elixir.credo.onSave`: Whether the extension should lint when a document is saved.
* `elixir.credo.configurationFile`: location of the configuration file Credo should use. Can be an absolute path, a relative path or simply a file.
* `elixir.credo.credoConfiguration`: name of the configuration Credo should use. Uses the default configuration per default (`default`).
* `elixir.credo.strictMode`: whether to utilize Credo's strict mode when linting.
* `elixir.credo.executePath`: execute path of the `mix` executable
* `elixir.credo.ignoreWarningMessages`: ignore warning messages (concerning finding the configuration file)

### Known Issues

> "The `mix` binary is not executable."

If this warning pops up, the vscode extension's credo child process does not have the path of the mix binary in its `PATH`.
Thus, try to set the correct path of the `mix` binary in the configuration's settings under `"elixir.credo.executePath"` (Elixir > Credo > **Execute Path**).

## Changelog

See [Changelog](/CHANGELOG.md)

## Contribution

When contributing, please refer to [the Contribution Guide](/CONTRIBUTING.md)

## License

This software is released under the [MIT License](/LICENSE).

&copy; 2020 Joe Pantazidis
