import * as path from 'node:path'
import { fromPartial } from '@total-typescript/shoehorn'
import type { SinonSpy, SinonStub } from 'sinon'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { config } from '../../configuration'
import { CredoExtension } from '../../credo-extension'
import { logger } from '../../logger'
import type { CredoExecutionArgs } from '../../provider'
import { CredoProvider } from '../../provider'
import type { Task } from '../../task-queue'

describe('Extension Tests', () => {
  let exampleFilePath: string

  beforeEach(() => {
    exampleFilePath = path.resolve(__dirname, '../../../src/test/fixtures/src/sample.ex')
    sinon.spy(logger, 'log')
  })

  context('activation', () => {
    let extensionContext: vscode.ExtensionContext
    let textDocument: vscode.TextDocument
    let textDocuments: vscode.TextDocument[]

    const subject = () => new CredoExtension().activate(extensionContext)

    beforeEach(() => {
      extensionContext = fromPartial({ subscriptions: [] })
    })

    it('logs that the extension was activated successfully', () => {
      subject()

      expect(logger.log).to.have.been.calledWith('info', 'Credo (Elixir Linter) initiated successfully.')
    })

    context('when listening for configuration changes', () => {
      let eventListenerSpy: SinonSpy<Parameters<typeof vscode.workspace.onDidChangeConfiguration>, vscode.Disposable>

      const callOnDidChangeConfigurationHandler = () => {
        // call the extension's registered event handler for a `vscode.ConfigurationChangeEvent`
        eventListenerSpy.getCall(0).args[0]({
          affectsConfiguration(_section: string, _scope: vscode.ConfigurationScope | undefined) {
            return true
          },
        } as vscode.ConfigurationChangeEvent)
      }

      beforeEach(() => {
        eventListenerSpy = sinon.spy(vscode.workspace, 'onDidChangeConfiguration')
        sinon.spy(config, 'reload')
      })

      it('registers an event handler for a ConfigurationChangeEvent', () => {
        subject()

        expect(eventListenerSpy).to.have.been.calledOnce
      })

      it('refreshes the configuration on a ConfigurationChangeEvent', () => {
        subject()
        callOnDidChangeConfigurationHandler()

        expect(config.reload).to.have.been.calledOnce
      })

      it('logs a message', () => {
        subject()
        callOnDidChangeConfigurationHandler()

        expect(logger.log).to.have.been.calledWith(
          'debug',
          'Extension configuration has changed. Refreshing configuration ...',
        )
      })
    })

    context('when listening to document-specific events', () => {
      let credoExecutionSpy: SinonSpy<
        [document: vscode.TextDocument, opts?: CredoExecutionArgs | undefined],
        Task | undefined
      >

      beforeEach(() => {
        sinon.replaceGetter(vscode.workspace, 'textDocuments', () => textDocuments)
        credoExecutionSpy = sinon.spy(CredoProvider.prototype, 'execute')
      })

      context('with opened documents', () => {
        beforeEach(() => {
          textDocument = {
            getText: () => 'sample elixir document',
          } as vscode.TextDocument
          textDocuments = [textDocument]
        })

        it('lints all opened elixir documents', () => {
          subject()

          expect(credoExecutionSpy).to.have.been.calledOnceWithExactly(textDocument)
        })
      })

      context('without opened documents', () => {
        beforeEach(() => {
          textDocuments = []
        })

        it('lints all opened elixir documents', () => {
          subject()

          expect(credoExecutionSpy).to.not.have.been.called
        })
      })
    })

    context('when opening an elixir document', () => {
      let eventListenerSpy: SinonSpy<Parameters<typeof vscode.workspace.onDidOpenTextDocument>, vscode.Disposable>
      let credoExecutionSpy: SinonSpy<
        [document: vscode.TextDocument, opts?: CredoExecutionArgs | undefined],
        Task | undefined
      >
      const openDocument = (document: vscode.TextDocument) => {
        return vscode.window.showTextDocument(document.uri, {
          preview: true,
          preserveFocus: false,
        })
      }

      beforeEach(() => {
        textDocument = {
          uri: vscode.Uri.file(exampleFilePath),
        } as vscode.TextDocument

        eventListenerSpy = sinon.spy(vscode.workspace, 'onDidOpenTextDocument')
        credoExecutionSpy = sinon.spy(CredoProvider.prototype, 'execute')
      })

      afterEach(() => {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      })

      it('registers an event handler for saving a TextDocument', () => {
        subject()

        sinon.assert.calledOnce(eventListenerSpy)
      })

      it('executes credo when a document is opened', async () => {
        subject()
        await openDocument(textDocument)

        expect(credoExecutionSpy).to.have.been.calledWith(sinon.match.has('fileName', sinon.match(exampleFilePath)))
      })
    })

    context('when saving an elixir document', () => {
      let eventListenerSpy: SinonSpy<Parameters<typeof vscode.workspace.onDidSaveTextDocument>, vscode.Disposable>
      let credoExecutionSpy: SinonSpy<
        [document: vscode.TextDocument, opts?: CredoExecutionArgs | undefined],
        Task | undefined
      >
      const saveDocument = async (document: vscode.TextDocument) => {
        await vscode.window.showTextDocument(document.uri, {
          preview: false,
          preserveFocus: false,
        })
        return vscode.window.activeTextEditor?.document.save()
      }

      afterEach(() => {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor')
      })

      beforeEach(() => {
        textDocument = {
          uri: vscode.Uri.file(exampleFilePath),
        } as vscode.TextDocument

        eventListenerSpy = sinon.spy(vscode.workspace, 'onDidSaveTextDocument')
        sinon.replaceGetter(vscode.workspace, 'textDocuments', () => [textDocument])
        credoExecutionSpy = sinon.spy(CredoProvider.prototype, 'execute')
      })

      it('registers an event handler for saving a TextDocument', () => {
        subject()

        sinon.assert.calledOnce(eventListenerSpy)
      })

      it('executes credo on save', async () => {
        subject()
        const isSaved = await saveDocument(textDocument)
        expect(isSaved).to.be.true
        expect(credoExecutionSpy).to.have.been.calledWith(
          sinon.match.hasNested('uri.fsPath', sinon.match(exampleFilePath)),
        )
      }).retries(3)
    })

    context('when closing an elixir document', () => {
      let eventListenerSpy: SinonSpy<Parameters<typeof vscode.workspace.onDidCloseTextDocument>, vscode.Disposable>
      let credoClearStub: SinonStub<[vscode.TextDocument], void>

      beforeEach(() => {
        eventListenerSpy = sinon.spy(vscode.workspace, 'onDidCloseTextDocument')
        credoClearStub = sinon.stub(CredoProvider.prototype, 'clear').callsFake((_args) => {})
      })

      it('registers an event handler for closing a text document', () => {
        subject()

        expect(eventListenerSpy).to.have.been.calledOnce
      })

      it("clears document's diagnostics when closed", () => {
        subject()
        // call the extension's registered event handler for a `vscode.ConfigurationChangeEvent`
        eventListenerSpy.getCall(0).args[0]({} as vscode.TextDocument)

        expect(credoClearStub).to.have.been.calledOnce
      })
    })
  })
})
