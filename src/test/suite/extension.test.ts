import * as path from 'node:path'
import * as vscode from 'vscode'
import type { SinonSandbox, SinonSpy, SinonStub } from 'sinon'
import { createSandbox, match } from 'sinon'
import { expect } from 'chai'
import * as configurationModule from '../../configuration'
import * as loggerModule from '../../logger'
import { activate } from '../../extension'
import type { CredoExecutionArgs } from '../../provider'
import { CredoProvider } from '../../provider'

const { LogLevel } = loggerModule

declare let $extensionContext: vscode.ExtensionContext
declare let $textDocument: vscode.TextDocument
declare let $textDocuments: vscode.TextDocument[]
declare let $exampleFilePath: string

describe('Extension Tests', () => {
  let sandbox: SinonSandbox

  def('exampleFilePath', () => path.resolve(__dirname, '../../../src/test/fixtures/src/sample.ex'))

  beforeEach(() => {
    sandbox = createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  context('activation', () => {
    const activateExtension = () => {
      activate($extensionContext)
    }

    def('extensionContext', () => ({ subscriptions: [] }))

    it('logs that the extension was activated successfully', () => {
      const logSpy = sandbox.spy(loggerModule, 'log')

      activateExtension()

      sandbox.assert.calledWith(logSpy, {
        message: 'Credo (Elixir Linter) initiated successfully.',
        level: LogLevel.Info,
      })
    })

    context('when listening for configuration changes', () => {
      let eventListenerSpy: SinonSpy<any[], vscode.Disposable>
      let configurationSpy: SinonSpy<((() => configurationModule.CredoConfiguration) | undefined)[], void>

      const callOnDidChangeConfigurationHandler = () => {
        // call the extension's registered event handler for a `vscode.ConfigurationChangeEvent`
        eventListenerSpy.getCall(0).args[0]({
          affectsConfiguration(_section: string, _scope: vscode.ConfigurationScope | undefined) {
            return true
          },
        } as vscode.ConfigurationChangeEvent)
      }

      beforeEach(() => {
        eventListenerSpy = sandbox.spy(vscode.workspace, 'onDidChangeConfiguration')
        configurationSpy = sandbox.spy(configurationModule, 'reloadConfiguration')
      })

      it('registers an event handler for a ConfigurationChangeEvent', () => {
        activateExtension()

        sandbox.assert.calledOnce(eventListenerSpy)
      })

      it('refreshes the configuration on a ConfigurationChangeEvent', () => {
        activateExtension()
        callOnDidChangeConfigurationHandler()

        expect(configurationSpy.calledOnce).to.be.true
      })

      it('logs a message', () => {
        const logSpy = sandbox.spy(loggerModule, 'log')

        activateExtension()
        callOnDidChangeConfigurationHandler()

        sandbox.assert.calledWith(logSpy, {
          message: 'Extension configuration has changed. Refreshing configuration ...',
          level: LogLevel.Debug,
        })
      })
    })

    context('when listening to document-specific events', () => {
      let credoExecutionSpy: SinonSpy<CredoExecutionArgs[], void>

      beforeEach(() => {
        sandbox.replaceGetter(vscode.workspace, 'textDocuments', () => $textDocuments)
        credoExecutionSpy = sandbox.spy(CredoProvider.prototype, 'execute')
      })

      context('with opened documents', () => {
        def('textDocument', () => ({ getText: () => 'sample elixir document' }))
        def('textDocuments', () => [$textDocument])

        it('lints all opened elixir documents', () => {
          activateExtension()

          sandbox.assert.calledOnceWithExactly(credoExecutionSpy, { document: $textDocument })
        })
      })

      context('without opened documents', () => {
        def('textDocuments', () => [])

        it('lints all opened elixir documents', () => {
          activateExtension()

          sandbox.assert.notCalled(credoExecutionSpy)
        })
      })
    })

    context('when opening an elixir document', () => {
      let eventListenerSpy: SinonSpy<any[], vscode.Disposable>
      let credoExecutionSpy: SinonSpy<CredoExecutionArgs[], void>
      const openDocument = (document: vscode.TextDocument) => {
        return vscode.window.showTextDocument(document.uri, { preview: true, preserveFocus: false })
      }

      def('textDocument', () => ({
        uri: vscode.Uri.file($exampleFilePath),
      }))

      beforeEach(() => {
        eventListenerSpy = sandbox.spy(vscode.workspace, 'onDidOpenTextDocument')
        credoExecutionSpy = sandbox.spy(CredoProvider.prototype, 'execute')
      })

      afterEach(() => {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      })

      it('registers an event handler for saving a TextDocument', () => {
        activateExtension()

        sandbox.assert.calledOnce(eventListenerSpy)
      })

      it('executes credo when a document is opened', (done) => {
        activateExtension()
        openDocument($textDocument).then(() => {
          sandbox.assert.calledWith(credoExecutionSpy, match.hasNested('document.fileName', match($exampleFilePath)))
          done()
        })
      })
    })

    context('when saving an elixir document', () => {
      let eventListenerSpy: SinonSpy<any[], vscode.Disposable>
      let credoExecutionSpy: SinonSpy<CredoExecutionArgs[], void>
      const saveDocument = (document: vscode.TextDocument) => {
        return vscode.window
          .showTextDocument(document.uri, { preview: false, preserveFocus: false })
          .then(() => vscode.window.activeTextEditor?.document.save())
      }

      afterEach(() => {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      })

      def('textDocument', () => ({
        uri: vscode.Uri.file($exampleFilePath),
      }))

      beforeEach(() => {
        eventListenerSpy = sandbox.spy(vscode.workspace, 'onDidSaveTextDocument')
        sandbox.replaceGetter(vscode.workspace, 'textDocuments', () => [$textDocument])
        credoExecutionSpy = sandbox.spy(CredoProvider.prototype, 'execute')
      })

      it('registers an event handler for saving a TextDocument', () => {
        activateExtension()

        sandbox.assert.calledOnce(eventListenerSpy)
      })

      it('executes credo on save', (done) => {
        activateExtension()
        saveDocument($textDocument).then((isSaved) => {
          expect(isSaved).to.be.true
          sandbox.assert.calledWith(credoExecutionSpy, match.hasNested('document.uri.fsPath', match($exampleFilePath)))
          done()
        })
      }).retries(3)
    })

    context('when closing an elixir document', () => {
      let eventListenerSpy: SinonSpy<any[], vscode.Disposable>
      let credoClearStub: SinonStub<{ document: vscode.TextDocument }[], void>

      beforeEach(() => {
        eventListenerSpy = sandbox.spy(vscode.workspace, 'onDidCloseTextDocument')

        credoClearStub = sandbox.stub(CredoProvider.prototype, 'clear').callsFake((_args) => {})
      })

      it('registers an event handler for closing a text document', () => {
        activateExtension()

        sandbox.assert.calledOnce(eventListenerSpy)
      })

      it("clears document's diagnostics when closed", () => {
        activateExtension()

        // call the extension's registered event handler for a `vscode.ConfigurationChangeEvent`
        eventListenerSpy.getCall(0).args[0]({} as vscode.TextDocument)

        expect(credoClearStub.calledOnce).to.be.true
      })
    })
  })
})
