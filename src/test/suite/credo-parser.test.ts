import { expect } from 'chai'
import * as vscode from 'vscode'
import { CredoParser } from '../../credo-parser'
import type { CredoIssue } from '../../output'

describe('CredoParser', () => {
  context('#parseCredoIssue', () => {
    let credoIssue: CredoIssue
    let text: string
    const subject = () => CredoParser.parseCredoIssue(credoIssue, { text })

    beforeEach(() => {
      text = 'defmodule SampleWeb.Telemetry\nend\n'
      credoIssue = {
        category: 'readability',
        check: 'Credo.Check.Readability.ModuleDoc',
        column: 11,
        column_end: 32,
        filename: 'lib/sample_web/telemetry.ex',
        line_no: 1,
        message: 'Modules should have a @moduledoc tag.',
        priority: 1,
        trigger: 'SampleWeb.Telemetry',
      }
    })

    it('parses a credo issue correctly into a vscode diagnostic', () => {
      const diagnostic = subject()
      expect(diagnostic.message).to.equal(
        'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
      )
      expect(diagnostic.severity).to.equal(vscode.DiagnosticSeverity.Information)
      expect(diagnostic.range.start.line).to.equal(0)
      expect(diagnostic.range.start.character).to.equal(10)
      expect(diagnostic.range.end.line).to.equal(0)
      expect(diagnostic.range.end.character).to.equal(31)
    })

    context('when `column` and `column_end` are null', () => {
      context('when a trigger is given', () => {
        context('when the trigger is anything but a string', () => {
          beforeEach(() => {
            text = 'defmodule Web.WebhookController do\n  @key get_env(:my_app, :key)\nend\n'
            credoIssue = {
              category: 'warning',
              check: 'Credo.Check.Warning.ApplicationConfigInModuleAttribute',
              column: null,
              column_end: null,
              filename: 'lib/web/controllers/webhook/webhook_controller.ex',
              line_no: 2,
              message: 'Module attribute @key makes use of unsafe Application configuration call Application.get_env/2',
              priority: 11,
              scope: 'Web.WebhookController',
              trigger: ['Application.get_env/2', 'Dep1'],
            }
          })

          it('marks the entire line', () => {
            const diagnostic = subject()
            expect(diagnostic.message).to.equal(
              'Module attribute @key makes use of unsafe Application configuration call Application.get_env/2 (warning:Credo.Check.Warning.ApplicationConfigInModuleAttribute)',
            )
            expect(diagnostic.severity).to.equal(vscode.DiagnosticSeverity.Warning)
            expect(diagnostic.range.start.line).to.equal(1)
            expect(diagnostic.range.start.character).to.equal(0)
            expect(diagnostic.range.end.line).to.equal(1)
            expect(diagnostic.range.end.character).to.equal(29)
          })
        })

        context('when the trigger is a method', () => {
          beforeEach(() => {
            credoIssue = {
              category: 'warning',
              check: 'Credo.Check.Warning.ApplicationConfigInModuleAttribute',
              column: null,
              column_end: null,
              filename: 'lib/web/controllers/webhook/webhook_controller.ex',
              line_no: 2,
              message: 'Module attribute @key makes use of unsafe Application configuration call Application.get_env/2',
              priority: 11,
              scope: 'Web.WebhookController',
              trigger: 'Application.get_env/2',
            }
          })

          context('when the trigger occurs in the given line', () => {
            beforeEach(() => {
              text =
                'defmodule Web.WebhookController do\n  @key Application.get_env(:my_app, :webhook_signing_key)\nend\n'
            })

            it('marks the substring of the line', () => {
              const diagnostic = subject()
              expect(diagnostic.message).to.equal(
                'Module attribute @key makes use of unsafe Application configuration call Application.get_env/2 (warning:Credo.Check.Warning.ApplicationConfigInModuleAttribute)',
              )
              expect(diagnostic.severity).to.equal(vscode.DiagnosticSeverity.Warning)
              expect(diagnostic.range.start.line).to.equal(1)
              expect(diagnostic.range.start.character).to.equal(7)
              expect(diagnostic.range.end.line).to.equal(1)
              expect(diagnostic.range.end.character).to.equal(26)
            })
          })

          context('when the trigger occurs in the given line', () => {
            beforeEach(() => {
              text = 'defmodule Web.WebhookController do\n  @key get_env(:my_app, :key)\nend\n'
            })

            it('marks the entire line', () => {
              const diagnostic = subject()
              expect(diagnostic.message).to.equal(
                'Module attribute @key makes use of unsafe Application configuration call Application.get_env/2 (warning:Credo.Check.Warning.ApplicationConfigInModuleAttribute)',
              )
              expect(diagnostic.severity).to.equal(vscode.DiagnosticSeverity.Warning)
              expect(diagnostic.range.start.line).to.equal(1)
              expect(diagnostic.range.start.character).to.equal(0)
              expect(diagnostic.range.end.line).to.equal(1)
              expect(diagnostic.range.end.character).to.equal(29)
            })
          })
        })

        context('when the trigger is something else', () => {
          beforeEach(() => {
            credoIssue = {
              category: 'design',
              check: 'Credo.Check.Design.TagTODO',
              column: null,
              column_end: null,
              filename: 'lib/sample_web/telemetry.ex',
              line_no: 2,
              message: 'Found a TODO tag in a comment: # TODO: any.',
              priority: 2,
              trigger: '# TODO: any',
            }
          })

          context('when the trigger occurs in the given line', () => {
            beforeEach(() => {
              text = 'defmodule TestModule do\n  # TODO: any\nend\n'
            })

            it('marks the substring of the line', () => {
              const diagnostic = subject()
              expect(diagnostic.message).to.equal(
                'Found a TODO tag in a comment: # TODO: any. (design:Credo.Check.Design.TagTODO)',
              )
              expect(diagnostic.severity).to.equal(vscode.DiagnosticSeverity.Information)
              expect(diagnostic.range.start.line).to.equal(1)
              expect(diagnostic.range.start.character).to.equal(2)
              expect(diagnostic.range.end.line).to.equal(1)
              expect(diagnostic.range.end.character).to.equal(13)
            })
          })

          context('when the trigger does not occur in the given line', () => {
            beforeEach(() => {
              text = 'defmodule TestModule do\n  # TODO: nothing\nend\n'
            })

            it('marks the entire line', () => {
              const diagnostic = subject()
              expect(diagnostic.message).to.equal(
                'Found a TODO tag in a comment: # TODO: any. (design:Credo.Check.Design.TagTODO)',
              )
              expect(diagnostic.severity).to.equal(vscode.DiagnosticSeverity.Information)
              expect(diagnostic.range.start.line).to.equal(1)
              expect(diagnostic.range.start.character).to.equal(0)
              expect(diagnostic.range.end.line).to.equal(1)
              expect(diagnostic.range.end.character).to.equal(17)
            })
          })
        })
      })

      context('when no trigger is given', () => {
        beforeEach(() => {
          text = 'defmodule TestModule do\n  # TODO: any\nend\n'
          credoIssue = {
            category: 'design',
            check: 'Credo.Check.Design.TagTODO',
            column: null,
            column_end: null,
            filename: 'lib/sample_web/telemetry.ex',
            line_no: 2,
            message: 'Found a TODO tag in a comment: # TODO: any.',
            priority: 2,
            trigger: null,
          }
        })

        it('marks the entire line', () => {
          const diagnostic = subject()
          expect(diagnostic.message).to.equal(
            'Found a TODO tag in a comment: # TODO: any. (design:Credo.Check.Design.TagTODO)',
          )
          expect(diagnostic.severity).to.equal(vscode.DiagnosticSeverity.Information)
          expect(diagnostic.range.start.line).to.equal(1)
          expect(diagnostic.range.start.character).to.equal(0)
          expect(diagnostic.range.end.line).to.equal(1)
          expect(diagnostic.range.end.character).to.equal(13)
        })
      })
    })
  })

  context('#parseCredoOutput', () => {
    const subject = () =>
      CredoParser.parseCredoOutput(
        {
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
        { document: { getText: () => '' } as vscode.TextDocument },
      )

    it('parses the credo output to a vscode diagnostic array', () => {
      expect(subject().length).to.equal(2)
    })
  })
})
