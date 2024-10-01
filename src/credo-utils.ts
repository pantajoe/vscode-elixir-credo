import type { ExecException, ExecFileException } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import * as vscode from 'vscode'
import { config } from './configuration'
import { logger } from './logger'
import { notifier } from './notifier'
import type { CredoCommandOutput } from './output'
import { findUp, trunc } from './util'

const DEFAULT_CONFIG_FILENAME = '.credo.exs'

/**
 * Utilities for interacting with the Credo CLI.
 */
export class CredoUtils {
  private constructor() {}

  /**
   * Checks the platform of the current OS.
   */
  static getPlatform(): 'win32' | 'posix' {
    return os.platform() === 'win32' ? 'win32' : 'posix'
  }

  /**
   * Check if a given document is part of a mix project.
   * It searches upward recursively for a `mix.exs` file.
   */
  static inMixProject(documentUri: vscode.Uri): boolean {
    const workspace = vscode.workspace.getWorkspaceFolder(documentUri)
    if (!workspace) return false

    const mixProjectPath = findUp('mix.exs', {
      startAt: path.dirname(documentUri.fsPath),
      stopAt: workspace.uri.fsPath,
    })

    return !!mixProjectPath
  }

  /**
   * Get the path of the mix project folder.
   * It searches upward recursively for a `mix.exs` file.
   * If no `mix.exs` file is found, the workspace folder is returned.
   * If no workspace folder is found, the document folder is returned.
   */
  static getProjectFolder(documentUri: vscode.Uri): string {
    const { fsPath: documentPath } = documentUri
    const workspace = vscode.workspace.getWorkspaceFolder(documentUri)

    const mixProjectPath = workspace
      ? findUp('mix.exs', {
          startAt: path.dirname(documentUri.fsPath),
          stopAt: workspace.uri.fsPath,
        })
      : undefined

    return mixProjectPath || workspace?.uri.fsPath || path.dirname(documentPath)
  }

  /**
   * Checks whether the folder path is an app inside an Umbrella project
   * and returns the root of the Umbrella project.
   */
  static getUmbrellaRoot(folderPath: string): string | null {
    const umbrellaRoot = path.join(folderPath, '..', '..')
    const appsDir = path.join(umbrellaRoot, 'apps')
    if (!fs.existsSync(appsDir)) return null
    if (!fs.existsSync(path.join(umbrellaRoot, 'mix.exs'))) return null

    return umbrellaRoot
  }

  static getCredoConfigFilePath(documentUri?: vscode.Uri): string | null {
    const configFilePath = config.resolved.configurationFile || DEFAULT_CONFIG_FILENAME
    //                                    ^?

    // add unchanged value of `configurationFile` in case it is an absolute path
    if (path.isAbsolute(configFilePath) && fs.existsSync(configFilePath)) return configFilePath

    const projectFolder = documentUri ? CredoUtils.getProjectFolder(documentUri) : undefined
    const umbrellaRoot = projectFolder ? CredoUtils.getUmbrellaRoot(projectFolder) : undefined
    const candidates = projectFolder
      ? [
          path.join(projectFolder, configFilePath),
          path.join(projectFolder, 'config', configFilePath),
          ...(umbrellaRoot ? [path.join(umbrellaRoot, configFilePath), path.join(umbrellaRoot, configFilePath)] : []),
        ]
      : []

    const found = candidates.filter((fullPath) => fs.existsSync(fullPath))

    if (found.length === 0) {
      logger.warn(`${configFilePath} file does not exist. Ignoring...`)
      notifier.warn(`${configFilePath} file does not exist. Ignoring...`)
      return null
    }
    if (found.length > 1) {
      logger.warn(`Found multiple files (${found.join(', ')}). I will use ${found[0]}`)
      notifier.warn(`Found multiple files (${found.join(', ')}). I will use ${found[0]}`)
    }

    return found[0].replace(`${projectFolder}${path.sep}`, '')
  }

  /**
   * Returns the arguments to be passed to the `credo suggest` command
   * depending on the extension configuration.
   */
  static getCredoSuggestArgs(documentUri?: vscode.Uri): string[] {
    const commandArguments: string[] = []
    const extensionConfig = config.resolved
    const configFilePath = CredoUtils.getCredoConfigFilePath(documentUri)

    if (configFilePath) commandArguments.push('--config-file', configFilePath)
    if (extensionConfig.credoConfiguration)
      commandArguments.push('--config-name', extensionConfig.credoConfiguration as string)

    if (extensionConfig.checksWithTag.length) {
      for (const tag of extensionConfig.checksWithTag) {
        commandArguments.push('--checks-with-tag', tag)
      }
    } else if (extensionConfig.checksWithoutTag.length) {
      for (const tag of extensionConfig.checksWithoutTag) {
        commandArguments.push('--checks-without-tag', tag)
      }
    }

    if (extensionConfig.strictMode) commandArguments.push('--strict')

    return commandArguments
  }

  static parseOutput<T extends CredoCommandOutput>(output: string): T | null {
    if (!output.length) {
      const msg = trunc`Command \`${config.resolved.mixCommand} credo\`
    returns empty output! Please check your configuration.
    Did you add or modify your dependencies? You might need to run \`mix deps.get\` or recompile.`

      logger.error(msg)
      notifier.error(msg)

      return null
    }

    try {
      const extractedJSON = output.substring(output.indexOf('{'), output.lastIndexOf('}') + 1)

      return JSON.parse(extractedJSON)
    } catch (e) {
      const outputLog = output.replace(/[\r\n \t]/g, ' ')

      // It's probably safe to ignore SIGTERM errors:
      // https://en.wikipedia.org/wiki/Signal_(IPC)#SIGTERM
      const isSIGTERM = outputLog.includes('SIGTERM')

      if (e instanceof SyntaxError && !isSIGTERM) {
        logger.error(`Error on parsing output (It might be non-JSON output): "${outputLog}"`)
        notifier.error(`Error on parsing output (It might be non-JSON output): "${outputLog}"`)
      }

      return null
    }
  }

  /**
   * Injects the path to the mix binary into the PATH environment variable
   * and returns the resulting environment.
   */
  static getCommandEnv(): NodeJS.ProcessEnv {
    const { mixBinaryPath } = config.resolved
    if (!mixBinaryPath) return { ...process.env }
    return {
      ...process.env,
      PATH: `${process.env.PATH}${path.delimiter}${mixBinaryPath}`,
    }
  }

  /**
   * Checking whether running credo command results in an error
   * and notifies the user if so.
   */
  static reportError(args: {
    error: ExecException | ExecFileException | null
    stderr: string
  }) {
    const { error, stderr } = args
    if (error?.signal === 'SIGTERM' || error?.code === 15 || error?.code === 'SIGTERM') {
      // do not report SIGTERM errors (happens when running credo processes are killed onDidCloseTextDocument)
      return 'error'
    }

    if (error?.code === 'ABORT_ERR' || error?.name === 'AbortError') {
      // do not report AbortError errors (happens when running credo processes are killed onDidCloseTextDocument)
      return 'error'
    }

    const errorOutput = stderr.toString()
    if (error?.code === 'ENOENT') {
      const msg = trunc`\`${config.resolved.mixCommand}\` is not executable.
  Try setting the option in this extension's configuration "elixir.credo.executePath"
  to the path of the mix binary.`
      logger.error(msg)
      notifier.error(msg)
      return 'error'
    }

    if (error?.code === 127 || error?.code === 126) {
      logger.error(`An error occurred: "${errorOutput}" - Error Object: ${JSON.stringify(error)}`)
      notifier.error(`An error occurred: "${errorOutput}" - Error Object: ${JSON.stringify(error)}`)
      return 'error'
    }

    if (errorOutput) {
      logger.warn(`Warning: "${errorOutput}"`)
      notifier.warn(`Warning: "${errorOutput}"`)
    }

    return 'ok'
  }
}
