import { fromPartial } from '@total-typescript/shoehorn'
import sinon from 'sinon'
import * as vscode from 'vscode'
import type { CredoConfiguration } from '../../configuration'
import { config } from '../../configuration'
import { credo } from '../../credo'
import { CredoUtils } from '../../credo-utils'
import { Linter } from '../../linter'

describe('Linter', () => {
  let linter: Linter
  let doc: vscode.TextDocument
  let configuration: CredoConfiguration

  beforeEach(() => {
    configuration = {
      mixBinaryPath: 'mix',
      mixCommand: 'mix',
      configurationFile: '.credo.exs',
      credoConfiguration: 'default',
      checksWithTag: [],
      checksWithoutTag: [],
      strictMode: false,
      ignoreWarningMessages: false,
      lintEverything: true,
      enableDebug: false,
      diffMode: {
        enabled: false,
        mergeBase: 'main',
      },
    }

    sinon.stub(config, 'resolved').get(() => configuration)
  })

  beforeEach(() => {
    linter = new Linter(doc)
  })

  before(() => {
    doc = fromPartial({
      languageId: 'elixir',
      isUntitled: false,
      uri: vscode.Uri.file('/Users/bot/sample/lib/sample_web/telemetry.ex'),
      fileName: '/Users/bot/sample/lib/sample_web/telemetry.ex',
      getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
    })
  })

  context('#run', () => {
    const subject = () => linter.run()

    beforeEach(() => {
      sinon.stub(linter, 'lint').returns(
        Promise.resolve({
          issues: [],
        }),
      )
      sinon.stub(credo, 'info').returns(
        Promise.resolve({
          config: {
            checks: [],
            files: ['lib/sample_web/telemetry.ex'],
          },
          system: {
            credo: '1.5.4-ref.main.9fe4739+uncommittedchanges',
            elixir: '1.11.1',
            erlang: '23',
          },
        }),
      )
    })

    context('when lintEverything is enabled', () => {
      beforeEach(() => {
        configuration.lintEverything = true
      })

      it('lints the document', async () => {
        const result = await subject()

        expect(linter.lint).to.have.been.called
        expect(result).to.deep.equal({ issues: [] })
      })

      it('does not call info', async () => {
        await subject()

        expect(credo.info).to.not.have.been.called
      })
    })

    context('when lintEverything is disabled', () => {
      beforeEach(() => {
        configuration.lintEverything = false
        sinon.stub(CredoUtils, 'getProjectFolder').returns('/Users/bot/sample')
      })

      context('when the document is not part of the config files', () => {
        before(() => {
          doc = fromPartial({
            languageId: 'elixir',
            isUntitled: false,
            uri: vscode.Uri.file('/Users/bot/sample/lib/sample.ex'),
            fileName: '/Users/bot/sample/lib/sample.ex',
            getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
          })
        })

        it('does not lint the document', async () => {
          const result = await subject()
          expect(result).to.be.null
          expect(linter.lint).to.not.have.been.called
        })

        it('calls info', async () => {
          await subject()

          expect(credo.info).to.have.been.calledWith(doc.uri, {
            signal: linter.abortController.signal,
          })
        })
      })

      context('when the document is part of the config files', () => {
        before(() => {
          doc = fromPartial({
            languageId: 'elixir',
            isUntitled: false,
            uri: vscode.Uri.file('/Users/bot/sample/lib/sample_web/telemetry.ex'),
            fileName: '/Users/bot/sample/lib/sample_web/telemetry.ex',
            getText: () => 'defmodule SampleWeb.Telemtry\n@var 2\nend\n',
          })
        })

        it('lints the document', async () => {
          const result = await subject()

          expect(linter.lint).to.have.been.called
          expect(result).to.deep.equal({ issues: [] })
        })

        it('calls info', async () => {
          await subject()

          expect(credo.info).to.have.been.calledWith(doc.uri, {
            signal: linter.abortController.signal,
          })
        })
      })
    })
  })

  context('#lint', () => {
    const subject = () => linter.lint()

    context('when diff mode is enabled', () => {
      beforeEach(() => {
        configuration.diffMode.enabled = true

        sinon.stub(credo, 'diff').returns(
          Promise.resolve({
            diff: {
              fixed: [],
              new: [],
              old: [],
            },
          }),
        )
      })

      it('calls credo.diff', async () => {
        const result = await subject()

        expect(credo.diff).to.have.been.calledWith(doc, {
          signal: linter.abortController.signal,
        })
        expect(result).to.deep.equal({ diff: { fixed: [], new: [], old: [] } })
      })
    })

    context('when diff mode is disabled', () => {
      beforeEach(() => {
        configuration.diffMode.enabled = false

        sinon.stub(credo, 'suggest').returns(
          Promise.resolve({
            issues: [],
          }),
        )
      })

      it('calls credo.suggest', async () => {
        const result = await subject()

        expect(credo.suggest).to.have.been.calledWith(doc, {
          signal: linter.abortController.signal,
        })
        expect(result).to.deep.equal({ issues: [] })
      })
    })
  })

  context('#cancel', () => {
    const subject = () => linter.cancel()

    it('aborts the controller', () => {
      subject()

      expect(linter.abortController.signal.aborted).to.be.true
    })
  })
})
