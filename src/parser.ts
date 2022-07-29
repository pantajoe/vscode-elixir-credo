import vscode from 'vscode'
import type { CredoDiffOutput, CredoIssue, CredoOutput, CredoSeverity } from './output'
import { isDiffOutput } from './output'
import { makeZeroBasedIndex } from './utilities'

function parseSeverity(credoSeverity: CredoSeverity): vscode.DiagnosticSeverity {
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

function triggerRange({ line, trigger }: { line: string; trigger: unknown }): { start: number; end: number } | null {
  if (!trigger || typeof trigger !== 'string') return null

  // remove arity, e.g., 'Application.get_env/2' -> 'Application.get_env'
  const triggerWithoutArity = trigger.replace(/\/\d+$/, '')
  const index = line.indexOf(triggerWithoutArity)
  if (index !== -1) return { start: index, end: index + triggerWithoutArity.length }

  return null
}

export function parseCredoIssue({
  issue,
  documentContent,
}: {
  issue: CredoIssue
  documentContent: string
}): vscode.Diagnostic {
  const lineNumber = makeZeroBasedIndex(issue.line_no)
  const currentLine = documentContent.split('\n')[lineNumber]
  let range

  if (issue.column === null && issue.column_end === null && currentLine) {
    const triggerIndices = triggerRange({ line: currentLine, trigger: issue.trigger })
    const columnStart = triggerIndices?.start || 0
    const columnEnd = currentLine.length === 0 ? 1 : triggerIndices?.end || currentLine.length

    range = new vscode.Range(lineNumber, columnStart, lineNumber, columnEnd)
  } else {
    range = new vscode.Range(
      lineNumber,
      makeZeroBasedIndex(issue.column),
      lineNumber,
      makeZeroBasedIndex(issue.column_end),
    )
  }

  const severity = parseSeverity(issue.category)
  const message = `${issue.message} (${issue.category}:${issue.check})`

  return new vscode.Diagnostic(range, message, severity)
}

export function parseCredoOutput({
  credoOutput,
  document,
}: {
  credoOutput: CredoOutput | CredoDiffOutput
  document: vscode.TextDocument
}): vscode.Diagnostic[] {
  const documentContent = document.getText()
  const issues = isDiffOutput(credoOutput) ? credoOutput.diff.new : credoOutput.issues
  return issues.map((issue: CredoIssue) => parseCredoIssue({ issue, documentContent }))
}
