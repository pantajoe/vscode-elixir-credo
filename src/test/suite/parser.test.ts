import * as vscode from 'vscode';
import { expect } from 'chai';
import { parseCredoIssue, parseCredoOutput } from '../../parser';
import { CredoIssue } from '../../CredoOutput';

describe('Parse Credo Output', () => {
  context('#parseCredoIssue', () => {
    it('parses a credo issue correctly into a vscode diagnostic', () => {
      const parsedDiagnostic = parseCredoIssue({
        issue: {
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
        documentContent: '',
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

    context('when `column` and `column_end` are null', () => {
      const credoIssue: CredoIssue = {
        category: 'design',
        check: 'Credo.Check.Design.TagTODO',
        column: null,
        column_end: null,
        filename: 'lib/sample_web/telemetry.ex',
        line_no: 2,
        message: 'Found a TODO tag in a comment: # TODO: any.',
        priority: 2,
        trigger: '# TODO: any',
      };

      it('marks the substring of the line when a trigger is given', () => {
        const parsedDiagnostic = parseCredoIssue({
          issue: credoIssue,
          documentContent: 'defmodule TestModule do\n  # TODO: any\nend\n',
        });

        expect(parsedDiagnostic.message).to.equal(
          'Found a TODO tag in a comment: # TODO: any. (design:Credo.Check.Design.TagTODO)',
        );
        expect(parsedDiagnostic.severity).to.equal(vscode.DiagnosticSeverity.Information);
        expect(parsedDiagnostic.range.start.line).to.equal(1);
        expect(parsedDiagnostic.range.start.character).to.equal(2);
        expect(parsedDiagnostic.range.end.line).to.equal(1);
        expect(parsedDiagnostic.range.end.character).to.equal(13);
      });

      it('marks the entire line otherwise', () => {
        const otherCredoIssue = {
          ...credoIssue,
          trigger: null,
        };
        const parsedDiagnostic = parseCredoIssue({
          issue: otherCredoIssue,
          documentContent: 'defmodule TestModule do\n  # TODO: any\nend\n',
        });

        expect(parsedDiagnostic.message).to.equal(
          'Found a TODO tag in a comment: # TODO: any. (design:Credo.Check.Design.TagTODO)',
        );
        expect(parsedDiagnostic.severity).to.equal(vscode.DiagnosticSeverity.Information);
        expect(parsedDiagnostic.range.start.line).to.equal(1);
        expect(parsedDiagnostic.range.start.character).to.equal(0);
        expect(parsedDiagnostic.range.end.line).to.equal(1);
        expect(parsedDiagnostic.range.end.character).to.equal(13);
      });
    });
  });

  context('#parseCredoOutput', () => {
    it('parses the credo output to a vscode diagnostic array', () => {
      const parsedCollection = parseCredoOutput({
        credoOutput: {
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
        },
        document: { getText: () => '' } as vscode.TextDocument,
      });

      expect(parsedCollection.length).to.equal(2);
    });
  });
});
