import { execFile } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import type * as vscode from 'vscode'
import { config } from './configuration'
import { CredoUtils } from './credo-utils'
import { logger } from './logger'
import type { CredoDiffOutput, CredoInformation, CredoOutput } from './output'
import { trunc } from './util'

export interface CredoBaseExecutionOptions {
  signal?: AbortSignal
}

export interface MixExecutionOptions extends CredoBaseExecutionOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  document?: vscode.TextDocument
}

export class Credo {
  /**
   * Executes `credo suggest` command for the given file.
   * Credo's default command is `credo suggest` which is used to analyze the given file.
   */
  async suggest(document: vscode.TextDocument, opts: CredoBaseExecutionOptions = {}) {
    const command = ['credo', 'suggest']
    const args = [...CredoUtils.getCredoSuggestArgs(document.uri), '--format', 'json', '--read-from-stdin']

    const output = await this.mix(command, args, {
      ...this.options(document.uri),
      ...opts,
      document,
    })

    const result = CredoUtils.parseOutput<CredoOutput>(output)
    if (!result) throw new Error('Could not parse output')

    return result
  }

  /**
   * Executes `credo diff` command for the given file.
   * Analyzes the changes in the given file compared to the merge base of the current branch.
   */
  async diff(document: vscode.TextDocument, opts: CredoBaseExecutionOptions = {}) {
    const { enabled, mergeBase } = config.resolved.diffMode
    if (!enabled) throw new Error('Diff mode is not enabled')

    const command = ['credo', 'diff']
    const args = [
      ...CredoUtils.getCredoSuggestArgs(document.uri),
      '--format',
      'json',
      '--read-from-stdin',
      '--from-git-merge-base',
      mergeBase,
    ]

    const output = await this.mix(command, args, {
      ...this.options(document.uri),
      ...opts,
      document,
    })

    const result = CredoUtils.parseOutput<CredoDiffOutput>(output)
    if (!result) throw new Error('Could not parse output')

    return result
  }

  /**
   * Executes `credo info` command for the workspace directory of the given file.
   * Returns information about the Credo configuration.
   */
  async info(uri: vscode.Uri, opts: CredoBaseExecutionOptions = {}) {
    const command = ['credo', 'info']
    const args = ['--format', 'json', '--verbose']

    const output = await this.mix(command, args, {
      ...this.options(uri),
      ...opts,
    })
    const result = CredoUtils.parseOutput<CredoInformation>(output)
    if (!result) throw new Error('Could not parse output')

    // file paths of credo are shown in UNIX style with a '/' path separator
    result.config.files = result.config.files.map((filePath) => filePath.replace(/\//g, path.sep))
    return result
  }

  /**
   * Executes a `mix` command with the given arguments.
   * @returns A promise that resolves to the output of the command.
   */
  mix(command: string[], args: string[], opts: MixExecutionOptions = {}) {
    const { document, ...options } = opts
    logger.debug(trunc`Executing command
      \`${[this.mixBinary, ...command, ...args].join(' ')}\`${document ? ` for ${document.uri.fsPath}` : ''}
      in directory ${opts.cwd ?? process.cwd()}`)

    return new Promise<string>((resolve, reject) => {
      const childProcess = execFile(this.mixBinary, [...command, ...args], options, (error, stdout, stderr) => {
        if (CredoUtils.reportError({ error, stderr }) === 'error') return reject(error)

        resolve(stdout)
      })

      if (!document) return
      if (!childProcess.stdin) {
        logger.error('Could not get stdin of the child process')
        return reject(new Error('Could not get stdin of the child process'))
      }

      childProcess.stdin.write(document.getText())
      childProcess.stdin.end()
    })
  }

  /**
   * Returns the path to the mix binary.
   */
  get mixBinary() {
    return config.resolved.mixCommand
  }

  /**
   * Returns options containing the cwd and env to be used when executing
   * the mix binary.
   */
  options(uri: vscode.Uri): MixExecutionOptions {
    return {
      cwd: CredoUtils.getProjectFolder(uri),
      env: CredoUtils.getCommandEnv(),
    }
  }
}

export const credo = new Credo()
