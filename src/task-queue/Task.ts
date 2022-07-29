import type vscode from 'vscode'
import type TaskToken from './TaskToken'

type CancelCallback = () => void

/**
 * Task with async operation. It will be enqueued to and managed by
 * TaskQueue. Useful for spawning ChildProcess.
 */
export default class Task {
  public readonly uri: vscode.Uri

  public isEnqueued = false

  private body: (token: TaskToken) => CancelCallback

  private isCanceled = false

  private resolver?: () => void

  private onCancel?: CancelCallback

  /**
   * @param body Function of task body, which returns callback called
   *             when cancelation is requested. You should call
   *             token.finished() after async operation is done.
   */
  constructor(uri: vscode.Uri, body: (token: TaskToken) => CancelCallback) {
    this.uri = uri
    this.body = body
  }

  public run(): Promise<void> {
    if (this.isCanceled) {
      return new Promise<void>((resolve) => {
        resolve()
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const task = this
    return new Promise<void>((resolve, _reject) => {
      task.resolver = () => resolve()
      const token = {
        get isCanceled(): boolean {
          return task.isCanceled
        },

        finished(): void {
          task.resolveOnce()
        },
      }
      task.onCancel = this.body(token)
    })
  }

  public cancel(): void {
    if (this.isCanceled) {
      return
    }
    this.isCanceled = true
    if (this.onCancel) {
      this.onCancel()
    }
    this.resolveOnce()
  }

  private resolveOnce(): void {
    if (this.resolver) {
      this.resolver()
      this.resolver = undefined
    }
  }
}
