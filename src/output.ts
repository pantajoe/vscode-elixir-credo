export type CredoSeverity = 'readability' | 'design' | 'consistency' | 'refactor' | 'warning'

export interface CredoIssue {
  category: CredoSeverity
  check: string
  message: string
  filename: string | null
  line_no: number
  column: number | null
  column_end: number | null
  priority: number
  trigger: string | null
}

export interface CredoOutput {
  issues: CredoIssue[]
}

export interface CredoDiffOutput {
  diff: {
    fixed: CredoIssue[]
    new: CredoIssue[]
    old: CredoIssue[]
  }
}

export interface CredoInformation {
  config: {
    checks: string[]
    files: string[]
  }
  system: {
    credo: string
    elixir: string
    erlang: string
  }
}

export type CredoCommandOutput = CredoInformation | CredoOutput | CredoDiffOutput

export function isDiffOutput(output: CredoOutput | CredoDiffOutput): output is CredoDiffOutput {
  return 'diff' in output
}
