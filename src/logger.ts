import * as vscode from 'vscode'
import { config } from './configuration'

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof LOG_LEVELS)[number]

type LoggerMethods = {
  [key in LogLevel]: (message: string) => void
}

export const OutputChannel = vscode.window.createOutputChannel('Credo (Elixir Linter)')

export class Logger implements LoggerMethods {
  debug(message: string) {
    this.log('debug', message)
  }

  info(message: string) {
    this.log('info', message)
  }

  warn(message: string) {
    this.log('warn', message)
  }

  error(message: string) {
    this.log('error', message)
  }

  log(level: LogLevel, message: string) {
    if (level === 'debug' && !config.resolved.enableDebug) return

    OutputChannel.appendLine(`${level.toUpperCase()}: ${message}\n`)
  }
}

export const logger = new Logger()
