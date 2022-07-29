import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { expect } from 'chai'
import type { SinonSandbox, SinonSpy, SinonStub } from 'sinon'
import { assert, createSandbox } from 'sinon'
import * as configurationModule from '../../configuration'
import {
  findUp,
  getCommandArguments,
  getCommandEnvironment,
  getProjectFolder,
  inMixProject,
  makeZeroBasedIndex,
  trunc,
} from '../../utilities'
import * as loggingModule from '../../logger'

const { LogLevel } = loggingModule

declare let $config: configurationModule.CredoConfiguration
declare let $checksWithTag: string[]
declare let $checksWithoutTag: string[]
declare let $documentUri: vscode.Uri
declare let $mainWorkspacePath: string
declare let $otherWorkspacePath: string
declare let $configurationFile: string

describe('Utilities', () => {
  let sandbox: SinonSandbox

  beforeEach(() => {
    sandbox = createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  context('#findUp', () => {
    const subject = () => {
      return findUp('mix.exs', {
        startAt: path.dirname($documentUri.fsPath),
        stopAt: $mainWorkspacePath,
      })
    }

    context('with a file within a mix project', () => {
      def('mainWorkspacePath', () => path.resolve(__dirname, '../../../src/test'))
      def('documentUri', () => vscode.Uri.file(path.resolve($mainWorkspacePath, 'fixtures/src/sample.ex')))

      it('should return the path to the mix.exs file', () => {
        expect(subject()).to.equal(path.join($mainWorkspacePath, 'fixtures'))
      })
    })

    context('with a file outside of a mix project', () => {
      def('mainWorkspacePath', () => path.resolve(__dirname, '../../../src/test'))
      def('documentUri', () => vscode.Uri.file(path.resolve($mainWorkspacePath, 'other-fixtures/other.ex')))

      it('should return undefined', () => {
        expect(subject()).to.be.undefined
      })
    })
  })

  context('#makeZeroBasedIndex', () => {
    it('An index of 1 is transformed into 0', () => {
      expect(makeZeroBasedIndex(1)).to.equal(0)
    })

    it('null is transformed into 0', () => {
      expect(makeZeroBasedIndex(null)).to.equal(0)
    })

    it('undefined is transformed into 0', () => {
      expect(makeZeroBasedIndex(undefined)).to.equal(0)
    })

    it('a number below 0 is transformed into 0', () => {
      expect(makeZeroBasedIndex(-1)).to.equal(0)
    })
  })

  context('#trunc', () => {
    it('removes any trailing new line with spaces', () => {
      const result = trunc`This
        is so
        nice times
        ${2 + 1}`

      expect(result).to.equal('This is so nice times 3')
    })
  })

  context('#inMixProject', () => {
    const isInMixProject = () => inMixProject($documentUri)

    def('mainWorkspacePath', () => path.resolve(__dirname, '../../../src/test/fixtures'))
    def('otherWorkspacePath', () => path.resolve(__dirname, '../../../src/test/other-fixtures'))

    beforeEach(() => {
      sandbox.replaceGetter(vscode.workspace, 'workspaceFolders', () => [
        {
          index: 0,
          name: 'Another workspace',
          uri: vscode.Uri.file($otherWorkspacePath),
        },
        {
          index: 1,
          name: 'Main Workspace',
          uri: vscode.Uri.file($mainWorkspacePath),
        },
      ])
    })

    context('with a file in an opened workspace', () => {
      context('within the main workspace (a mix project)', () => {
        def('documentUri', () => vscode.Uri.file(path.resolve($mainWorkspacePath, 'src/sample.ex')))

        beforeEach(() => {
          sandbox
            .stub(vscode.workspace, 'getWorkspaceFolder')
            .withArgs($documentUri)
            .returns({
              index: 1,
              name: 'Main Workspace',
              uri: vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures')),
            })
        })

        it('returns true', () => {
          expect(isInMixProject()).to.be.true
        })
      })

      context('within another workspace', () => {
        def('documentUri', () => vscode.Uri.file(path.resolve($otherWorkspacePath, 'other.ex')))

        beforeEach(() => {
          sandbox
            .stub(vscode.workspace, 'getWorkspaceFolder')
            .withArgs($documentUri)
            .returns({
              index: 0,
              name: 'Another workspace',
              uri: vscode.Uri.file($otherWorkspacePath),
            })
        })

        it('returns false', () => {
          expect(isInMixProject()).to.be.false
        })
      })
    })

    context('with a file without a workspace', () => {
      def('documentUri', () => vscode.Uri.file(path.resolve(__filename)))

      it('returns false', () => {
        expect(isInMixProject()).to.be.false
      })
    })
  })

  context('#getProjectFolder', () => {
    const fetchCurrentPath = () => getProjectFolder($documentUri)

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
    })

    context('with a file in an opened workspace', () => {
      def('documentUri', () => vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures/src/sample.ex')))

      beforeEach(() => {
        sandbox
          .stub(vscode.workspace, 'getWorkspaceFolder')
          .withArgs($documentUri)
          .returns({
            index: 1,
            name: 'Main Workspace',
            uri: vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures')),
          })
      })

      it("returns the main workspace's directory", () => {
        expect(fetchCurrentPath()).to.equal(path.resolve(__dirname, '../../../src/test/fixtures'))
      })
    })

    context('with a file without a workspace', () => {
      def('documentUri', () => vscode.Uri.file(path.resolve(__filename)))

      it('returns the directory of the file', () => {
        expect(fetchCurrentPath()).to.equal(path.resolve(__dirname))
      })
    })
  })

  context('#getCommandArguments', () => {
    def('configurationFile', () => '.credo.exs')
    def('mainWorkspacePath', () => path.resolve(__dirname))
    def('otherWorkspacePath', () => path.resolve(__dirname, '..', 'fixtures'))
    def(
      'config',
      (): configurationModule.CredoConfiguration => ({
        command: 'mix',
        configurationFile: $configurationFile,
        credoConfiguration: 'default',
        checksWithTag: [],
        checksWithoutTag: [],
        strictMode: false,
        ignoreWarningMessages: false,
        lintEverything: false,
        enableDebug: false,
        diffMode: {
          enabled: false,
          mergeBase: 'HEAD',
        },
      }),
    )

    let workspaceFolderStub: SinonStub<any[], vscode.WorkspaceFolder[]>

    beforeEach(() => {
      sandbox.stub(configurationModule, 'getCurrentConfiguration').returns($config)

      workspaceFolderStub = sandbox.stub(vscode.workspace, 'workspaceFolders')
      workspaceFolderStub.value([
        {
          index: 0,
          name: 'test',
          uri: vscode.Uri.file($mainWorkspacePath),
        },
        {
          index: 1,
          name: 'other',
          uri: vscode.Uri.file($otherWorkspacePath),
        },
      ])
    })

    context('if only one configuration file is found', () => {
      beforeEach(() => {
        sandbox.stub(fs, 'existsSync').callsFake((file) => {
          return file === `${$mainWorkspacePath}${path.sep}.credo.exs`
        })
      })

      it('successfully adds the config file to the CLI arguments', () => {
        const cmdArgs = getCommandArguments(vscode.Uri.file(`${$mainWorkspacePath}${path.sep}.credo.exs`))
        assert.match(cmdArgs, [
          'credo',
          '--format',
          'json',
          '--read-from-stdin',
          '--config-file',
          '.credo.exs',
          '--config-name',
          'default',
        ])
      })
    })

    context('if no configuration file is found', () => {
      let logSpy: SinonSpy<loggingModule.LogArguments[], void>

      beforeEach(() => {
        logSpy = sandbox.spy(loggingModule, 'log')
        sandbox.stub(fs, 'existsSync').returns(false)
      })

      it('shows a warning message', () => {
        getCommandArguments()
        sandbox.assert.calledOnceWithExactly(logSpy, {
          message: '.credo.exs file does not exist. Ignoring...',
          level: LogLevel.Warning,
        })
      })

      it('does not include a --config-file argument', () => {
        expect(getCommandArguments()).to.not.include('--config-file')
      })
    })

    context('if more than one configuration file is found', () => {
      let logSpy: SinonSpy<loggingModule.LogArguments[], void>
      let fsStub: SinonStub<fs.PathLike[], boolean>

      beforeEach(() => {
        logSpy = sandbox.spy(loggingModule, 'log')
        fsStub = sandbox.stub(fs, 'existsSync').returns(true)
      })

      it('shows a warning message', () => {
        getCommandArguments(vscode.Uri.file(`${$mainWorkspacePath}${path.sep}.credo.exs`))

        assert.calledOnceWithExactly(logSpy, {
          message: trunc`Found multiple files
            (${$mainWorkspacePath}${path.sep}.credo.exs, ${$mainWorkspacePath}${path.sep}config/.credo.exs).
            I will use ${$mainWorkspacePath}${path.sep}.credo.exs`,
          level: LogLevel.Warning,
        })
      })

      context('when a document is specified', () => {
        let textDocument: vscode.TextDocument

        beforeEach(() => {
          textDocument = {
            uri: vscode.Uri.file(`${$otherWorkspacePath}${path.sep}sample.ex`),
          } as vscode.TextDocument
          sandbox
            .stub(vscode.workspace, 'getWorkspaceFolder')
            .withArgs(textDocument.uri)
            .returns({
              index: 1,
              name: 'other',
              uri: vscode.Uri.file($otherWorkspacePath),
            })
          fsStub.restore()
          fsStub = sandbox
            .stub(fs, 'existsSync')
            .callsFake((path) => typeof path === 'string' && !path.includes('config'))
        })

        it('only finds the configuration file that resides in the same workspace folder as the document', () => {
          const cmdArgs = getCommandArguments(textDocument.uri)
          expect(cmdArgs).to.include('.credo.exs')
          assert.notCalled(logSpy)
        })
      })
    })

    context('when the configuration file is an absolute path', () => {
      let logSpy: SinonSpy<loggingModule.LogArguments[], void>

      def('configurationFile', () => `${$mainWorkspacePath}${path.sep}.credo.exs`)

      beforeEach(() => {
        logSpy = sandbox.spy(loggingModule, 'log')
        sandbox.stub(fs, 'existsSync').callsFake((file) => file === `${$mainWorkspacePath}${path.sep}.credo.exs`)
      })

      context('when the file is in the current workspace folder', () => {
        it('only finds one configuration file', () => {
          expect(getCommandArguments()).to.include(`${$mainWorkspacePath}${path.sep}.credo.exs`)
          assert.notCalled(logSpy)
        })
      })

      context('when the file is not in any of the opened workspace folders', () => {
        beforeEach(() => {
          workspaceFolderStub.reset()
          workspaceFolderStub.value([
            {
              index: 0,
              name: 'other',
              uri: vscode.Uri.file($otherWorkspacePath),
            },
          ])
        })

        it('find the configuration file', () => {
          expect(getCommandArguments()).to.include(`${$mainWorkspacePath}${path.sep}.credo.exs`)
          assert.notCalled(logSpy)
        })
      })
    })

    context('with enabled strict-mode', () => {
      def(
        'config',
        (): configurationModule.CredoConfiguration => ({
          command: 'mix',
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          checksWithTag: [],
          checksWithoutTag: [],
          strictMode: true,
          ignoreWarningMessages: false,
          lintEverything: false,
          enableDebug: false,
          diffMode: {
            enabled: false,
            mergeBase: 'HEAD',
          },
        }),
      )

      it('includes `--strict-mode`', () => {
        expect(getCommandArguments()).to.include('--strict')
      })
    })

    context('with diff mode enabled', () => {
      def(
        'config',
        (): configurationModule.CredoConfiguration => ({
          command: 'mix',
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          checksWithTag: [],
          checksWithoutTag: [],
          strictMode: true,
          ignoreWarningMessages: false,
          lintEverything: false,
          enableDebug: false,
          diffMode: {
            enabled: true,
            mergeBase: 'main',
          },
        }),
      )

      it('supplies the diff command with --from-git-merge-base', () => {
        assert.match(getCommandArguments(), [
          'credo',
          'diff',
          '--format',
          'json',
          '--read-from-stdin',
          '--config-name',
          'default',
          '--strict',
          '--from-git-merge-base',
          'main',
        ])
      })
    })

    context('with configured tags', () => {
      def('checksWithTag', () => [])
      def('checksWithoutTag', () => [])
      def(
        'config',
        (): configurationModule.CredoConfiguration => ({
          command: 'mix',
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          checksWithTag: $checksWithTag,
          checksWithoutTag: $checksWithoutTag,
          strictMode: false,
          ignoreWarningMessages: false,
          lintEverything: false,
          enableDebug: false,
          diffMode: {
            enabled: false,
            mergeBase: 'HEAD',
          },
        }),
      )

      context('when checksWithTag are specified', () => {
        def('checksWithTag', () => ['no_editor', 'no_test'])

        it('includes the checksWithTag as arguments', () => {
          assert.match(getCommandArguments(), [
            'credo',
            '--format',
            'json',
            '--read-from-stdin',
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
        def('checksWithoutTag', () => ['no_editor', 'no_test'])

        it('includes the checksWithoutTag as arguments', () => {
          assert.match(getCommandArguments(), [
            'credo',
            '--format',
            'json',
            '--read-from-stdin',
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
        def('checksWithTag', () => ['no_editor', 'no_test'])
        def('checksWithoutTag', () => ['broken'])

        it('prioritizes checksWithTag over checksWithoutTag', () => {
          assert.match(getCommandArguments(), [
            'credo',
            '--format',
            'json',
            '--read-from-stdin',
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

  context('#getCommandEnvironment', () => {
    context("without any given executePath in the extension's configuration", () => {
      it('returns a shallow copy of the PATH variable without any changes', () => {
        expect(getCommandEnvironment().PATH).to.equal(process.env.PATH)
      })
    })

    context("with a given executePath in the extension's configuration", () => {
      const executePath = '/usr/.asdf/shims'

      beforeEach(() => {
        sandbox
          .stub(vscode.workspace, 'getConfiguration')
          .withArgs('elixir.credo')
          .callsFake(
            () =>
              ({
                get(prop: string) {
                  if (prop === 'executePath') {
                    return executePath
                  }
                  return null
                },
              } as any),
          )
      })

      it('returns a shallow copy of the PATH variable without any changes', () => {
        expect(getCommandEnvironment().PATH).to.include(`${path.delimiter}${executePath}`)
      })
    })
  })
})
