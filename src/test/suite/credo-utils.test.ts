import type { ExecException, ExecFileException } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fromAny, fromPartial } from '@total-typescript/shoehorn'
import sinon from 'sinon'
import * as vscode from 'vscode'
import { type CredoConfiguration, config } from '../../configuration'
import { CredoUtils } from '../../credo-utils'
import { logger } from '../../logger'
import { notifier } from '../../notifier'
import type { CredoCommandOutput } from '../../output'
import { trunc } from '../../util'
import { DefaultConfig } from './mock-data'

describe('CredoUtils', () => {
  let configuration: CredoConfiguration

  beforeEach(() => {
    configuration = { ...DefaultConfig }
  })

  beforeEach(() => {
    sinon.spy(logger, 'log')
    sinon.spy(notifier, 'notify')
    sinon.stub(config, 'resolved').get(() => configuration)
  })

  context('#parseOutput', () => {
    let output: string
    const subject = () => CredoUtils.parseOutput<CredoCommandOutput>(output)

    context('with an empty string', () => {
      beforeEach(() => {
        output = ''
      })

      it('returns null', () => {
        expect(subject()).to.be.null
      })

      it('logs an error', () => {
        subject()

        expect(logger.log).to.have.been.calledWith(
          'error',
          'Command `mix credo` returns empty output! Please check your configuration. Did you add or modify your dependencies? You might need to run `mix deps.get` or recompile.',
        )
        expect(notifier.notify).to.have.been.calledWith(
          'error',
          'Command `mix credo` returns empty output! Please check your configuration. Did you add or modify your dependencies? You might need to run `mix deps.get` or recompile.',
        )
      })
    })

    context('with non-JSON output', () => {
      beforeEach(() => {
        output = 'No JSON'
      })

      it('returns null', () => {
        expect(subject()).to.be.null
      })

      it('logs an error', () => {
        subject()

        expect(logger.log).to.have.been.calledWith(
          'error',
          'Error on parsing output (It might be non-JSON output): "No JSON"',
        )
        expect(notifier.notify).to.have.been.calledWith(
          'error',
          'Error on parsing output (It might be non-JSON output): "No JSON"',
        )
      })
    })

    context('with SIGTERM output', () => {
      beforeEach(() => {
        output = '[notice] SIGTERM received - shutting down'
      })

      it('returns null', () => {
        expect(subject()).to.be.null
      })

      it('does not log anything', () => {
        subject()

        expect(logger.log).to.not.have.been.called
        expect(notifier.notify).to.not.have.been.called
      })
    })

    context('with CredoInformation', () => {
      beforeEach(() => {
        output = `
            Some warning message.
            {
              "config": {
                "checks": [],
                "files": ["lib/sample_web/telemetry.ex"]
              },
              "system": {
                "credo": "1.5.4-ref.main.9fe4739+uncommittedchanges",
                "elixir": "1.11.1",
                "erlang": "23"
              }
            }
          `
      })

      it('returns parsed credo information', () => {
        expect(subject()).to.deep.equal({
          config: {
            checks: [],
            files: ['lib/sample_web/telemetry.ex'],
          },
          system: {
            credo: '1.5.4-ref.main.9fe4739+uncommittedchanges',
            elixir: '1.11.1',
            erlang: '23',
          },
        })
      })

      it('does not log anything', () => {
        subject()

        expect(logger.log).to.not.have.been.called
        expect(notifier.notify).to.not.have.been.called
      })
    })

    context('with normal CredoOutput', () => {
      beforeEach(() => {
        output = `
          Some warning message.
          {
            "issues": [{
              "category": "readability",
              "check": "Credo.Check.Readability.ModuleDoc",
              "column": 11,
              "column_end": 32,
              "filename": "lib/sample_web/telemetry.ex",
              "line_no": 1,
              "message": "Modules should have a @moduledoc tag.",
              "priority": 1,
              "trigger": "SampleWeb.Telemetry"
            }]
          }
        `
      })

      it('returns parsed credo output', () => {
        expect(subject()).to.deep.equal({
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
        })
      })

      it('does not log anything', () => {
        subject()

        expect(logger.log).to.not.have.been.called
        expect(notifier.notify).to.not.have.been.called
      })
    })
  })

  context('#reportError', () => {
    let error: ExecFileException | null | ExecException
    let stderr: string
    const subject = () => CredoUtils.reportError({ error, stderr })

    context('with an "ENOENT" error', () => {
      beforeEach(() => {
        error = fromPartial({ code: 'ENOENT' })
        stderr = ''
      })

      it('returns "error"', () => {
        expect(subject()).to.equal('error')
      })

      it('logs an error message that the mix binary is not found', () => {
        subject()

        expect(logger.log).to.have.been.calledWith(
          'error',
          '`mix` is not executable. Try setting the option in this extension\'s configuration "elixir.credo.executePath" to the path of the mix binary.',
        )
        expect(notifier.notify).to.have.been.calledWith(
          'error',
          '`mix` is not executable. Try setting the option in this extension\'s configuration "elixir.credo.executePath" to the path of the mix binary.',
        )
      })
    })

    context('with a "SIGTERM" error', () => {
      beforeEach(() => {
        stderr = ''
      })

      context('with a numeric code', () => {
        beforeEach(() => {
          error = fromPartial({ code: 15 })
        })

        it('returns "error"', () => {
          expect(subject()).to.equal('error')
        })

        it('logs no message', () => {
          subject()

          expect(logger.log).to.not.have.been.called
          expect(notifier.notify).to.not.have.been.called
        })
      })

      context('with a "SIGTERM" code', () => {
        beforeEach(() => {
          error = fromPartial({ code: 'SIGTERM' })
        })

        it('returns "error"', () => {
          expect(subject()).to.equal('error')
        })

        it('logs no message', () => {
          subject()

          expect(logger.log).to.not.have.been.called
          expect(notifier.notify).to.not.have.been.called
        })
      })

      context('with a "SIGTERM" signal', () => {
        beforeEach(() => {
          error = fromPartial({ signal: 'SIGTERM' })
        })

        it('returns "error"', () => {
          expect(subject()).to.equal('error')
        })

        it('logs no message', () => {
          subject()

          expect(logger.log).to.not.have.been.called
          expect(notifier.notify).to.not.have.been.called
        })
      })
    })

    context('with any other error', () => {
      beforeEach(() => {
        error = fromPartial({ code: 127 })
        stderr = 'Any error'
      })

      it('returns "error"', () => {
        expect(subject()).to.equal('error')
      })

      it('logs an error message', () => {
        subject()

        expect(logger.log).to.have.been.calledWith(
          'error',
          'An error occurred: "Any error" - Error Object: {"code":127}',
        )
        expect(notifier.notify).to.have.been.calledWith(
          'error',
          'An error occurred: "Any error" - Error Object: {"code":127}',
        )
      })
    })

    context('only with stderr', () => {
      beforeEach(() => {
        error = null
        stderr = 'A warning message'
      })

      it('returns "ok"', () => {
        expect(subject()).to.equal('ok')
      })

      it('logs a warning', () => {
        subject()

        expect(logger.log).to.have.been.calledWith('warn', 'Warning: "A warning message"')
        expect(notifier.notify).to.have.been.calledWith('warn', 'Warning: "A warning message"')
      })
    })

    context('with no error', () => {
      beforeEach(() => {
        error = null
        stderr = ''
      })

      it('returns "ok"', () => {
        expect(subject()).to.equal('ok')
      })

      it('logs no message', () => {
        subject()

        expect(logger.log).to.not.have.been.called
        expect(notifier.notify).to.not.have.been.called
      })
    })
  })

  context('#getCredoConfigFilePath', () => {
    let docUri: vscode.Uri | undefined
    const subject = () => CredoUtils.getCredoConfigFilePath(docUri)

    let mainWorkspacePath: string
    let otherWorkspacePath: string

    beforeEach(() => {
      configuration.configurationFile = '.credo.exs'
      mainWorkspacePath = path.resolve(__dirname)
      otherWorkspacePath = path.resolve(__dirname, '..', 'fixtures')
    })

    beforeEach(() => {
      sinon.stub(vscode.workspace, 'workspaceFolders').value([
        {
          index: 0,
          name: 'test',
          uri: vscode.Uri.file(mainWorkspacePath),
        },
        {
          index: 1,
          name: 'other',
          uri: vscode.Uri.file(otherWorkspacePath),
        },
      ])
    })

    context('if only one configuration file is found', () => {
      beforeEach(() => {
        docUri = vscode.Uri.file(`${mainWorkspacePath}${path.sep}.credo.exs`)
        sinon.stub(fs, 'existsSync').callsFake((file) => {
          return file === `${mainWorkspacePath}${path.sep}.credo.exs`
        })
      })

      it('successfully finds the configuration file', () => {
        expect(subject()).to.equal('.credo.exs')
      })
    })

    context('if no configuration file is found', () => {
      beforeEach(() => {
        sinon.stub(fs, 'existsSync').returns(false)
      })

      it('shows a warning message', () => {
        subject()

        expect(logger.log).to.have.been.calledWith('warn', '.credo.exs file does not exist. Ignoring...')
        expect(notifier.notify).to.have.been.calledWith('warn', '.credo.exs file does not exist. Ignoring...')
      })
    })

    context('if more than one configuration file is found', () => {
      beforeEach(() => {
        sinon.stub(fs, 'existsSync').returns(true)
      })

      it('shows a warning message', () => {
        subject()

        expect(logger.log).to.have.been.calledOnceWithExactly(
          'warn',
          trunc`Found multiple files
            (${mainWorkspacePath}${path.sep}.credo.exs, ${mainWorkspacePath}${path.sep}config${path.sep}.credo.exs).
            I will use ${mainWorkspacePath}${path.sep}.credo.exs`,
        )
        expect(notifier.notify).to.have.been.calledOnceWith(
          'warn',
          trunc`Found multiple files
            (${mainWorkspacePath}${path.sep}.credo.exs, ${mainWorkspacePath}${path.sep}config${path.sep}.credo.exs).
            I will use ${mainWorkspacePath}${path.sep}.credo.exs`,
        )
      })
    })

    context('when there is more than 1 config file, but a document is specified', () => {
      let textDocument: vscode.TextDocument

      beforeEach(() => {
        textDocument = fromPartial({
          uri: vscode.Uri.file(`${otherWorkspacePath}${path.sep}sample.ex`),
        })
        sinon
          .stub(vscode.workspace, 'getWorkspaceFolder')
          .withArgs(textDocument.uri)
          .returns({
            index: 1,
            name: 'other',
            uri: vscode.Uri.file(otherWorkspacePath),
          })
        sinon.stub(fs, 'existsSync').callsFake((path) => typeof path === 'string' && !path.includes('config'))
      })

      it('only finds the configuration file that resides in the same workspace folder as the document', () => {
        expect(subject()).to.equal('.credo.exs')
      })

      it('does not show a warning message', () => {
        subject()

        expect(logger.log).to.not.have.been.called
        expect(notifier.notify).to.not.have.been.called
      })
    })

    context('when the configuration file is an absolute path', () => {
      beforeEach(() => {
        configuration.configurationFile = `${mainWorkspacePath}${path.sep}.credo.exs`
        sinon.stub(fs, 'existsSync').callsFake((file) => file === `${mainWorkspacePath}${path.sep}.credo.exs`)
      })

      context('when the file is in the current workspace folder', () => {
        it('only finds one configuration file', () => {
          expect(subject()).to.equal(`${mainWorkspacePath}${path.sep}.credo.exs`)
        })

        it('does not show a warning message', () => {
          subject()

          expect(logger.log).to.not.have.been.called
          expect(notifier.notify).to.not.have.been.called
        })
      })

      context('when the file is not in any of the opened workspace folders', () => {
        beforeEach(() => {
          sinon.stub(vscode.workspace, 'getWorkspaceFolder').returns({
            index: 0,
            name: 'other',
            uri: vscode.Uri.file(otherWorkspacePath),
          })
        })

        it('finds the configuration file', () => {
          expect(subject()).to.include(`${mainWorkspacePath}${path.sep}.credo.exs`)
        })

        it('does not show a warning message', () => {
          subject()

          expect(logger.log).to.not.have.been.called
          expect(notifier.notify).to.not.have.been.called
        })
      })
    })
  })

  context('#getCredoSuggestArgs', () => {
    let docUri: vscode.Uri | undefined
    let configFilePath: string | null
    const subject = () => CredoUtils.getCredoSuggestArgs(docUri)

    beforeEach(() => {
      sinon.stub(CredoUtils, 'getCredoConfigFilePath').callsFake(() => configFilePath)
    })

    context('if a configuration file is found', () => {
      beforeEach(() => {
        configFilePath = '.credo.exs'
      })

      it('successfully adds the config file to the CLI arguments', () => {
        expect(subject()).to.have.ordered.members(['--config-file', '.credo.exs', '--config-name', 'default'])
      })
    })

    context('if no configuration file is found', () => {
      beforeEach(() => {
        configFilePath = null
      })

      it('does not include a --config-file argument', () => {
        expect(subject()).to.not.include('--config-file')
      })
    })

    context('with enabled strict-mode', () => {
      beforeEach(() => {
        configuration.strictMode = true
      })

      it('includes `--strict-mode`', () => {
        expect(subject()).to.include('--strict')
      })
    })

    context('with configured tags', () => {
      context('when checksWithTag are specified', () => {
        beforeEach(() => {
          configuration.checksWithTag = ['no_editor', 'no_test']
        })

        it('includes the checksWithTag as arguments', () => {
          expect(subject()).to.have.ordered.members([
            '--config-name',
            'default',
            '--checks-with-tag',
            'no_editor',
            '--checks-with-tag',
            'no_test',
          ])
        })
      })

      context('when checksWithoutTag are specified', () => {
        beforeEach(() => {
          configuration.checksWithoutTag = ['no_editor', 'no_test']
        })

        it('includes the checksWithoutTag as arguments', () => {
          expect(subject()).to.have.ordered.members([
            '--config-name',
            'default',
            '--checks-without-tag',
            'no_editor',
            '--checks-without-tag',
            'no_test',
          ])
        })
      })

      context('when both settings are specified', () => {
        beforeEach(() => {
          configuration.checksWithTag = ['no_editor', 'no_test']
          configuration.checksWithoutTag = ['broken']
        })

        it('prioritizes checksWithTag over checksWithoutTag', () => {
          expect(subject()).to.have.ordered.members([
            '--config-name',
            'default',
            '--checks-with-tag',
            'no_editor',
            '--checks-with-tag',
            'no_test',
          ])
        })
      })
    })
  })

  context('#getCommandEnv', () => {
    const subject = () => CredoUtils.getCommandEnv()

    context("without any given executePath in the extension's configuration", () => {
      it('returns a shallow copy of the PATH variable without any changes', () => {
        expect(subject().PATH).to.equal(process.env.PATH)
      })
    })

    context("with a given executePath in the extension's configuration", () => {
      beforeEach(() => {
        configuration.mixBinaryPath = '/usr/.asdf/shims'
      })

      it('returns a shallow copy of the PATH variable without any changes', () => {
        expect(subject().PATH).to.include(`${path.delimiter}/usr/.asdf/shims`)
      })
    })
  })

  context('#inMixProject', () => {
    let documentUri: vscode.Uri
    let mainWorkspacePath: string
    let otherWorkspacePath: string

    const subject = () => CredoUtils.inMixProject(documentUri)

    beforeEach(() => {
      mainWorkspacePath = path.resolve(__dirname, '../../../src/test/fixtures')
      otherWorkspacePath = path.resolve(__dirname, '../../../src/test/other-fixtures')

      sinon.stub(vscode.workspace, 'workspaceFolders').value([
        {
          index: 0,
          name: 'Another workspace',
          uri: vscode.Uri.file(otherWorkspacePath),
        },
        {
          index: 1,
          name: 'Main Workspace',
          uri: vscode.Uri.file(mainWorkspacePath),
        },
      ])
    })

    context('with a file in an opened workspace', () => {
      context('within the main workspace (a mix project)', () => {
        beforeEach(() => {
          documentUri = vscode.Uri.file(path.resolve(mainWorkspacePath, 'src/sample.ex'))

          sinon
            .stub(vscode.workspace, 'getWorkspaceFolder')
            .withArgs(documentUri)
            .returns({
              index: 1,
              name: 'Main Workspace',
              uri: vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures')),
            })
        })

        it('returns true', () => {
          expect(subject()).to.be.true
        })
      })

      context('within another workspace', () => {
        beforeEach(() => {
          documentUri = vscode.Uri.file(path.resolve(otherWorkspacePath, 'other.ex'))

          sinon
            .stub(vscode.workspace, 'getWorkspaceFolder')
            .withArgs(documentUri)
            .returns({
              index: 0,
              name: 'Another workspace',
              uri: vscode.Uri.file(otherWorkspacePath),
            })
        })

        it('returns false', () => {
          expect(subject()).to.be.false
        })
      })
    })

    context('with a file without a workspace', () => {
      beforeEach(() => {
        documentUri = vscode.Uri.file(path.resolve(__filename))
      })

      it('returns false', () => {
        expect(subject()).to.be.false
      })
    })
  })

  context('#getProjectFolder', () => {
    let documentUri: vscode.Uri
    const subject = () => CredoUtils.getProjectFolder(documentUri)

    beforeEach(() => {
      sinon.stub(vscode.workspace, 'workspaceFolders').value([
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
    })

    context('with a file in an opened workspace', () => {
      beforeEach(() => {
        documentUri = vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures/src/sample.ex'))
      })

      beforeEach(() => {
        sinon
          .stub(vscode.workspace, 'getWorkspaceFolder')
          .withArgs(documentUri)
          .returns({
            index: 1,
            name: 'Main Workspace',
            uri: vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures')),
          })
      })

      it("returns the main workspace's directory", () => {
        expect(subject()).to.equal(path.resolve(__dirname, '../../../src/test/fixtures'))
      })
    })

    context('with a file without a workspace', () => {
      beforeEach(() => {
        documentUri = vscode.Uri.file(path.resolve(__filename))
      })

      it('returns the directory of the file', () => {
        expect(subject()).to.equal(path.resolve(__dirname))
      })
    })
  })
})
