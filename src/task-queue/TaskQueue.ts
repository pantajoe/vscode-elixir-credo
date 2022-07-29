import type vscode from 'vscode'
import { LogLevel, log } from '../logger'
import type Task from './Task'

/**
 * Provides single-threaded task queue which runs single asynchronous
 * Task at a time. This restricts concurrent execution of credo
 * processes to prevent from running out machine resource.
 */
export default class TaskQueue {
  private tasks: Task[] = []

  private busy = false

  public get length(): number {
    return this.tasks.length
  }

  public enqueue(task: Task): void {
    if (task.isEnqueued) {
      throw new Error(`Task is already enqueued. (uri: ${task.uri})`)
    }
    this.cancel(task.uri)
    task.isEnqueued = true
    this.tasks.push(task)
    this.kick()
  }

  public cancel(uri: vscode.Uri): void {
    const uriString = uri.toString(true)
    this.tasks.forEach((task) => {
      if (task.uri.toString(true) === uriString) {
        task.cancel()
      }
    })
  }

  private async kick(): Promise<void> {
    if (this.busy) {
      return
    }

    this.busy = true

    while (true) {
      const task: Task | undefined = this.tasks[0]
      if (!task) {
        this.busy = false
        return
      }
      try {
        await task.run()
      } catch (err) {
        log({ message: `Error while running credo: ${(err as Error).message}`, level: LogLevel.Debug })
      }
      this.tasks.shift()
    }
  }
}
