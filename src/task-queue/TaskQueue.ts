import * as vscode from 'vscode';
import Task from './Task';

/**
 * Provides single-threaded task queue which runs single asynchronous
 * Task at a time. This restricts concurrent execution of credo
 * processes to prevent from running out machine resource.
 */
export default class TaskQueue {
  private tasks: Task[] = [];

  private busy: boolean = false;

  public get length(): number {
    return this.tasks.length;
  }

  public enqueue(task: Task): void {
    if (task.isEnqueued) {
      throw new Error(`Task is already enqueued. (uri: ${task.uri})`);
    }
    this.cancel(task.uri);
    // eslint-disable-next-line no-param-reassign
    task.isEnqueued = true;
    this.tasks.push(task);
    this.kick();
  }

  public cancel(uri: vscode.Uri): void {
    const uriString = uri.toString(true);
    this.tasks.forEach((task) => {
      if (task.uri.toString(true) === uriString) {
        task.cancel();
      }
    });
  }

  private async kick(): Promise<void> {
    if (this.busy) {
      return;
    }

    this.busy = true;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const task: Task | undefined = this.tasks[0];
      if (!task) {
        this.busy = false;
        return;
      }
      try {
        // eslint-disable-next-line no-await-in-loop
        await task.run();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error while running credo: ', e.message, e.stack);
      }
      this.tasks.shift();
    }
  }
}
