import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getConfig } from './configuration';

const DEFAULT_CONFIG_FILE = '.credo.exs';
const DEFAULT_COMMAND_ARGUMENTS = ['credo', '--format', 'json', '--read-from-stdin'];

export function makeZeroBasedIndex(index: number | undefined | null): number {
  if (index) {
    const zeroBasedIndex = index - 1;

    if (zeroBasedIndex < 0) {
      return 0;
    }

    return zeroBasedIndex;
  }

  return 0;
}

export function isFileUri(uri: vscode.Uri): boolean {
  return uri.scheme === 'file';
}

export function getCurrentPath(fileName: string): string {
  return vscode.workspace.rootPath || path.dirname(fileName);
}

export function getCommandArguments(): string[] {
  const commandArguments = [...DEFAULT_COMMAND_ARGUMENTS];
  const extensionConfig = getConfig();
  const configurationFile = extensionConfig.configurationFile || DEFAULT_CONFIG_FILE;

  const found = [configurationFile].concat(
    (vscode.workspace.workspaceFolders || []).map(
      (ws: vscode.WorkspaceFolder) => path.join(ws.uri.path, configurationFile),
    ),
  ).filter((p: string) => fs.existsSync(p));

  if (found.length === 0) {
    if (!extensionConfig.ignoreWarningMessages) {
      vscode.window.showWarningMessage(`${configurationFile} file does not exist. Ignoring...`);
    }
  } else {
    if (found.length > 1 && !extensionConfig.ignoreWarningMessages) {
      vscode.window.showWarningMessage(`Found multiple files (${found}) will use ${found[0]}`);
    }
    commandArguments.push('--config-file', found[0]);
  }

  if (extensionConfig.credoConfiguration) {
    commandArguments.push('--config-name', extensionConfig.credoConfiguration);
  }

  if (extensionConfig.strictMode) {
    commandArguments.push('--strict');
  }

  return commandArguments;
}

export function getCommandEnvironment(): NodeJS.ProcessEnv {
  const conf = vscode.workspace.getConfiguration('elixir.credo');
  const executePath = conf.get('executePath');

  if (executePath) {
    return {
      ...process.env,
      PATH: `${process.env.PATH}${path.delimiter}${executePath}`,
    };
  }

  return { ...process.env };
}
