import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const MIX_COMMAND = {
  unix: 'mix',
  win32: 'mix.bat',
};

export interface CredoConfiguration {
  command: string;
  configurationFile: string;
  credoConfiguration: string | 'default';
  strictMode: boolean;
  ignoreWarningMessages: boolean;
  lintEverything: boolean;
  enableDebug: boolean;
}

export function autodetectExecutePath(): string {
  const conf = vscode.workspace.getConfiguration('elixir.credo');
  const key = 'PATH';
  const paths = process.env[key];

  if (!paths) return '';

  let executePath = '';
  const pathParts = paths.split(path.delimiter);

  if (conf.get('executePath')) {
    pathParts.push(conf.get('executePath') as string);
  }

  pathParts.forEach((pathPart) => {
    const binPath = os.platform() === 'win32'
      ? path.join(pathPart, MIX_COMMAND.win32)
      : path.join(pathPart, MIX_COMMAND.unix);

    if (fs.existsSync(binPath)) executePath = pathPart + path.sep;
  });

  return executePath;
}

export function getConfig(): CredoConfiguration {
  const conf = vscode.workspace.getConfiguration('elixir.credo');
  const mixCommand = os.platform() === 'win32' ? MIX_COMMAND.win32 : MIX_COMMAND.unix;

  return {
    command: `${autodetectExecutePath()}${mixCommand}`,
    configurationFile: conf.get('configurationFile', '.credo.exs'),
    credoConfiguration: conf.get('credoConfiguration', 'default'),
    strictMode: conf.get('strictMode', false),
    ignoreWarningMessages: conf.get('ignoreWarningMessages', false),
    lintEverything: conf.get('lintEverything', false),
    enableDebug: conf.get('enableDebug', false),
  };
}
