import cp from 'node:child_process'
import path from 'node:path'
import { fromAny, fromPartial } from '@total-typescript/shoehorn'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { type CredoConfiguration, config } from '../../configuration'
import { Credo } from '../../credo'
import { CredoUtils } from '../../credo-utils'
import { logger } from '../../logger'
import type { CredoDiffOutput, CredoInformation } from '../../output'
import { DefaultConfig } from './mock-data'

describe('Credo', () => {
  const credo = new Credo()
  let configuration: CredoConfiguration
  let stdin: NonNullable<cp.ChildProcess['stdin']>
  let output: { stdout: string; stderr: string; error: cp.ExecFileException | null }

  beforeEach(() => {
    configuration = { ...DefaultConfig }
  })

  beforeEach(() => {
    sinon.stub(config, 'resolved').get(() => configuration)

    stdin = fromPartial({ write: sinon.stub(), end: sinon.stub() })
    sinon.stub(cp, 'execFile').callsFake(
      fromAny(
        (
          _: string,
          __: string[],
          ___: cp.ExecFileOptions,
          callback: NonNullable<Parameters<typeof cp.execFile>[3]>,
        ) => {
          const { stdout, stderr, error } = output
          sinon.stub(CredoUtils, 'reportError').callsFake(({ error, stderr }) => {
            if (error) return 'error'
            if (stderr) return 'error'
            return 'ok'
          })

          setTimeout(() => callback(error, stdout, stderr), 100)
          return fromPartial<cp.ChildProcess>({ stdin })
        },
      ),
    )

    sinon.stub(CredoUtils, 'getProjectFolder').returns('/path/to/project')
    sinon.stub(CredoUtils, 'getCommandEnv').returns({ FOO: 'bar' })
    sinon.stub(logger, 'debug').callsFake(() => {})
  })

  context('#suggest', () => {
    let document: vscode.TextDocument

    beforeEach(() => {
      document = fromPartial({
        uri: vscode.Uri.file('foo.ex'),
        getText: () => 'defmodule Foo do\nend\n',
      })

      sinon
        .stub(CredoUtils, 'getCredoSuggestArgs')
        .returns(['--config', 'credo.exs', '--config-name', 'default', '--strict'])
    })

    const subject = () => credo.suggest(document)

    context('when the command is successful', () => {
      beforeEach(() => {
        output = {
          stdout: JSON.stringify({ issues: [] }),
          stderr: '',
          error: null,
        }
      })

      it('returns the parsed output', async () => {
        const result = await subject()
        expect(result).to.deep.equal({ issues: [] })
      })

      it('executes the command with the correct arguments', async () => {
        await subject()
        expect(cp.execFile).to.have.been.calledWith(
          'mix',
          [
            'credo',
            'suggest',
            '--config',
            'credo.exs',
            '--config-name',
            'default',
            '--strict',
            '--format',
            'json',
            '--read-from-stdin',
          ],
          sinon.match.any,
        )
        expect(stdin.write).to.have.been.calledWith('defmodule Foo do\nend\n')
        expect(stdin.end).to.have.been.called
      })

      it('logs the command execution', async () => {
        await subject()
        expect(logger.debug).to.have.been.calledWith(
          'Executing command `mix credo suggest --config credo.exs --config-name default --strict --format json --read-from-stdin` for /foo.ex in directory /path/to/project',
        )
      })
    })

    context('when the command fails', () => {
      beforeEach(() => {
        output = {
          stdout: '',
          stderr: 'Error',
          error: new Error('Error'),
        }
      })

      it('throws an error', async () => {
        await expect(subject()).to.eventually.be.rejectedWith('Error')
      })
    })

    context('when the output is invalid', () => {
      beforeEach(() => {
        output = {
          stdout: 'invalid',
          stderr: '',
          error: null,
        }
      })

      it('throws an error', async () => {
        await expect(subject()).to.eventually.be.rejectedWith('Could not parse output')
      })
    })
  })

  context('#diff', () => {
    let document: vscode.TextDocument

    beforeEach(() => {
      configuration.diffMode = {
        enabled: true,
        mergeBase: 'main',
      }
    })

    beforeEach(() => {
      document = fromPartial({
        uri: vscode.Uri.file('foo.ex'),
        getText: () => 'defmodule Foo do\nend\n',
      })

      sinon
        .stub(CredoUtils, 'getCredoSuggestArgs')
        .returns(['--config', 'credo.exs', '--config-name', 'default', '--strict'])
    })

    const subject = () => credo.diff(document)

    context('when the command is successful', () => {
      beforeEach(() => {
        output = {
          stdout: JSON.stringify({ diff: { fixed: [], new: [], old: [] } } satisfies CredoDiffOutput),
          stderr: '',
          error: null,
        }
      })

      it('returns the parsed output', async () => {
        const result = await subject()
        expect(result).to.deep.equal({ diff: { fixed: [], new: [], old: [] } })
      })

      it('executes the command with the correct arguments', async () => {
        await subject()
        expect(cp.execFile).to.have.been.calledWith(
          'mix',
          [
            'credo',
            'diff',
            '--config',
            'credo.exs',
            '--config-name',
            'default',
            '--strict',
            '--format',
            'json',
            '--read-from-stdin',
            '--from-git-merge-base',
            'main',
          ],
          sinon.match.any,
        )
        expect(stdin.write).to.have.been.calledWith('defmodule Foo do\nend\n')
        expect(stdin.end).to.have.been.called
      })

      it('logs the command execution', async () => {
        await subject()
        expect(logger.debug).to.have.been.calledWith(
          'Executing command `mix credo diff --config credo.exs --config-name default --strict --format json --read-from-stdin --from-git-merge-base main` for /foo.ex in directory /path/to/project',
        )
      })
    })

    context('when the command fails', () => {
      beforeEach(() => {
        output = {
          stdout: '',
          stderr: 'Error',
          error: new Error('Error'),
        }
      })

      it('throws an error', async () => {
        await expect(subject()).to.eventually.be.rejectedWith('Error')
      })
    })

    context('when the output is invalid', () => {
      beforeEach(() => {
        output = {
          stdout: 'invalid',
          stderr: '',
          error: null,
        }
      })

      it('throws an error', async () => {
        await expect(subject()).to.eventually.be.rejectedWith('Could not parse output')
      })
    })

    context('when diff mode is disabled', () => {
      beforeEach(() => {
        configuration.diffMode.enabled = false
      })

      it('throws an error', async () => {
        await expect(subject()).to.eventually.be.rejectedWith('Diff mode is not enabled')
      })
    })
  })

  context('#info', () => {
    let uri: vscode.Uri
    const subject = () => credo.info(uri)

    beforeEach(() => {
      uri = vscode.Uri.file('foo.ex')
    })

    context('when the command is successful', () => {
      beforeEach(() => {
        output = {
          stdout: JSON.stringify({
            config: {
              checks: ['Readability.CyclomaticComplexity'],
              files: ['/path/to/project/foo.ex'],
            },
            system: {
              credo: '1.5.0',
              elixir: '1.12.2',
              erlang: '24.0.2',
            },
          } satisfies CredoInformation),
          stderr: '',
          error: null,
        }
      })

      context('when on UNIX system', () => {
        it('returns the parsed output', async () => {
          const result = await subject()
          expect(result).to.deep.equal({
            config: { checks: ['Readability.CyclomaticComplexity'], files: ['/path/to/project/foo.ex'] },
            system: { credo: '1.5.0', elixir: '1.12.2', erlang: '24.0.2' },
          })
        })
      })

      context('when on Windows system', () => {
        beforeEach(() => {
          sinon.stub(path, 'sep').get(() => '\\')
        })

        it('returns the parsed output', async () => {
          const result = await subject()
          expect(result).to.deep.equal({
            config: { checks: ['Readability.CyclomaticComplexity'], files: ['\\path\\to\\project\\foo.ex'] },
            system: { credo: '1.5.0', elixir: '1.12.2', erlang: '24.0.2' },
          })
        })
      })

      it('executes the command with the correct arguments', async () => {
        await subject()
        expect(cp.execFile).to.have.been.calledWith(
          'mix',
          ['credo', 'info', '--format', 'json', '--verbose'],
          sinon.match.any,
        )
        expect(logger.debug).to.have.been.calledWith(
          'Executing command `mix credo info --format json --verbose` in directory /path/to/project',
        )
      })
    })

    context('when the command fails', () => {
      beforeEach(() => {
        output = {
          stdout: '',
          stderr: 'Error',
          error: new Error('Error'),
        }
      })

      it('throws an error', async () => {
        await expect(subject()).to.eventually.be.rejectedWith('Error')
      })
    })

    context('when the output is invalid', () => {
      beforeEach(() => {
        output = {
          stdout: 'invalid',
          stderr: '',
          error: null,
        }
      })

      it('throws an error', async () => {
        await expect(subject()).to.eventually.be.rejectedWith('Could not parse output')
      })
    })
  })
})
