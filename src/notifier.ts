import * as vscode from 'vscode'
import { ProgressLocation } from 'vscode'
import { OutputChannel } from './logger'

export type NotifierType = 'info' | 'warn' | 'error'

const DefaultActions = {
  SHOW_OUTPUT: 'Show output',
  IGNORE: 'Ignore',
} as const

export type NotifierAction = LooseAutocomplete<(typeof DefaultActions)[keyof typeof DefaultActions]>

export class Notifier {
  /**
   * Shows a pending information message that resolves when the callback returns a value
   * or times out (Default timeout 30 seconds).
   */
  pending<Result>(
    message: string,
    task: (args: {
      progress: vscode.Progress<{ message?: string; increment?: number }>
      cancelToken: vscode.CancellationToken
    }) => Thenable<Result>,
  ): Thenable<Result | undefined> {
    return vscode.window.withProgress(
      {
        cancellable: true,
        title: message,
        location: ProgressLocation.Notification,
      },
      async (progress, cancelToken) => {
        progress.report({ increment: 0 })

        const result = await task({
          progress,
          cancelToken,
        })

        progress.report({ increment: 100 })

        return result
      },
    )
  }

  info<T extends string>(message: string): Thenable<T | undefined>
  info<T extends string>(message: string, ...actions: T[]): Thenable<T | undefined>
  info<T extends string>(message: string, ...actions: T[]): Thenable<T | undefined> {
    return this.notify('info', message, actions)
  }

  warn<T extends string>(message: string): Thenable<T | undefined>
  warn<T extends string>(message: string, ...actions: T[]): Thenable<T | undefined>
  warn<T extends string>(message: string, ...actions: T[]): Thenable<T | undefined> {
    return this.notify('warn', message, actions)
  }

  error<T extends string>(message: string): Thenable<T | undefined>
  error<T extends string>(message: string, ...actions: T[]): Thenable<T | undefined>
  error<T extends string>(message: string, ...actions: T[]): Thenable<T | undefined> {
    return this.notify('error', message, actions)
  }

  notify<T extends string>(type: NotifierType, message: string, actions: T[]): Thenable<T | undefined> {
    const notificationActions = actions.length ? actions : [DefaultActions.SHOW_OUTPUT as T]

    const notification =
      type === 'info'
        ? vscode.window.showInformationMessage(message, ...notificationActions)
        : type === 'warn'
          ? vscode.window.showWarningMessage(message, ...notificationActions)
          : type === 'error'
            ? vscode.window.showErrorMessage(message, ...notificationActions)
            : undefined

    if (!notification) throw new Error(`Unknown notifier type: ${type}`)

    return notification.then((value) => {
      if (value === DefaultActions.SHOW_OUTPUT) {
        OutputChannel.show()
        return undefined
      }

      return value
    })
  }
}

export const notifier = new Notifier()
