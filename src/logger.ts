import * as vscode from 'vscode'
import { getCurrentConfiguration } from './configuration'

export enum LogLevel {
  Debug = 0,
  Info = 1,
  Warning = 2,
  Error = 3,
}

export interface LogArguments {
  message: string
  level?: LogLevel
}

export const outputChannel = vscode.window.createOutputChannel('Credo (Elixir Linter)')

function logToOutputChannel(message: string): void {
  outputChannel.appendLine(`> ${message}\n`)
}

export function log({ message, level = LogLevel.Error }: LogArguments) {
  const { ignoreWarningMessages, enableDebug } = getCurrentConfiguration()

  switch (level) {
    case LogLevel.Debug:
      enableDebug && logToOutputChannel(message)
      break
    case LogLevel.Info:
      logToOutputChannel(message)
      break
    case LogLevel.Warning:
      logToOutputChannel(message)
      !ignoreWarningMessages && vscode.window.showWarningMessage(message)
      break
    case LogLevel.Error:
      logToOutputChannel(message)
      vscode.window.showErrorMessage(message)
      break
    default:
      break
  }
}
