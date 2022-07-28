import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import { getCurrentConfiguration } from './configuration'
import { LogLevel, log } from './logger'

const DEFAULT_CONFIG_FILE = '.credo.exs'
const DEFAULT_COMMAND_ARGUMENTS = ['credo', '--format', 'json', '--read-from-stdin']

export function makeZeroBasedIndex(index: number | undefined | null): number {
  if (index) {
    const zeroBasedIndex = index - 1

    if (zeroBasedIndex < 0) {
      return 0
    }

    return zeroBasedIndex
  }

  return 0
}

export function trunc(strings: TemplateStringsArray, ...placeholders: any[]): string {
  return strings.reduce((result, string, i) => result + placeholders[i - 1] + string).replace(/$\n^\s*/gm, ' ')
}

export function isFileUri(uri: vscode.Uri): boolean {
  return uri.scheme === 'file'
}

export function inMixProject(documentUri: vscode.Uri): boolean {
  const workspace = vscode.workspace.getWorkspaceFolder(documentUri)
  if (!workspace) return false

  return fs.existsSync(path.join(workspace.uri.fsPath, 'mix.exs'))
}

export function getCurrentPath(documentUri: vscode.Uri): string {
  const { fsPath: documentPath } = documentUri

  return vscode.workspace.getWorkspaceFolder(documentUri)?.uri?.fsPath || path.dirname(documentPath)
}

export const getCredoConfigFilePath = (documentUri?: vscode.Uri, opts?: { silent?: boolean }): string | null => {
  const { silent = false } = opts ?? {}

  const extensionConfig = getCurrentConfiguration()
  const configurationFile = extensionConfig.configurationFile || DEFAULT_CONFIG_FILE

  const currentWorkspaceFolder = documentUri ? vscode.workspace.getWorkspaceFolder(documentUri) : undefined
  const currentWorkspaces = currentWorkspaceFolder ? [currentWorkspaceFolder] : vscode.workspace.workspaceFolders ?? []

  const found = currentWorkspaces
    .flatMap((ws: vscode.WorkspaceFolder) => [
      path.join(ws.uri.fsPath, configurationFile),
      path.join(ws.uri.fsPath, 'config', configurationFile),
    ])
    .filter((fullPath: string) => fs.existsSync(fullPath))

  // add unchanged value of `configurationFile` in case it is an absolute path
  if (path.isAbsolute(configurationFile) && !found.includes(configurationFile) && fs.existsSync(configurationFile)) {
    found.push(configurationFile)
  }

  if (found.length === 0) {
    if (!silent) log({ message: `${configurationFile} file does not exist. Ignoring...`, level: LogLevel.Warning })
    return null
  } else {
    if (found.length > 1 && !silent) {
      log({ message: `Found multiple files (${found.join(', ')}). I will use ${found[0]}`, level: LogLevel.Warning })
    }
    return found[0]
  }
}

export function getCommandArguments(document?: vscode.TextDocument): string[] {
  const commandArguments = [...DEFAULT_COMMAND_ARGUMENTS]
  const extensionConfig = getCurrentConfiguration()

  const configFilePath = getCredoConfigFilePath(document?.uri)
  if (configFilePath) commandArguments.push('--config-file', configFilePath)

  if (extensionConfig.credoConfiguration) {
    commandArguments.push('--config-name', extensionConfig.credoConfiguration)
  }

  if (extensionConfig.checksWithTag.length) {
    extensionConfig.checksWithTag.forEach((tag) => {
      commandArguments.push('--checks-with-tag', tag)
    })
  } else if (extensionConfig.checksWithoutTag.length) {
    extensionConfig.checksWithoutTag.forEach((tag) => {
      commandArguments.push('--checks-without-tag', tag)
    })
  }

  if (extensionConfig.strictMode) {
    commandArguments.push('--strict')
  }

  return commandArguments
}

export function getCommandEnvironment(): NodeJS.ProcessEnv {
  const conf = vscode.workspace.getConfiguration('elixir.credo')
  const executePath = conf.get('executePath')

  if (executePath) {
    return {
      ...process.env,
      PATH: `${process.env.PATH}${path.delimiter}${executePath}`,
    }
  }

  return { ...process.env }
}
