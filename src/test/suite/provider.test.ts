import * as path from 'path'
import * as cp from 'child_process'
import * as vscode from 'vscode'
import type { SinonSandbox, SinonSpy, SinonStub } from 'sinon'
import { createSandbox, match, assert as sinonAssert } from 'sinon'
import { expect } from 'chai'
import { def } from 'bdd-lazy-var/global'
import * as taskQueueModule from '../../task-queue'
import * as configurationModule from '../../configuration'
import * as executionModule from '../../execution'
import * as loggerModule from '../../logger'
import * as utilModule from '../../utilities'
import type { CredoProviderOptions } from '../../provider'
import { CredoProvider } from '../../provider'
import type { CredoInformation, CredoOutput } from '../../output'

declare let $config: configurationModule.CredoConfiguration
declare let $diagnosticCollection: vscode.DiagnosticCollection
declare let $providerOptions: CredoProviderOptions
declare let $credoProvider: CredoProvider
declare let $workspaceFilePath: string
declare let $fileName: string
declare let $documentUri: vscode.Uri
declare let $textDocument: vscode.TextDocument
declare let $otherDocument: vscode.TextDocument
declare let $credoOutput: CredoOutput
declare let $credoInfoOutput: CredoInformation

describe('CredoProvider', () => {
  let sandbox: SinonSandbox

  def('diagnosticCollection', () => vscode.languages.createDiagnosticCollection('elixir'))
  def('providerOptions', () => ({ diagnosticCollection: $diagnosticCollection }))
  def('credoProvider', () => new CredoProvider($providerOptions))

  beforeEach(() => {
    sandbox = createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  context('#execute', () => {
    const execute = () => $credoProvider.execute({ document: $textDocument })

    context('when linting an invalid file', () => {
      let taskSpy: SinonSpy
      let executeCredoSpy: SinonSpy<executionModule.CredoExecutionArguments[], cp.ChildProcess[]>

      beforeEach(() => {
        taskSpy = sandbox.spy(taskQueueModule, 'Task')
        executeCredoSpy = sandbox.spy(executionModule, 'executeCredo')
      })

      context('when linting an untitled file', () => {
        def('textDocument', () => ({
          languageId: 'elixir',
          isUntitled: true,
          getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
        }))

        it('does not execute credo', () => {
          execute()

          expect(taskSpy.called).to.be.false
          expect(executeCredoSpy.called).to.be.false
        })
      })

      context('when linting an non-elixir file', () => {
        def('textDocument', () => ({
          languageId: 'json',
          isUntitled: false,
          getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
        }))

        it('does not execute credo', () => {
          execute()

          expect(taskSpy.called).to.be.false
          expect(executeCredoSpy.called).to.be.false
        })
      })

      context('when linting a file not stored locally, i.e., its uri does not use the file scheme', () => {
        def('textDocument', () => ({
          languageId: 'elixir',
          isUntitled: false,
          uri: vscode.Uri.parse('https://example.com/path'),
          getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
        }))

        it('does not execute credo', () => {
          execute()

          expect(taskSpy.called).to.be.false
          expect(executeCredoSpy.called).to.be.false
        })
      })

      context('when linting a file not in a workspacefolder with a mix.exs file', () => {
        def('textDocument', () => ({
          languageId: 'elixir',
          isUntitled: false,
          uri: vscode.Uri.file(path.resolve(__dirname, '../fixtures/src/sample.ex')),
          getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
        }))

        beforeEach(() => {
          sandbox.stub(utilModule, 'inMixProject').returns(false)
        })

        it('does not execute credo', () => {
          execute()

          expect(taskSpy.called).to.be.false
          expect(executeCredoSpy.called).to.be.false
        })
      })
    })

    context('when linting a valid elixir document', () => {
      def('workspaceFilePath', () => '/Users/bot/sample')
      def('fileName', () => `${$workspaceFilePath}/lib/sample_web/telemetry.ex`)
      def('documentUri', () => vscode.Uri.file($fileName))
      def('textDocument', () => ({
        languageId: 'elixir',
        isUntitled: false,
        uri: $documentUri,
        fileName: $fileName,
        getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
      }))
      def('credoOutput', () => ({
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
      }))
      def('credoInfoOutput', () => ({
        config: {
          checks: [],
          files: ['lib/sample_web/telemetry.ex'],
        },
        system: {
          credo: '1.5.4-ref.main.9fe4739+uncommittedchanges',
          elixir: '1.11.1',
          erlang: '23',
        },
      }))

      let setDiagnosticCollectionSpy: SinonSpy
      let logSpy: SinonSpy<loggerModule.LogArguments[], void>
      let execFileStub: SinonStub

      beforeEach(() => {
        logSpy = sandbox.spy(loggerModule, 'log')
        setDiagnosticCollectionSpy = sandbox.spy($diagnosticCollection, 'set')
        sandbox
          .stub(vscode.workspace, 'getWorkspaceFolder')
          .withArgs($documentUri)
          .callsFake(() => ({
            name: 'phoenix-project',
            index: 0,
            uri: vscode.Uri.file($workspaceFilePath),
          }))
        sandbox.stub(utilModule, 'inMixProject').returns(true)
        sandbox.stub(configurationModule, 'getCurrentConfiguration').returns($config)
        execFileStub = sandbox.stub(cp, 'execFile').callsFake((_command, commandArguments, _options, callback) => {
          if (callback) {
            if (commandArguments?.includes('info')) {
              callback(null, JSON.stringify($credoInfoOutput), '')
            } else {
              callback(null, JSON.stringify($credoOutput), '')
            }
          }

          return { kill: () => {} } as cp.ChildProcess
        })
      })

      context('when lintEverything is true', () => {
        def(
          'config',
          (): configurationModule.CredoConfiguration => ({
            command: 'mix',
            configurationFile: '.credo.exs',
            credoConfiguration: 'default',
            checksWithTag: [],
            checksWithoutTag: [],
            strictMode: false,
            ignoreWarningMessages: false,
            lintEverything: true,
            enableDebug: false,
          }),
        )

        it('correctly sets a diagnostic collection for the current document', () => {
          execute()

          sinonAssert.calledWith(setDiagnosticCollectionSpy, $documentUri, [
            new vscode.Diagnostic(
              new vscode.Range(0, 10, 0, 31),
              'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
              vscode.DiagnosticSeverity.Information,
            ),
          ])
          expect(setDiagnosticCollectionSpy.calledOnce).to.true
        })

        it('logs an info message when setting diagnostics', () => {
          execute()

          sinonAssert.calledWith(logSpy, {
            message: 'Setting linter issues for document /Users/bot/sample/lib/sample_web/telemetry.ex.',
            level: loggerModule.LogLevel.Debug,
          })
        })

        it('executes credo', () => {
          execute()

          sinonAssert.calledWith(
            execFileStub,
            'mix',
            ['credo', '--format', 'json', '--read-from-stdin', '--config-name', 'default'],
            match.any,
            match.any,
          )
        })

        it('logs that credo is being executed', () => {
          execute()

          sinonAssert.calledWith(logSpy, {
            message:
              'Executing credo command `mix credo --format json --read-from-stdin --config-name default` for /Users/bot/sample/lib/sample_web/telemetry.ex in directory /Users/bot/sample',
            level: loggerModule.LogLevel.Debug,
          })
        })

        it('does not fetch credo information', () => {
          execute()

          expect(
            execFileStub.calledWith('mix', ['credo', 'info', '--format', 'json', '--verbose'], match.any, match.any),
          ).to.be.false
        })

        it('does not log that credo information is fetched', () => {
          execute()

          expect(
            logSpy.calledWith({
              message:
                'Retreiving credo information: Executing credo command `mix credo info --format json --verbose` /Users/bot/sample/lib/sample_web/telemetry.ex in directory /Users/bot/sample',
              level: loggerModule.LogLevel.Debug,
            }),
          ).to.be.false
        })

        context('with multiple opened workspaces', () => {
          let executeCredoSpy: SinonSpy<executionModule.CredoExecutionArguments[], cp.ChildProcess[]>

          def('workspaceFilePath', () => path.resolve(__dirname, '../../../src/test/fixtures'))
          def('fileName', () => `${$workspaceFilePath}/src/sample.ex`)
          def('documentUri', () => vscode.Uri.file($fileName))
          def('textDocument', () => ({
            languageId: 'elixir',
            isUntitled: false,
            uri: $documentUri,
            fileName: $fileName,
            getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
          }))

          beforeEach(() => {
            sandbox.replaceGetter(vscode.workspace, 'workspaceFolders', () => [
              {
                index: 0,
                name: 'Another workspace',
                uri: vscode.Uri.file(path.resolve(__dirname)),
              },
              {
                index: 1,
                name: 'Main Workspace',
                uri: vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures')),
              },
            ])
            executeCredoSpy = sandbox.spy(executionModule, 'executeCredo')
          })

          it('executes the credo commands in the correct workspace folder', () => {
            execute()

            sandbox.assert.calledWith(
              executeCredoSpy,
              match.hasNested('options.cwd', path.resolve(__dirname, '../../../src/test/fixtures')),
            )
          })
        })
      })

      context('when the extension only lints the files specified through the credo configuration file', () => {
        def(
          'config',
          (): configurationModule.CredoConfiguration => ({
            command: 'mix',
            configurationFile: '.credo.exs',
            credoConfiguration: 'default',
            checksWithTag: [],
            checksWithoutTag: [],
            strictMode: false,
            ignoreWarningMessages: false,
            lintEverything: false,
            enableDebug: false,
          }),
        )

        context('when the current document should be linted', () => {
          it('adds the diagnostic', () => {
            execute()

            sinonAssert.calledWith(setDiagnosticCollectionSpy, $documentUri, [
              new vscode.Diagnostic(
                new vscode.Range(0, 10, 0, 31),
                'Modules should have a @moduledoc tag. (readability:Credo.Check.Readability.ModuleDoc)',
                vscode.DiagnosticSeverity.Information,
              ),
            ])
            expect(setDiagnosticCollectionSpy.calledOnce).to.true
          })

          it('logs an info message when setting diagnostics', () => {
            execute()

            sinonAssert.calledWith(logSpy, {
              message: 'Setting linter issues for document /Users/bot/sample/lib/sample_web/telemetry.ex.',
              level: loggerModule.LogLevel.Debug,
            })
          })

          it('executes credo', () => {
            execute()

            sinonAssert.calledWith(
              execFileStub,
              'mix',
              ['credo', '--format', 'json', '--read-from-stdin', '--config-name', 'default'],
              match.any,
              match.any,
            )
          })

          it('logs that credo is being executed', () => {
            execute()

            sinonAssert.calledWith(logSpy, {
              message:
                'Executing credo command `mix credo --format json --read-from-stdin --config-name default` for /Users/bot/sample/lib/sample_web/telemetry.ex in directory /Users/bot/sample',
              level: loggerModule.LogLevel.Debug,
            })
          })

          it('fetches credo information', () => {
            execute()

            sinonAssert.calledWith(
              execFileStub,
              'mix',
              ['credo', 'info', '--format', 'json', '--verbose'],
              match.any,
              match.any,
            )
          })

          it('logs an info message when credo information is fetched', () => {
            execute()

            sinonAssert.calledWith(logSpy, {
              message:
                'Retreiving credo information: Executing credo command `mix credo info --format json --verbose` for /Users/bot/sample/lib/sample_web/telemetry.ex in directory /Users/bot/sample',
              level: loggerModule.LogLevel.Debug,
            })
          })
        })

        context('when the current document should not be linted', () => {
          def('fileName', () => `${$workspaceFilePath}/lib/sample_web/telemetry_test.ex`)

          it('does not add any diagnostic', () => {
            execute()

            sinonAssert.calledWith(setDiagnosticCollectionSpy, $documentUri, [])
            expect(setDiagnosticCollectionSpy.calledOnce).to.true
          })

          it('logs an info message when (not) setting diagnostics', () => {
            execute()

            sinonAssert.calledWith(logSpy, {
              message: 'Setting linter issues for document /Users/bot/sample/lib/sample_web/telemetry_test.ex.',
              level: loggerModule.LogLevel.Debug,
            })
          })

          it('does not execute credo', () => {
            execute()

            expect(
              execFileStub.calledWith(
                'mix',
                ['credo', '--format', 'json', '--read-from-stdin', '--config-name', 'default'],
                match.any,
                match.any,
              ),
            ).to.be.false
          })

          it('does not log that credo is being executed', () => {
            execute()

            expect(
              logSpy.calledWith({
                message:
                  'Executing credo command `mix credo --format json --read-from-stdin --config-name default` for /Users/bot/sample/lib/sample_web/telemetry_test.ex in directory /Users/bot/sample',
                level: loggerModule.LogLevel.Debug,
              }),
            ).to.be.false
          })

          it('fetches credo information', () => {
            execute()

            sinonAssert.calledWith(
              execFileStub,
              'mix',
              ['credo', 'info', '--format', 'json', '--verbose'],
              match.any,
              match.any,
            )
          })

          it('logs an info message when credo information is fetched', () => {
            execute()

            sinonAssert.calledWith(logSpy, {
              message:
                'Retreiving credo information: Executing credo command `mix credo info --format json --verbose` for /Users/bot/sample/lib/sample_web/telemetry_test.ex in directory /Users/bot/sample',
              level: loggerModule.LogLevel.Debug,
            })
          })
        })
      })
    })
  })

  context('#clear', () => {
    const clear = () => $credoProvider.clear({ document: $textDocument })

    def('textDocument', () => ({ uri: vscode.Uri.file('/Users/bot/sample/lib/sample_web/telemetry_test.ex') }))

    it('deletes all diagnostics for the given document', () => {
      const deleteDiagnosticSpy = sandbox.spy($diagnosticCollection, 'delete')

      clear()

      sandbox.assert.calledOnceWithExactly(deleteDiagnosticSpy, $textDocument.uri)
    })

    it('cancels any ongoing tasks for this document', () => {
      const taskCancelSpy = sandbox.spy($credoProvider.taskQueue, 'cancel')

      clear()

      sandbox.assert.calledOnceWithExactly(taskCancelSpy, $textDocument.uri)
    })

    it('logs an info message for clearing the diagnostics', () => {
      const logSpy = sandbox.spy(loggerModule, 'log')

      clear()

      sandbox.assert.calledOnceWithExactly(logSpy, {
        message:
          'Removing linter messages and cancel running linting processes for /Users/bot/sample/lib/sample_web/telemetry_test.ex.',
        level: loggerModule.LogLevel.Debug,
      })
    })
  })

  context('#clearAll', () => {
    const clearAll = () => $credoProvider.clearAll()

    def('textDocument', () => ({ uri: vscode.Uri.file(path.resolve(__filename)) }))
    def('otherDocument', () => ({ uri: vscode.Uri.file(path.resolve(__dirname, '../fixtures/src/sample.ex')) }))

    beforeEach(() => {
      sandbox.replaceGetter(vscode.window, 'visibleTextEditors', () => [
        { document: $textDocument } as any,
        { document: $otherDocument } as any,
      ])
    })

    it('calls #clear for each document', () => {
      const clearSpy = sandbox.spy($credoProvider, 'clear')

      clearAll()

      expect(clearSpy.calledTwice).to.be.true
      sandbox.assert.calledWith(clearSpy, { document: $textDocument })
      sandbox.assert.calledWith(clearSpy, { document: $otherDocument })
    })
  })
})
