# VS Code – Elixir Linter (Credo)

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/pantajoe/vscode-elixir-credo/CI?style=for-the-badge)](https://github.com/pantajoe/vscode-elixir-credo/actions)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/pantajoe.vscode-elixir-credo?label=VS%20Code%20Downloads&style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=pantajoe.vscode-elixir-credo)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/pantajoe/vscode-elixir-credo?label=Open%20VSX%20Downloads&style=for-the-badge)](https://open-vsx.org/extension/pantajoe/vscode-elixir-credo)
[![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?style=for-the-badge)](http://opensource.org/licenses/MIT)

This VS Code extension provides display of the output of the static code analysis tool [Credo](https://github.com/rrrene/credo)
for the programming language [Elixir](https://elixir-lang.org).

## Features

* Lint all opened documents and display diagnostics
* Re-lint a document after saving it
* Either lint all elixir files or only those specified by the linting configuration
* Specify a custom configuration file for Credo
* Specify a custom configuration for Credo
* Specify a custom execute path for the `mix` binary

![Demo](./images/demo.gif)

## Requirements

Add the Elixir linter [Credo](https://github.com/rrrene/credo) to your dependencies in your project's `mix.exs` file
and install it by running `mix deps.get`.

## Extension Settings

This extension contributes the following settings:

* `elixir.credo.configurationFile`: location of the configuration file Credo should use. Can be an absolute path, a relative path or simply a file.
* `elixir.credo.credoConfiguration`: name of the configuration Credo should use. Uses the default configuration per default (`default`).
* `elixir.credo.strictMode`: whether to utilize Credo's strict mode when linting.
* `elixir.credo.executePath`: execute path of the `mix` executable
* `elixir.credo.ignoreWarningMessages`: ignore warning messages (concerning finding the configuration file)
* `elixir.credo.lintEverything`: lint any elixir file (even if excluded in the Credo configuration file)

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

&copy; 2020-2021 Joe Pantazidis
