import * as vscode from 'vscode';
import * as cp from 'child_process';
import { TaskQueue, Task, TaskToken } from './taskQueue';
import CredoConfiguration from './CredoConfiguration';
import { getConfig } from './configuration';
import { CredoOutput } from './CredoOutput';
import CredoParser from './CredoParser';
import {
  isFileUri,
  getCurrentPath,
  getCommandArguments,
  getCommandEnvironment,
} from './utilities';

export default class CredoProvider {
  public config: CredoConfiguration;

  private diagnosticCollection: vscode.DiagnosticCollection;

  private taskQueue = new TaskQueue();

  constructor(diagnosticCollection: vscode.DiagnosticCollection) {
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

      this.diagnosticCollection.set(uri, CredoParser.parseCredoOutput(output, document));

      token.finished();

      if (onComplete) onComplete();
    };

    const task = new Task(uri, (token) => {
      // eslint-disable-next-line max-len
      const process = this.executeCredo(
        getCommandArguments(),
        document.getText(),
        {
          cwd: currentPath,
          env: getCommandEnvironment(),
        },
        createLintDocumentCallback(token),
      );

      return () => process.kill();
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

  private executeCredo(
    args: string[],
    fileContents: string,
    options: cp.ExecFileOptions,
    callback: (error: cp.ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => void,
  ): cp.ChildProcess {
    const child = cp.execFile(this.config.command, args, options, callback);
    if (child.stdin) {
      child.stdin.write(fileContents);
      child.stdin.end();
    }

    return child;
  }

  // parse credo (JSON) output
  private parse(output: string): CredoOutput | null {
    if (output.length < 1) {
      vscode.window.showWarningMessage(
        `command \`${this.config.command} credo\` returns empty output! please check configuration.
        Did you add or modify your dependencies? You might need to run \`mix deps.get\` or recompile.`,
      );

      return null;
    }

    try {
      return JSON.parse(output);
    } catch (e) {
      if (e instanceof SyntaxError) {
        vscode.window.showWarningMessage(
          `Error on parsing output (It might non-JSON output) : "${output.replace(/[\r\n \t]/g, ' ')}"`,
        );
      }

      return null;
    }
  }

  // checking whether running credo command results in an error
  private hasError(error: cp.ExecException | null, stderr: string): boolean {
    if (error && (error as any).code === 'ENOENT') {
      vscode.window.showWarningMessage(`\`${this.config.command}\` is not executable.
        Try setting the option in this extension's configuration "elixir.credo.executePath"
        to the path of the mix binary.`);
      return true;
    }

    if (error && (error as any).code === 127) {
      vscode.window.showWarningMessage(stderr);
      return true;
    }

    return false;
  }
}
