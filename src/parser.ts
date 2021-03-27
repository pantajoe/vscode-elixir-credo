import * as vscode from 'vscode';
import { CredoSeverity, CredoIssue, CredoOutput } from './CredoOutput';
import { makeZeroBasedIndex } from './utilities';

function parseSeverity(credoSeverity: CredoSeverity): vscode.DiagnosticSeverity {
  switch (credoSeverity) {
    case 'consistency': return vscode.DiagnosticSeverity.Warning;
    case 'design': return vscode.DiagnosticSeverity.Information;
    case 'readability': return vscode.DiagnosticSeverity.Information;
    case 'refactor': return vscode.DiagnosticSeverity.Information;
    case 'warning': return vscode.DiagnosticSeverity.Warning;
    default: return vscode.DiagnosticSeverity.Error;
  }
}

// eslint-disable-next-line max-len
export function parseCredoIssue({ issue, documentContent } : { issue: CredoIssue, documentContent: string }): vscode.Diagnostic {
  const currentLine = documentContent.split('\n')[makeZeroBasedIndex(issue.line_no)];
  let range;

  if (issue.column === null && issue.column_end === null && currentLine) {
    const columnStart = issue.trigger && currentLine.indexOf(issue.trigger) !== -1
      ? currentLine.indexOf(issue.trigger)
      : 0;
    const columnEnd = currentLine.length === 0 ? 1 : currentLine.length;

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

  const severity = parseSeverity(issue.category);
  const message = `${issue.message} (${issue.category}:${issue.check})`;

  return new vscode.Diagnostic(range, message, severity);
}

// eslint-disable-next-line max-len
export function parseCredoOutput({ credoOutput, document } : { credoOutput: CredoOutput, document: vscode.TextDocument }): vscode.Diagnostic[] {
  const documentContent = document.getText();
  return credoOutput.issues.map((issue: CredoIssue) => parseCredoIssue({ issue, documentContent }));
}
