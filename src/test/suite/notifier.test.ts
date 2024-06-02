import { fromAny, fromPartial } from '@total-typescript/shoehorn'
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { OutputChannel } from '../../logger'
import { Notifier } from '../../notifier'

describe('Notifier', () => {
  for (const { method, vscodeMethod } of [
    { method: 'info', vscodeMethod: 'showInformationMessage' },
    { method: 'warn', vscodeMethod: 'showWarningMessage' },
    { method: 'error', vscodeMethod: 'showErrorMessage' },
  ] as const) {
    context(`#${method}`, () => {
      let actions: string[] = []
      let selectedAction: string | undefined = undefined
      const subject = () => new Notifier()[method]('message', ...actions)

      beforeEach(() => {
        sinon.stub(vscode.window, vscodeMethod).callsFake(() => Promise.resolve(fromAny(selectedAction)))
        sinon.stub(OutputChannel, 'show').callsFake(() => {})
      })

      context('without actions', () => {
        beforeEach(() => {
          actions = []
        })

        it('shows an information message with the default action "Show output"', async () => {
          await subject()

          expect(vscode.window[vscodeMethod]).to.have.been.calledWith('message', 'Show output')
        })

        context('when the user selected "Show output"', () => {
          beforeEach(() => {
            selectedAction = 'Show output'
          })

          it('shows the output channel', async () => {
            await subject()

            expect(OutputChannel.show).to.have.been.called
          })

          it('returns undefined', async () => {
            const result = await subject()

            expect(result).to.be.undefined
          })
        })
      })

      context('with actions', () => {
        beforeEach(() => {
          actions = ['action1', 'action2']
        })

        it('shows an information message with the given actions', async () => {
          await subject()

          expect(vscode.window[vscodeMethod]).to.have.been.calledWith('message', 'action1', 'action2')
        })

        context('when the user selected an action', () => {
          beforeEach(() => {
            selectedAction = 'action1'
          })

          it('returns the selected action', async () => {
            const result = await subject()

            expect(result).to.equal('action1')
          })
        })

        context('when the user selected "Show output"', () => {
          beforeEach(() => {
            selectedAction = 'Show output'
          })

          it('shows the output channel', async () => {
            await subject()

            expect(OutputChannel.show).to.have.been.called
          })

          it('returns undefined', async () => {
            const result = await subject()

            expect(result).to.be.undefined
          })
        })
      })
    })
  }

  context('#pending', () => {
    let progress: vscode.Progress<{ message?: string; increment?: number }>
    let onCancelRegister: sinon.SinonStub
    let task: sinon.SinonStub<Parameters<Parameters<typeof Notifier.prototype.pending>[1]>, Promise<'result'>>
    const subject = () => new Notifier().pending('message', task)

    beforeEach(() => {
      progress = fromPartial({ report: sinon.stub() })
      task = sinon
        .stub<Parameters<Parameters<typeof Notifier.prototype.pending>[1]>, Promise<'result'>>()
        .callsFake(({ progress, cancelToken }) => {
          cancelToken.onCancellationRequested(() => {})
          progress.report({ increment: 10 })
          return Promise.resolve('result')
        })
      onCancelRegister = sinon.stub()

      sinon.stub(vscode.window, 'withProgress').callsFake((_, task) => {
        return task(progress, fromPartial({ onCancellationRequested: onCancelRegister }))
      })
    })

    it('shows a pending notification', async () => {
      await subject()

      expect(vscode.window.withProgress).to.have.been.calledWith(
        {
          cancellable: true,
          title: 'message',
          location: vscode.ProgressLocation.Notification,
        },
        sinon.match.func,
      )
    })

    it('calls the callback', async () => {
      await subject()

      expect(task).to.have.been.calledWith({ progress, cancelToken: sinon.match.has('onCancellationRequested') })
    })

    it('returns the result', async () => {
      const result = await subject()

      expect(result).to.equal('result')
    })

    it('reports the progress', async () => {
      await subject()

      expect(progress.report).to.have.been.calledWith({ increment: 0 })
      expect(progress.report).to.have.been.calledWith({ increment: 10 })
      expect(progress.report).to.have.been.calledWith({ increment: 100 })
    })
  })
}).timeout(5_000)
