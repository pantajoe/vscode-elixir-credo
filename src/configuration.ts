import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as vscode from 'vscode'

const MixCommand = {
  unix: 'mix',
  win32: 'mix.bat',
}

export interface CredoConfiguration {
  command: string
  configurationFile: string
  credoConfiguration: string | 'default'
  strictMode: boolean
  ignoreWarningMessages: boolean
  lintEverything: boolean
  enableDebug: boolean
  checksWithTag: string[]
  checksWithoutTag: string[]
  diffMode: {
    enabled: boolean
    mergeBase: string
  }
}

export function autodetectExecutePath(): string {
  const conf = vscode.workspace.getConfiguration('elixir.credo')
  const key = 'PATH'
  const paths = process.env[key]

  if (!paths) return ''

  let executePath = ''
  const pathParts = paths.split(path.delimiter)

  if (conf.get('executePath')) {
    pathParts.push(conf.get('executePath') as string)
  }

  pathParts.forEach((pathPart) => {
    const binPath =
      os.platform() === 'win32' ? path.join(pathPart, MixCommand.win32) : path.join(pathPart, MixCommand.unix)

    if (fs.existsSync(binPath)) executePath = pathPart + path.sep
  })

  return executePath
}

export function fetchConfig(): CredoConfiguration {
  const conf = vscode.workspace.getConfiguration('elixir.credo')
  const mixCommand = os.platform() === 'win32' ? MixCommand.win32 : MixCommand.unix

  return {
    command: `${autodetectExecutePath()}${mixCommand}`,
    configurationFile: conf.get('configurationFile', '.credo.exs'),
    credoConfiguration: conf.get('credoConfiguration', 'default'),
    strictMode: conf.get('strictMode', false),
    checksWithTag: conf.get('checksWithTag', []),
    checksWithoutTag: conf.get('checksWithoutTag', []),
    ignoreWarningMessages: conf.get('ignoreWarningMessages', false),
    lintEverything: conf.get('lintEverything', false),
    enableDebug: conf.get('enableDebug', false),
    diffMode: {
      enabled: conf.get('diffMode.enabled', false),
      mergeBase: conf.get('diffMode.mergeBase', 'HEAD'),
    },
  }
}

let configuration: CredoConfiguration

export function getCurrentConfiguration(): CredoConfiguration {
  if (!configuration) {
    configuration = { ...fetchConfig() }
  }
  return configuration
}

export function reloadConfiguration(configurationFetcher: () => CredoConfiguration = fetchConfig): void {
  configuration = { ...configurationFetcher() }
}
