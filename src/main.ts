import type * as vscode from 'vscode'
import { CredoExtension } from './credo-extension'

const extension = new CredoExtension()

export function activate(context: vscode.ExtensionContext) {
  extension.activate(context)
}
