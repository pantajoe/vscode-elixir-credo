import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { TaskQueue, Task, TaskToken } from './taskQueue';
import CredoConfiguration from './CredoConfiguration';
import { getConfig } from './configuration';
import { CredoInformation, CredoOutput } from './CredoOutput';
import { parseCredoOutput } from './parser';
import {
  isFileUri,
  getCurrentPath,
  getCommandArguments,
  getCommandEnvironment,
} from './utilities';

interface CredoExecutionArguments {
  cmdArgs: string[],
  document: vscode.TextDocument,
  options: cp.ExecFileOptions,
  onFinishedExecution: (error: cp.ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => void,
}

export interface CredoProviderOptions {
  diagnosticCollection: vscode.DiagnosticCollection,
}

export class CredoProvider {
  public config: CredoConfiguration;

  private diagnosticCollection: vscode.DiagnosticCollection;

  private taskQueue = new TaskQueue();

  constructor({ diagnosticCollection } : CredoProviderOptions) {
    this.diagnosticCollection = diagnosticCollection;
    this.config = getConfig();
  }

  public execute(document: vscode.TextDocument, onComplete?: () => void): void {
    if (
      (document.languageId !== 'elixir')
      || document.isUntitled
      || !isFileUri(document.uri)
    ) {
      // git diff has elixir-mode. but it is Untitled file.
      return;
    }

    const { fileName, uri } = document;
    const currentPath = getCurrentPath(fileName);
    // eslint-disable-next-line max-len
    const createLintDocumentCallback: (token: TaskToken) => (error: cp.ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => void = (token) => (error, stdout, stderr) => {
      if (token.isCanceled) return;
      if (this.hasError(error, stderr.toString())) return;

      this.diagnosticCollection.delete(uri);
      const output = this.parse(stdout.toString());
      if (output === undefined || output === null) return;

      this.diagnosticCollection.set(uri, parseCredoOutput({ credoOutput: output, document }));

      token.finished();

      if (onComplete) onComplete();
    };

    const task = new Task(uri, (token) => {
      const processes = this.executeCredo({
        cmdArgs: getCommandArguments(),
        document,
        options: {
          cwd: currentPath,
          env: getCommandEnvironment(),
        },
        onFinishedExecution: createLintDocumentCallback(token),
      });

      return () => processes.forEach((process) => { process.kill(); });
    });

    this.taskQueue.enqueue(task);
  }

  public get isOnSave(): boolean {
    return this.config.onSave;
  }

  public clear(document: vscode.TextDocument): void {
    const { uri } = document;
    if (isFileUri(uri)) {
      this.taskQueue.cancel(uri);
      this.diagnosticCollection.delete(uri);
    }
  }

  public clearAll(): void {
    vscode.window.visibleTextEditors.forEach((textEditor) => {
      this.clear(textEditor.document);
    });
  }

  // eslint-disable-next-line max-len
  private executeCredo({ cmdArgs, document, options, onFinishedExecution } : CredoExecutionArguments): cp.ChildProcess[] {
    if (this.config.lintEverything) {
      const credoProcess = this.executeCredoProcess({ cmdArgs, document, options, onFinishedExecution });

      return [credoProcess];
    }

    const processes = [];
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const relativeDocumentPath = workspaceFolder
      ? document.fileName.replace(`${workspaceFolder.uri.path}${path.sep}`, '')
      : document.fileName;

    // eslint-disable-next-line max-len
    const infoProcess = cp.execFile(this.config.command, ['credo', 'info', '--format', 'json', '--verbose'], options, (error, stdout, stderr) => {
      if (this.hasError(error, stderr.toString())) return;

      const credoInformation = this.parseCredoInformation(stdout);
      if (!credoInformation?.config?.files?.includes(relativeDocumentPath)) {
        onFinishedExecution(null, '{ "issues": [] }', '');
        return;
      }

      const credoProcess = this.executeCredoProcess({ cmdArgs, document, options, onFinishedExecution });
      processes.push(credoProcess);
    });
    processes.push(infoProcess);

    return processes;
  }

  // eslint-disable-next-line max-len
  private executeCredoProcess({ cmdArgs, document, options, onFinishedExecution } : CredoExecutionArguments) : cp.ChildProcess {
    const credoProcess = cp.execFile(this.config.command, cmdArgs, options, onFinishedExecution);
    if (credoProcess.stdin) {
      credoProcess.stdin.write(document.getText());
      credoProcess.stdin.end();
    }

    return credoProcess;
  }

  // parse credo (JSON) output
  private parse(output: string): CredoOutput | null {
    return this.parseOutput(output);
  }

  private parseCredoInformation(output: string): CredoInformation | null {
    return this.parseOutput(output);
  }

  private parseOutput(output: string): any | null {
    if (output.length < 1) {
      vscode.window.showWarningMessage(
        `command \`${this.config.command} credo\` returns empty output! please check configuration.
        Did you add or modify your dependencies? You might need to run \`mix deps.get\` or recompile.`,
      );

      return null;
    }

    try {
      const extractedJSON = output.substr(output.indexOf('{'));

      return JSON.parse(extractedJSON);
    } catch (e) {
      if (e instanceof SyntaxError) {
        vscode.window.showWarningMessage(
          `Error on parsing output (It might be non-JSON output): "${output.replace(/[\r\n \t]/g, ' ')}"`,
        );
      }

      return null;
    }
  }

  // checking whether running credo command results in an error
  private hasError(error: cp.ExecException | null, stderr: string): boolean {
    if ((error as any)?.code === 'ENOENT') {
      vscode.window.showWarningMessage(`\`${this.config.command}\` is not executable.
        Try setting the option in this extension's configuration "elixir.credo.executePath"
        to the path of the mix binary.`);
      return true;
    }

    if (stderr) {
      vscode.window.showWarningMessage(stderr);
      return true;
    }

    return false;
  }
}
