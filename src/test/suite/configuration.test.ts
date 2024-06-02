import fs from 'node:fs'
import process from 'node:process'
import * as sinon from 'sinon'
import type { SinonStub } from 'sinon'
import * as configurationModule from '../../configuration'
import { CredoUtils } from '../../credo-utils'

describe('Configuration', () => {
  const OLD_ENV = { ...process.env }

  afterEach(() => {
    process.env = { ...OLD_ENV }
  })

  context('#detectExecutePath', () => {
    const { detectExecutePath: subject } = configurationModule

    context('with a valid execute path', () => {
      context('on a UNIX based OS', () => {
        const validPath = '/usr/bin/.asdf/shims'

        beforeEach(() => {
          process.env.PATH = `${validPath}:/useless/path`
          sinon.stub(fs, 'existsSync').withArgs(`${validPath}/mix`).returns(true)
        })

        it('selects the first valid execute path for the mix command', () => {
          expect(subject()).to.equal(`${validPath}/`)
        })
      })

      context('on a windows platform', () => {
        const validPath = 'C:\\Program Files (x86)\\Elixir\\bin'

        beforeEach(() => {
          process.env.PATH = `${validPath};C:\\Windows\\Useless\\Path`
          sinon.stub(CredoUtils, 'getPlatform').returns('win32')
          sinon.stub(fs, 'existsSync').withArgs(`${validPath}\\mix.bat`).returns(true)
        })

        it('selects the first valid execute path for the mix command', () => {
          expect(subject()).to.equal(`${validPath}\\`)
        })
      })
    })

    context('without any valid execute path', () => {
      beforeEach(() => {
        process.env.PATH = '/useless/path:/another/useless/path'
      })

      it('returns an empty execute path to try executing mix on a global scope', () => {
        expect(subject()).to.equal('')
      })
    })
  })

  context('#configuration', () => {
    let fetchConfigStub: SinonStub<never[], configurationModule.CredoConfiguration>
    const { config } = configurationModule

    context('when fetching the extension config', () => {
      beforeEach(() => {
        fetchConfigStub = sinon.stub(config, 'fetch').returns({
          mixBinaryPath: '',
          mixCommand: 'mix',
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
        })
      })

      it('returns a valid config', () => {
        config.reload()

        expect(config.resolved).to.deep.equal({
          mixBinaryPath: '',
          mixCommand: 'mix',
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
        })
      })
    })

    context('when the config changes', () => {
      beforeEach(() => {
        const initialConfig: configurationModule.CredoConfiguration = {
          mixBinaryPath: '',
          mixCommand: 'mix',
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
        fetchConfigStub = sinon.stub(config, 'fetch').returns(initialConfig)
        config.reload()
        fetchConfigStub.restore()
        fetchConfigStub = sinon.stub(config, 'fetch').returns({
          ...initialConfig,
          ignoreWarningMessages: true,
        })
      })

      it('reloads the config', () => {
        config.reload()
        expect(fetchConfigStub).to.have.been.called
      })

      it('changes the config `ignoreWarningMessages`', () => {
        expect(() => config.reload()).to.alter(() => config.resolved.ignoreWarningMessages, { from: false, to: true })
      })
    })
  })
})
