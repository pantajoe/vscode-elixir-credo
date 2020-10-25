import * as vscode from 'vscode';
import { expect } from 'chai';
import CredoParser from '../../CredoParser';

describe('CredoParser', () => {
  context('#parseCredoIssue', () => {
    it('parses a credo issue correctly into a vscode diagnostic', () => {
      const parsedDiagnostic = CredoParser.parseCredoIssue({
        category: 'readability',
        check: 'Credo.Check.Readability.ModuleDoc',
        column: 11,
        column_end: 32,
        filename: 'lib/sample_web/telemetry.ex',
        line_no: 1,
        message: 'Modules should have a @moduledoc tag.',
        priority: 1,
        trigger: 'SampleWeb.Telemetry',
      });

      expect(parsedDiagnostic.message).to.equal(
        'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
      );
      expect(parsedDiagnostic.severity).to.equal(vscode.DiagnosticSeverity.Information);
      expect(parsedDiagnostic.range.start.line).to.equal(0);
      expect(parsedDiagnostic.range.start.character).to.equal(10);
      expect(parsedDiagnostic.range.end.line).to.equal(0);
      expect(parsedDiagnostic.range.end.character).to.equal(31);
    });
  });

  context('#parseCredoOutput', () => {
    it('parses the credo output to a vscode diagnostic array', () => {
      const parsedCollection = CredoParser.parseCredoOutput({
        issues: [
          {
            category: 'readability',
            check: 'Credo.Check.Readability.ModuleDoc',
            column: 11,
            column_end: 32,
            filename: 'lib/sample_web/telemetry.ex',
            line_no: 1,
            message: 'Modules should have a @moduledoc tag.',
            priority: 1,
            trigger: 'SampleWeb.Telemetry',
          },
          {
            category: 'design',
            check: 'Credo.Check.Design.AliasUsage',
            column: 7,
            column_end: 32,
            filename: 'test/support/channel_case.ex',
            line_no: 35,
            message: 'Nested modules could be aliased at the top of the invoking module.',
            priority: -9,
            trigger: 'Ecto.Adapters.SQL.Sandbox',
          },
        ],
      });

      expect(parsedCollection.length).to.equal(2);
    });
  });
});
