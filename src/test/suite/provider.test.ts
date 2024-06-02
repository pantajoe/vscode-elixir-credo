import * as path from 'node:path'
import { fromPartial } from '@total-typescript/shoehorn'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import type { CredoConfiguration } from '../../configuration'
import { config } from '../../configuration'
import { credo } from '../../credo'
import { CredoUtils } from '../../credo-utils'
import { logger } from '../../logger'
import type { CredoDiffOutput, CredoInformation, CredoOutput } from '../../output'
import { CredoProvider } from '../../provider'
import { Task } from '../../task-queue'
import { DefaultConfig } from './mock-data'

describe('CredoProvider', () => {
  let diagnosticCollection: vscode.DiagnosticCollection
  let provider: CredoProvider

  beforeEach(() => {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('elixir')
    provider = new CredoProvider(diagnosticCollection)
  })

  context('#execute', () => {
    let textDocument: vscode.TextDocument
    const subject = async () => {
      const task = provider.execute(textDocument)
      if (task) await task.finished()
    }

    context('when linting an invalid file', () => {
      let taskSpy: sinon.SinonSpiedInstance<typeof Task>
      beforeEach(() => {
        taskSpy = sinon.spy(Task)
        sinon.spy(credo, 'mix')
      })

      context('when linting an untitled file', () => {
        beforeEach(() => {
          textDocument = fromPartial({
            languageId: 'elixir',
            isUntitled: true,
            getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
          })
        })

        it('does not execute credo', async () => {
          await subject()

          expect(taskSpy).not.to.have.been.called
          expect(credo.mix).not.to.have.been.called
        })
      })

      context('when linting an non-elixir file', () => {
        beforeEach(() => {
          textDocument = fromPartial({
            languageId: 'json',
            isUntitled: false,
            getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
          })
        })

        it('does not execute credo', async () => {
          await subject()

          expect(taskSpy).not.to.have.been.called
          expect(credo.mix).not.to.have.been.called
        })
      })

      context('when linting a file not stored locally, i.e., its uri does not use the file scheme', () => {
        beforeEach(() => {
          textDocument = fromPartial({
            languageId: 'elixir',
            isUntitled: false,
            uri: vscode.Uri.parse('https://example.com/path'),
            getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
          })
        })

        it('does not execute credo', async () => {
          await subject()

          expect(taskSpy).not.to.have.been.called
          expect(credo.mix).not.to.have.been.called
        })
      })

      context('when linting a file not in a workspacefolder with a mix.exs file', () => {
        beforeEach(() => {
          textDocument = fromPartial({
            languageId: 'elixir',
            isUntitled: false,
            uri: vscode.Uri.file(path.resolve(__dirname, '../fixtures/src/sample.ex')),
            getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
          })

          sinon.stub(CredoUtils, 'inMixProject').returns(false)
        })

        it('does not execute credo', async () => {
          await subject()

          expect(taskSpy).not.to.have.been.called
          expect(credo.mix).not.to.have.been.called
        })
      })
    })

    context('when linting a valid elixir document', () => {
      let workspaceFilePath: string
      let filename: string

      let configuration: CredoConfiguration
      let credoSuggestOutput: CredoOutput
      let credoInfoOutput: CredoInformation
      let credoDiffOutput: CredoDiffOutput

      let documentUri: vscode.Uri
      beforeEach(() => {
        documentUri = vscode.Uri.file(filename)
        textDocument = fromPartial({
          languageId: 'elixir',
          isUntitled: false,
          uri: documentUri,
          fileName: filename,
          getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
        })

        configuration = { ...DefaultConfig, enableDebug: true }

        credoSuggestOutput = {
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
          ],
        }

        credoInfoOutput = {
          config: {
            checks: [],
            files: ['lib/sample_web/telemetry.ex'],
          },
          system: {
            credo: '1.5.4-ref.main.9fe4739+uncommittedchanges',
            elixir: '1.11.1',
            erlang: '23',
          },
        }
      })

      beforeEach(() => {
        sinon.spy(logger, 'log')
        sinon.spy(diagnosticCollection, 'set')
        sinon
          .stub(vscode.workspace, 'getWorkspaceFolder')
          .withArgs(documentUri)
          .callsFake(() => ({
            name: 'phoenix-project',
            index: 0,
            uri: vscode.Uri.file(workspaceFilePath),
          }))
        sinon.stub(CredoUtils, 'inMixProject').returns(true)
        sinon.stub(config, 'resolved').get(() => configuration)

        sinon.stub(credo, 'info').callsFake(() => Promise.resolve(credoInfoOutput))
        sinon.stub(credo, 'suggest').callsFake(() => Promise.resolve(credoSuggestOutput))
        sinon.stub(credo, 'diff').callsFake(() => Promise.resolve(credoDiffOutput))
      })

      context('when lintEverything is true', () => {
        before(() => {
          workspaceFilePath = '/Users/bot/sample'
          filename = `${workspaceFilePath}/lib/sample_web/telemetry.ex`
        })

        beforeEach(() => {
          configuration.lintEverything = true
        })

        it('correctly sets a diagnostic collection for the current document', async () => {
          await subject()

          expect(diagnosticCollection.set).to.have.been.calledOnceWith(documentUri, [
            new vscode.Diagnostic(
              new vscode.Range(0, 10, 0, 31),
              'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
              vscode.DiagnosticSeverity.Information,
            ),
          ])
        })

        it('logs an info message when setting diagnostics', async () => {
          await subject()

          expect(logger.log).to.have.been.calledWith(
            'debug',
            'Setting 1 linter issues for document /Users/bot/sample/lib/sample_web/telemetry.ex.',
          )
        })

        it('executes credo', async () => {
          await subject()

          expect(credo.suggest).to.have.been.calledOnceWith(textDocument, sinon.match.any)
        })

        it('does not fetch credo information', async () => {
          await subject()

          expect(credo.info).to.not.have.been.called
        })

        context('with diff mode enabled', () => {
          beforeEach(() => {
            configuration.diffMode.enabled = true

            credoDiffOutput = {
              diff: {
                old: [],
                fixed: [],
                new: [
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
                ],
              },
            }
          })

          afterEach(() => {
            configuration.diffMode.enabled = false
          })

          it('correctly sets a diagnostic collection for the current document', async () => {
            await subject()

            expect(diagnosticCollection.set).to.have.been.calledOnceWith(documentUri, [
              new vscode.Diagnostic(
                new vscode.Range(0, 10, 0, 31),
                'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
                vscode.DiagnosticSeverity.Information,
              ),
            ])
          })

          it('logs an info message when setting diagnostics', async () => {
            await subject()

            expect(logger.log).to.have.been.calledWith(
              'debug',
              'Setting 1 linter issues for document /Users/bot/sample/lib/sample_web/telemetry.ex.',
            )
          })

          it('executes credo', async () => {
            await subject()

            expect(credo.diff).to.have.been.calledOnceWith(textDocument, sinon.match.any)
          })
        })
      })

      context('when the extension only lints the files specified through the credo configuration file', () => {
        before(() => {
          workspaceFilePath = '/Users/bot/sample'
          filename = `${workspaceFilePath}/lib/sample_web/telemetry.ex`
        })

        beforeEach(() => {
          configuration.lintEverything = false
        })

        context('when the current document should be linted', () => {
          it('adds the diagnostic', async () => {
            await subject()

            expect(diagnosticCollection.set).to.have.been.calledOnceWith(documentUri, [
              new vscode.Diagnostic(
                new vscode.Range(0, 10, 0, 31),
                'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
                vscode.DiagnosticSeverity.Information,
              ),
            ])
          })

          it('logs an info message when setting diagnostics', async () => {
            await subject()

            expect(logger.log).to.have.been.calledWith(
              'debug',
              'Setting 1 linter issues for document /Users/bot/sample/lib/sample_web/telemetry.ex.',
            )
          })

          it('executes credo', async () => {
            await subject()

            expect(credo.suggest).to.have.been.calledOnceWith(textDocument, sinon.match.any)
          })

          it('fetches credo information', async () => {
            await subject()

            expect(credo.info).to.have.been.calledWith(documentUri, sinon.match.any)
          })
        })

        context('when the current document should not be linted', () => {
          before(() => {
            workspaceFilePath = '/Users/bot/sample'
            filename = `${workspaceFilePath}/lib/sample_web/telemetry_test.ex`
          })

          it('does not add any diagnostic', async () => {
            await subject()

            expect(diagnosticCollection.set).not.to.have.been.called
          })

          it('does not log an info message of setting diagnostics', async () => {
            await subject()

            expect(logger.log).not.to.have.been.called
          })

          it('does not execute credo', async () => {
            await subject()

            expect(credo.suggest).to.not.have.been.called
          })

          it('fetches credo information', async () => {
            await subject()

            expect(credo.info).to.have.been.calledWith(documentUri, sinon.match.any)
          })
        })
      })
    })
  })

  context('#clear', () => {
    let textDocument: vscode.TextDocument
    const subject = () => provider.clear(textDocument)

    beforeEach(() => {
      textDocument = fromPartial({
        uri: vscode.Uri.file('/Users/bot/sample/lib/sample_web/telemetry_test.ex'),
      })

      sinon.spy(diagnosticCollection, 'delete')
      sinon.spy(provider.queue, 'cancel')
      sinon.spy(logger, 'log')
    })

    it('deletes all diagnostics for the given document', () => {
      subject()

      expect(diagnosticCollection.delete).to.have.been.calledOnceWithExactly(textDocument.uri)
    })

    it('cancels any ongoing tasks for this document', () => {
      subject()

      expect(provider.queue.cancel).to.have.been.calledOnceWithExactly(textDocument.uri)
    })

    it('logs an info message for clearing the diagnostics', () => {
      subject()

      expect(logger.log).to.have.been.calledOnceWithExactly(
        'debug',
        'Removing linter messages and cancel running linting processes for /Users/bot/sample/lib/sample_web/telemetry_test.ex.',
      )
    })
  })

  context('#clearAll', () => {
    let textDocument: vscode.TextDocument
    let otherDocument: vscode.TextDocument
    const subject = () => provider.clearAll()

    beforeEach(() => {
      textDocument = fromPartial({
        uri: vscode.Uri.file(path.resolve(__filename)),
      })
      otherDocument = fromPartial({
        uri: vscode.Uri.file(path.resolve(__dirname, '../fixtures/src/sample.ex')),
      })

      sinon.spy(provider, 'clear')
      sinon.replaceGetter(vscode.window, 'visibleTextEditors', () => [
        fromPartial<vscode.TextEditor>({ document: textDocument }),
        fromPartial<vscode.TextEditor>({ document: otherDocument }),
      ])
    })

    it('calls #clear for each document', () => {
      subject()

      expect(provider.clear).to.have.been.calledTwice
      expect(provider.clear).to.have.been.calledWith(textDocument)
      expect(provider.clear).to.have.been.calledWith(otherDocument)
    })
  })
})
