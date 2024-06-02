import * as vscode from 'vscode'
import { config } from './configuration'
import { logger } from './logger'
import { CredoProvider } from './provider'

export class CredoExtension {
  activate(context: vscode.ExtensionContext) {
    const { workspace } = vscode
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('elixir')
    context.subscriptions.push(diagnosticCollection)

    const credo = new CredoProvider(diagnosticCollection)

    for (const document of workspace.textDocuments) {
      credo.execute(document)
    }

    workspace.onDidChangeConfiguration(() => {
      logger.debug('Extension configuration has changed. Refreshing configuration ...')
      config.reload()
    })

    workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
      credo.execute(document)
    })

    workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      credo.execute(document)
    })

    workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
      credo.clear(document)
    })

    logger.info('Credo (Elixir Linter) initiated successfully.')
  }
}
