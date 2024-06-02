import { expect } from 'chai'
import * as sinon from 'sinon'
import type { CredoConfiguration } from '../../configuration'
import { config } from '../../configuration'
import type { LogLevel } from '../../logger'
import { OutputChannel, logger } from '../../logger'

describe('Loggging', () => {
  let level: LogLevel
  const subject = () => logger[level]('Sample message')

  let configuration: CredoConfiguration
  beforeEach(() => {
    configuration = {
      mixCommand: 'mix',
      mixBinaryPath: 'mix',
      configurationFile: '.credo.exs',
      credoConfiguration: 'default',
      checksWithTag: [],
      checksWithoutTag: [],
      strictMode: false,
      ignoreWarningMessages: false,
      lintEverything: false,
      enableDebug: false,
      diffMode: {
        enabled: false,
        mergeBase: 'main',
      },
    }
  })

  beforeEach(() => {
    sinon.spy(OutputChannel, 'appendLine')
    sinon.stub(config, 'resolved').get(() => configuration)
  })

  context('with a debug message', () => {
    beforeEach(() => {
      level = 'debug'
    })

    it('does not log the message to the output channel', () => {
      subject()

      expect(OutputChannel.appendLine).not.to.have.been.called
    })

    context('when enabling debug mode', () => {
      beforeEach(() => {
        configuration.enableDebug = true
      })

      it('logs the message to the output channel', () => {
        subject()

        expect(OutputChannel.appendLine).to.have.been.calledOnceWithExactly('DEBUG: Sample message\n')
      })
    })
  })

  context('with an info message', () => {
    beforeEach(() => {
      level = 'info'
    })

    it('logs the message to the output channel', () => {
      subject()

      expect(OutputChannel.appendLine).to.have.been.calledOnceWithExactly('INFO: Sample message\n')
    })
  })

  context('with a warning message', () => {
    beforeEach(() => {
      level = 'warn'
    })

    it('logs the message to the output channel', () => {
      subject()

      expect(OutputChannel.appendLine).to.have.been.calledOnceWithExactly('WARN: Sample message\n')
    })
  })

  context('with an error message', () => {
    beforeEach(() => {
      level = 'error'
    })

    it('logs the message to the output channel', () => {
      subject()

      expect(OutputChannel.appendLine).to.have.been.calledOnceWithExactly('ERROR: Sample message\n')
    })
  })
})
