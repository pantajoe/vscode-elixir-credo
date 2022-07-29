import vscode from 'vscode'
import { Task, TaskQueue } from './task-queue'
import { createLintDocumentCallback, executeCredo } from './execution'
import { LogLevel, log } from './logger'
import { getCommandArguments, getCommandEnvironment, getCurrentPath, inMixProject, isFileUri } from './utilities'

export interface CredoProviderOptions {
  diagnosticCollection: vscode.DiagnosticCollection
}

export interface CredoExecutionArgs {
  document: vscode.TextDocument
  onComplete?: (() => void) | undefined
}

export interface CredoClearArgs {
  document: vscode.TextDocument
}

export class CredoProvider {
  private diagnosticCollection: vscode.DiagnosticCollection

  public readonly taskQueue: TaskQueue

  constructor({ diagnosticCollection }: CredoProviderOptions) {
    this.diagnosticCollection = diagnosticCollection
    this.taskQueue = new TaskQueue()
  }

  public execute({ document, onComplete }: CredoExecutionArgs): void {
    const { languageId, isUntitled, uri } = document
    if (languageId !== 'elixir' || isUntitled || !isFileUri(uri) || !inMixProject(uri) || !document.getText()) {
      // git diff has elixir-mode. but it is Untitled file.
      return
    }

    const currentPath = getCurrentPath(uri)

    const task = new Task(uri, (token) => {
      const processes = executeCredo({
        cmdArgs: getCommandArguments(document),
        document,
        options: {
          cwd: currentPath,
          env: getCommandEnvironment(),
        },
        onFinishedExecution: createLintDocumentCallback({
          token,
          document,
          diagnosticCollection: this.diagnosticCollection,
          onComplete,
        }),
      })

      return () =>
        processes.forEach((process) => {
          process.kill()
        })
    })

    this.taskQueue.enqueue(task)
  }

  public clear({ document }: CredoClearArgs): void {
    const { uri } = document
    if (isFileUri(uri)) {
      log({
        message: `Removing linter messages and cancel running linting processes for ${uri.fsPath}.`,
        level: LogLevel.Debug,
      })
      this.taskQueue.cancel(uri)
      this.diagnosticCollection.delete(uri)
    }
  }

  public clearAll(): void {
    vscode.window.visibleTextEditors.forEach((textEditor) => {
      this.clear({ document: textEditor.document })
    })
  }
}
