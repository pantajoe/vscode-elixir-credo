import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import CredoConfiguration from './CredoConfiguration';

const MIX_COMMAND = 'mix';

export function autodetectExecutePath(): string {
  const conf = vscode.workspace.getConfiguration('elixir.credo');
  const key = 'PATH';
  const paths = process.env[key];

  if (!paths) {
    return '';
  }

  let executePath = '';
  const pathParts = paths.split(path.delimiter);

  if (conf.get('executePath')) {
    pathParts.push(conf.get('executePath') as string);
  }

  pathParts.forEach((pathPart) => {
    const binPath = path.join(pathPart, MIX_COMMAND);
    if (fs.existsSync(binPath)) executePath = pathPart + path.sep;
  });

  return executePath;
}

export function getConfig(): CredoConfiguration {
  const conf = vscode.workspace.getConfiguration('elixir.credo');

  return {
    command: `${autodetectExecutePath()}${MIX_COMMAND}`,
    onSave: conf.get('onSave', true),
    configurationFile: conf.get('configurationFile', '.credo.exs'),
    credoConfiguration: conf.get('credoConfiguration', 'default'),
    strictMode: conf.get('strictMode', false),
    ignoreWarningMessages: conf.get('ignoreWarningMessages', false),
  };
}
