import type * as vscode from 'vscode'
import { logger } from '../logger'
import type { Task } from './task'

/**
 * Provides single-threaded task queue which runs single asynchronous
 * Task at a time. This restricts concurrent execution of credo
 * processes to prevent from running out machine resource.
 */
export class TaskQueue {
  private tasks: Task[] = []
  private busy = false

  get length(): number {
    return this.tasks.length
  }

  enqueue(task: Task): void {
    if (task.isEnqueued) throw new Error(`Task is already enqueued. (uri: ${task.uri})`)
    this.cancel(task.uri)
    task.isEnqueued = true
    this.tasks.push(task)
    this.kick()
  }

  cancel(uri: vscode.Uri): void {
    const uriString = uri.toString(true)
    for (const task of this.tasks) {
      if (task.uri.toString(true) === uriString) {
        task.cancel()
      }
    }
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
      } catch (err: unknown) {
        logger.debug(`Error while running credo: ${err}`)
      }
      this.tasks.shift()
    }
  }
}
