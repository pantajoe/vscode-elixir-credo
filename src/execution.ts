import cp from 'child_process'
import path from 'path'
import vscode from 'vscode'
import type { CredoCommandOutput, CredoDiffOutput, CredoInformation, CredoOutput } from './output'
import type { TaskToken } from './task-queue'
import { parseCredoOutput } from './parser'
import { LogLevel, log } from './logger'
import { getCurrentConfiguration } from './configuration'
import { trunc } from './utilities'

const CredoInfoCommand = ['credo', 'info', '--format', 'json', '--verbose']

type LintDocumentCallback = (error: cp.ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => void

interface CreateLintDocumentCallbackArguments {
  token: TaskToken
  diagnosticCollection: vscode.DiagnosticCollection
  document: vscode.TextDocument
  onComplete?: () => void
}

export interface CredoExecutionArguments {
  cmdArgs: string[]
  document: vscode.TextDocument
  options: cp.ExecFileOptions
  onFinishedExecution: LintDocumentCallback
}

export function parseOutput<T extends CredoCommandOutput>(stdout: string | Buffer): T | null {
  const output = stdout.toString()

  if (!output.length) {
    log({
      message: trunc`Command \`${getCurrentConfiguration().command} credo\`
        returns empty output! Please check your configuration.
        Did you add or modify your dependencies? You might need to run \`mix deps.get\` or recompile.`,
      level: LogLevel.Error,
    })

    return null
  }

  try {
    const extractedJSON = output.substr(output.indexOf('{'))

    return JSON.parse(extractedJSON)
  } catch (e) {
    if (e instanceof SyntaxError) {
      log({
        message: `Error on parsing output (It might be non-JSON output): "${output.replace(/[\r\n \t]/g, ' ')}"`,
        level: LogLevel.Error,
      })
    }

    return null
  }
}

interface ReportErrorArguments {
  error: cp.ExecException | null
  stderr: string | Buffer
}

// checking whether running credo command results in an error
export function reportError({ error, stderr }: ReportErrorArguments): boolean {
  if (error?.signal === 'SIGTERM' || (error as any)?.code === 15 || (error as any)?.code === 'SIGTERM') {
    // do not report SIGTERM errors (happens when running credo processes are killed onDidCloseTextDocument)
    return true
  }

  const errorOutput = stderr.toString()
  if ((error as any)?.code === 'ENOENT') {
    log({
      message: trunc`\`${getCurrentConfiguration().command}\` is not executable.
      Try setting the option in this extension's configuration "elixir.credo.executePath"
      to the path of the mix binary.`,
      level: LogLevel.Error,
    })
    return true
  }

  if (error?.code === 127 || error?.code === 126) {
    log({
      message: `An error occurred: "${errorOutput}" - Error Object: ${JSON.stringify(error)}`,
      level: LogLevel.Error,
    })

    return true
  }

  if (errorOutput) {
    log({
      message: `Warning: "${errorOutput}"`,
      level: LogLevel.Warning,
    })
  }

  return false
}

export function createLintDocumentCallback({
  token,
  diagnosticCollection,
  document,
  onComplete,
}: CreateLintDocumentCallbackArguments): LintDocumentCallback {
  const { uri } = document

  return (error, stdout, stderr) => {
    if (token.isCanceled) return
    if (reportError({ error, stderr })) return

    diagnosticCollection.delete(uri)

    const output = parseOutput<CredoOutput | CredoDiffOutput>(stdout)
    if (!output) return

    log({ message: `Setting linter issues for document ${uri.fsPath}.`, level: LogLevel.Debug })
    diagnosticCollection.set(uri, parseCredoOutput({ credoOutput: output, document }))

    token.finished()

    if (onComplete) onComplete()
  }
}

function executeCredoProcess({
  cmdArgs,
  document,
  options,
  onFinishedExecution,
}: CredoExecutionArguments): cp.ChildProcess {
  log({
    message: trunc`Executing credo command \`${[getCurrentConfiguration().command, ...cmdArgs].join(' ')}\`
    for ${document.uri.fsPath} in directory ${options.cwd}`,
    level: LogLevel.Debug,
  })

  const credoProcess = cp.execFile(getCurrentConfiguration().command, cmdArgs, options, onFinishedExecution)

  if (credoProcess.stdin) {
    credoProcess.stdin.write(document.getText())
    credoProcess.stdin.end()
  }

  return credoProcess
}

export function executeCredo({
  cmdArgs,
  document,
  options,
  onFinishedExecution,
}: CredoExecutionArguments): cp.ChildProcess[] {
  if (getCurrentConfiguration().lintEverything) {
    const credoProcess = executeCredoProcess({ cmdArgs, document, options, onFinishedExecution })

    return [credoProcess]
  }

  const processes = []
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  const relativeDocumentPath = workspaceFolder
    ? document.fileName.replace(`${workspaceFolder.uri.fsPath}${path.sep}`, '')
    : document.fileName

  log({
    message: trunc`Retreiving credo information: Executing credo command
    \`${[getCurrentConfiguration().command, ...CredoInfoCommand].join(' ')}\` for ${document.uri.fsPath}
    in directory ${options.cwd}`,
    level: LogLevel.Debug,
  })

  const infoProcess = cp.execFile(
    getCurrentConfiguration().command,
    CredoInfoCommand,
    options,
    (error, stdout, stderr) => {
      if (reportError({ error, stderr })) return

      const credoInformation = parseOutput<CredoInformation>(stdout)
      if (!credoInformation) return

      // file paths of credo are shown in UNIX style with a '/' path separator
      credoInformation.config.files = credoInformation.config.files.map((filePath) => filePath.replace(/\//g, path.sep))

      if (!credoInformation.config.files.includes(relativeDocumentPath)) {
        onFinishedExecution(null, '{ "issues": [] }', '')
        return
      }

      const credoProcess = executeCredoProcess({ cmdArgs, document, options, onFinishedExecution })
      processes.push(credoProcess)
    },
  )
  processes.push(infoProcess)

  return processes
}
