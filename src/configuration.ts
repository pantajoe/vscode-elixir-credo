import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import * as vscode from 'vscode'
import { CredoUtils } from './credo-utils'

const MixCommand = {
  posix: 'mix',
  win32: 'mix.bat',
} as const

export interface CredoConfiguration {
  mixBinaryPath: string
  mixCommand: string
  configurationFile: string
  credoConfiguration: LooseAutocomplete<'default'>
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

export function detectExecutePath(defaultPath?: string) {
  const paths = process.env.PATH
  if (!paths) return ''

  const platform = CredoUtils.getPlatform()
  const pathParts = paths.split(path[platform].delimiter)
  if (defaultPath) pathParts.unshift(defaultPath)

  for (const pathPart of pathParts) {
    const execPath = path[platform].join(pathPart, MixCommand[platform])
    if (fs.existsSync(execPath)) return pathPart + path[platform].sep
  }

  return ''
}

export class ExtensionConfig {
  #config: CredoConfiguration

  constructor() {
    this.#config = this.fetch()
  }

  /**
   * Returns the current configuration.
   */
  get resolved(): CredoConfiguration {
    return this.#config
  }

  /**
   * Fetches the current configuration from the workspace settings.
   */
  fetch(): CredoConfiguration {
    const conf = vscode.workspace.getConfiguration('elixir.credo')
    const mixCommand = MixCommand[CredoUtils.getPlatform()]
    const mixBinaryPath = detectExecutePath(conf.get('executePath'))

    return {
      mixBinaryPath,
      mixCommand: `${mixBinaryPath}${mixCommand}`,
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
        mergeBase: conf.get('diffMode.mergeBase', 'main'),
      },
    }
  }

  /**
   * Reloads the current configuration from the workspace settings.
   */
  reload() {
    this.#config = this.fetch()
  }
}

export const config = new ExtensionConfig()
