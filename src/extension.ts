// this extension's structure is heavily inspired by https://github.com/misogi/vscode-ruby-rubocop

import * as vscode from 'vscode';
import ConfigurationProvider from './ConfigurationProvider';

export function activate(context: vscode.ExtensionContext) {
  const { workspace } = vscode;
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('elixir');
  context.subscriptions.push(diagnosticCollection);

  const credo = new CredoProvider({ diagnosticCollection });

  workspace.onDidChangeConfiguration(() => {
    ConfigurationProvider.instance.reloadConfig();
  });

  workspace.textDocuments.forEach((document: vscode.TextDocument) => {
    credo.execute(document);
  });

  workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
    credo.execute(document);
  });

  workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    if (credo.isOnSave) {
      credo.execute(document);
    }
  });

  workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
    credo.clear(document);
  });
}

export function deactivate() {}
