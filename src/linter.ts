import path from 'node:path'
import type * as vscode from 'vscode'
import { config } from './configuration'
import { credo } from './credo'
import { CredoUtils } from './credo-utils'

export class Linter {
  readonly abortController: AbortController = new AbortController()

  constructor(private readonly document: vscode.TextDocument) {}

  async run() {
    const { lintEverything } = config.resolved

    if (!lintEverything) {
      const projectFolder = CredoUtils.getProjectFolder(this.document.uri)
      const relativeDocumentPath = this.document.fileName.replace(`${projectFolder}${path.sep}`, '')

      const info = await credo.info(this.document.uri, {
        signal: this.abortController.signal,
      })
      if (!info.config.files.includes(relativeDocumentPath)) return null
    }

    return this.lint()
  }

  lint() {
    if (config.resolved.diffMode.enabled) return credo.diff(this.document, { signal: this.abortController.signal })

    return credo.suggest(this.document, { signal: this.abortController.signal })
  }

  cancel(): void {
    this.abortController.abort()
  }
}
