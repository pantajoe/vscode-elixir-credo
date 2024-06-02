import type * as vscode from 'vscode'

export type CancelCallback = () => void

export interface TaskToken {
  readonly isCanceled: boolean
  finished: () => void
}

export interface TaskReturn {
  cancel: CancelCallback
}

/**
 * Task with async operation. It will be enqueued to and managed by
 * TaskQueue. Useful for spawning ChildProcess.
 */
export class Task {
  readonly id: string
  readonly uri: vscode.Uri
  isEnqueued = false
  body: (token: TaskToken) => TaskReturn

  private isCanceled = false
  private resolver?: () => void
  private promise?: Promise<void>
  private onCancel?: CancelCallback

  /**
   * @param uri VS Code document URI of the task. It will be used to identify the task.
   * @param body Function of task body, which returns callback called
   *             when cancelation is requested. You should call
   *             token.finished() after async operation is done.
   */
  constructor(uri: vscode.Uri, body: (token: TaskToken) => TaskReturn) {
    this.id = Math.random().toString(36).slice(2)
    this.uri = uri
    this.body = body
  }

  run(): Promise<void> {
    if (this.isCanceled) {
      this.promise = Promise.resolve()
      return this.promise
    }

    const task = this
    this.promise = new Promise<void>((resolve, _reject) => {
      task.resolver = () => resolve()

      const token = {
        get isCanceled() {
          return task.isCanceled
        },
        finished() {
          task.resolveOnce()
        },
      } satisfies TaskToken

      const { cancel } = this.body(token)
      task.onCancel = cancel
    })

    return this.promise
  }

  /**
   * Wait until the task is finished.
   */
  async finished(): Promise<void> {
    while (typeof this.promise === 'undefined') {
      // wait for promise to be created
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    return this.promise
  }

  cancel(): void {
    if (this.isCanceled) return

    this.isCanceled = true
    this.onCancel?.()
    this.resolveOnce()
  }

  private resolveOnce(): void {
    if (!this.resolver) return

    this.resolver()
    this.resolver = undefined
  }
}
