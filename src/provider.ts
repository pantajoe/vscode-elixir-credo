import * as vscode from 'vscode'
import { CredoParser } from './credo-parser'
import { CredoUtils } from './credo-utils'
import { Linter } from './linter'
import { logger } from './logger'
import { Task, TaskQueue } from './task-queue'
import { isFileUri } from './util'

export interface CredoExecutionArgs {
  onComplete?: (() => void) | undefined
}

export class CredoProvider {
  #diagnosticCollection: vscode.DiagnosticCollection

  readonly queue: TaskQueue

  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
    this.#diagnosticCollection = diagnosticCollection
    this.queue = new TaskQueue()
  }

  execute(document: vscode.TextDocument) {
    const { languageId, isUntitled, uri } = document
    if (
      languageId !== 'elixir' ||
      isUntitled ||
      !isFileUri(uri) ||
      !CredoUtils.inMixProject(uri) ||
      !document.getText()
    ) {
      // git diff has elixir-mode. but it is Untitled file.
      return
    }

    const task = new Task(uri, (token) => {
      const linting = new Linter(document)
      linting
        .run()
        .then((output) => {
          if (token.isCanceled || !output) return

          this.#diagnosticCollection.delete(uri)
          const diagnostics = CredoParser.parseCredoOutput(output, { document })
          logger.debug(`Setting ${diagnostics.length} linter issues for document ${uri.fsPath}.`)
          this.#diagnosticCollection.set(uri, diagnostics)
        })
        .catch(() => {
          // ignore because already handled
        })
        .finally(() => {
          token.finished()
        })

      return {
        cancel: () => {
          linting.cancel()
        },
      }
    })

    this.queue.enqueue(task)
    return task
  }

  clear({ uri }: vscode.TextDocument) {
    if (!isFileUri(uri)) return

    logger.debug(`Removing linter messages and cancel running linting processes for ${uri.fsPath}.`)
    this.queue.cancel(uri)
    this.#diagnosticCollection.delete(uri)
  }

  clearAll() {
    for (const textEditor of vscode.window.visibleTextEditors) {
      this.clear(textEditor.document)
    }
  }
}
