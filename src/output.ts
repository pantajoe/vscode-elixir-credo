export interface CredoCommandOutput {}

export type CredoSeverity = 'readability' | 'design' | 'consistency' | 'refactor' | 'warning';

export interface CredoIssue {
  category: CredoSeverity;
  check: string;
  message: string;
  filename: string | null;
  line_no: number;
  column: number | null;
  column_end: number | null;
  priority: number;
  trigger: string | null;
}

export interface CredoOutput extends CredoCommandOutput {
  issues: CredoIssue[];
}

export interface CredoInformation extends CredoCommandOutput {
  config: {
    checks: string[],
    files: string[],
  };
  system: {
    credo: string,
    elixir: string,
    erlang: string,
  };
}
