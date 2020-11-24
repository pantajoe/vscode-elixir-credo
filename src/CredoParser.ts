import * as vscode from 'vscode';
import { CredoSeverity, CredoIssue, CredoOutput } from './CredoOutput';
import { makeZeroBasedIndex } from './utilities';

export default class CredoParser {
  public static parseCredoOutput(credoOutput: CredoOutput, document: vscode.TextDocument): vscode.Diagnostic[] {
    const documentContent = document.getText();
    return credoOutput.issues.map((issue: CredoIssue) => this.parseCredoIssue(issue, documentContent));
  }

  public static parseCredoIssue(issue: CredoIssue, documentContent: string): vscode.Diagnostic {
    const currentLine = documentContent.split('\n')[makeZeroBasedIndex(issue.line_no)];
    let range;

    if (issue.column === null && issue.column_end === null && currentLine) {
      const columnStart = issue.trigger ? currentLine.indexOf(issue.trigger) : 0;
      const columnEnd = makeZeroBasedIndex(currentLine.length);

      range = new vscode.Range(
        makeZeroBasedIndex(issue.line_no),
        columnStart,
        makeZeroBasedIndex(issue.line_no),
        columnEnd,
      );
    } else {
      range = new vscode.Range(
        makeZeroBasedIndex(issue.line_no),
        makeZeroBasedIndex(issue.column),
        makeZeroBasedIndex(issue.line_no),
        makeZeroBasedIndex(issue.column_end),
      );
    }

    const severity = this.parseSeverity(issue.category);
    const message = `${issue.message} (${issue.category}:${issue.check})`;

    return new vscode.Diagnostic(range, message, severity);
  }

  private static parseSeverity(credoSeverity: CredoSeverity): vscode.DiagnosticSeverity {
    switch (credoSeverity) {
      case 'consistency': return vscode.DiagnosticSeverity.Warning;
      case 'design': return vscode.DiagnosticSeverity.Information;
      case 'readability': return vscode.DiagnosticSeverity.Information;
      case 'refactor': return vscode.DiagnosticSeverity.Hint;
      case 'warning': return vscode.DiagnosticSeverity.Warning;
      default: return vscode.DiagnosticSeverity.Error;
    }
  }
}
