import * as vscode from 'vscode';
import ConfigurationProvider from './ConfigurationProvider';

export enum LogLevel {
  Info = 0,
  Warning = 1,
  Error = 2,
}

export interface LogArguments {
  message: string,
  level?: LogLevel,
}

export const outputChannel = vscode.window.createOutputChannel('Elixir Linter (Credo)');

export function log({ message, level = LogLevel.Error } : LogArguments) {
  const { ignoreWarningMessages } = ConfigurationProvider.instance.config;
  outputChannel.appendLine(message);

  switch (level) {
    case LogLevel.Info:
      break;
    case LogLevel.Warning:
      !ignoreWarningMessages && vscode.window.showWarningMessage(message);
      break;
    case LogLevel.Error:
      vscode.window.showErrorMessage(message);
      break;
    default:
      break;
  }
}
