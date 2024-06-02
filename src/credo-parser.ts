import * as vscode from 'vscode'
import type { CredoDiffOutput, CredoIssue, CredoOutput, CredoSeverity } from './output'
import { isDiffOutput } from './output'
import { makeZeroBasedIndex } from './util'

export class CredoParser {
  private constructor() {}

  /**
   * Parses a single Credo issue into a {@link vscode.Diagnostic}.
   * Receives a raw Credo issue object as well as the document content.
   */
  static parseCredoIssue(issue: CredoIssue, params: { text: string }): vscode.Diagnostic {
    const { text: documentContent } = params
    const lineNumber = makeZeroBasedIndex(issue.line_no)
    const currentLine = documentContent.split('\n')[lineNumber]
    const withoutColumn = issue.column === null && issue.column_end === null && !!currentLine
    const columns = withoutColumn
      ? CredoParser.getRangeFromTrigger(currentLine, issue.trigger)
      : {
          start: makeZeroBasedIndex(issue.column),
          end: makeZeroBasedIndex(issue.column_end),
        }
    const range = new vscode.Range(lineNumber, columns.start, lineNumber, columns.end)

    const severity = CredoParser.parseSeverity(issue.category)
    const message = `${issue.message} (${issue.category}:${issue.check})`

    return new vscode.Diagnostic(range, message, severity)
  }

  /**
   * Parses the output of Credo into an array of {@link vscode.Diagnostic}.
   * Receives the raw Credo output as well as the document.
   */
  static parseCredoOutput(output: CredoOutput | CredoDiffOutput, params: { document: vscode.TextDocument }) {
    const { document } = params
    const text = document.getText()
    const issues = isDiffOutput(output) ? output.diff.new : output.issues
    return issues.map((issue) => CredoParser.parseCredoIssue(issue, { text }))
  }

  /**
   * Converts a severity string from Credo to a {@link vscode.DiagnosticSeverity}.
   */
  private static parseSeverity(credoSeverity: CredoSeverity): vscode.DiagnosticSeverity {
    switch (credoSeverity) {
      case 'consistency':
        return vscode.DiagnosticSeverity.Warning
      case 'design':
        return vscode.DiagnosticSeverity.Information
      case 'readability':
        return vscode.DiagnosticSeverity.Information
      case 'refactor':
        return vscode.DiagnosticSeverity.Information
      case 'warning':
        return vscode.DiagnosticSeverity.Warning
      default:
        return vscode.DiagnosticSeverity.Error
    }
  }

  /**
   * Returns the range of the trigger in the line.
   *
   * @param line The line to search in, i.e., the content.
   * @param trigger The trigger to search for.
   * @returns Start and end index of the trigger in the line,
   * or a range that spans the entire line if the trigger is not found.
   */
  private static getRangeFromTrigger(line: string, trigger: unknown) {
    const defaultRange = { start: 0, end: line.length === 0 ? 1 : line.length }
    if (!trigger || typeof trigger !== 'string') return defaultRange

    // remove arity, e.g., 'Application.get_env/2' -> 'Application.get_env'
    const triggerWithoutArity = trigger.replace(/\/\d+$/, '')
    const index = line.indexOf(triggerWithoutArity)
    if (index !== -1) return { start: index, end: index + triggerWithoutArity.length }

    return defaultRange
  }
}
