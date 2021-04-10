import * as vscode from 'vscode';
import { createSandbox, SinonSandbox, SinonSpy } from 'sinon';
import { outputChannel, log, LogLevel } from '../../logger';
import { CredoConfiguration } from '../../configuration';
import ConfigurationProvider from '../../ConfigurationProvider';

declare let $message: string;
declare let $logLevel: LogLevel;
declare let $config: CredoConfiguration;
declare let $ignoreWarningMessages: boolean;
declare let $enableDebug: boolean;

describe('Loggging', () => {
  let sandbox: SinonSandbox;
  let outputChannelSpy: SinonSpy<string[], void>;
  let vscodeMessageSpy: SinonSpy;
  const logMessage = () => { log({ message: $message, level: $logLevel }); };

  def('message', () => 'Sample message');
  def('ignoreWarningMessages', () => false);
  def('enableDebug', () => false);
  def('config', () => ({
    command: 'mix',
    configurationFile: '.credo.exs',
    credoConfiguration: 'default',
    strictMode: false,
    ignoreWarningMessages: $ignoreWarningMessages,
    lintEverything: false,
    enableDebug: $enableDebug,
  }));

  beforeEach(() => {
    sandbox = createSandbox();
    outputChannelSpy = sandbox.spy(outputChannel, 'appendLine');
    sandbox.replaceGetter(ConfigurationProvider, 'instance', () => ({
      config: $config,
      reloadConfig: () => {},
    }));
  });

  afterEach(() => {
    sandbox.restore();
  });

  context('with a debug message', () => {
    def('logLevel', () => LogLevel.Debug);

    it('does not log the message to the output channel', () => {
      logMessage();

      sandbox.assert.notCalled(outputChannelSpy);
    });

    context('when enabling debug mode', () => {
      def('enableDebug', () => true);

      it('logs the message to the output channel', () => {
        logMessage();

        sandbox.assert.calledOnceWithExactly(outputChannelSpy, '> Sample message\n');
      });
    });
  });

  context('with an info message', () => {
    def('logLevel', () => LogLevel.Info);

    beforeEach(() => {
      vscodeMessageSpy = sandbox.spy(vscode.window, 'showInformationMessage');
    });

    it('logs the message to the output channel', () => {
      logMessage();

      sandbox.assert.calledOnceWithExactly(outputChannelSpy, '> Sample message\n');
    });

    it('shows no information popup', () => {
      logMessage();

      sandbox.assert.notCalled(vscodeMessageSpy);
    });

    context('when ignoring warning messages', () => {
      def('ignoreWarningMessages', () => true);

      it('logs the message to the output channel', () => {
        logMessage();

        sandbox.assert.calledOnceWithExactly(outputChannelSpy, '> Sample message\n');
      });

      it('does not shows an information popup', () => {
        logMessage();

        sandbox.assert.notCalled(vscodeMessageSpy);
      });
    });
  });

  context('with a warning message', () => {
    def('logLevel', () => LogLevel.Warning);

    beforeEach(() => {
      vscodeMessageSpy = sandbox.spy(vscode.window, 'showWarningMessage');
    });

    it('logs the message to the output channel', () => {
      logMessage();

      sandbox.assert.calledOnceWithExactly(outputChannelSpy, '> Sample message\n');
    });

    it('shows a warning popup', () => {
      logMessage();

      sandbox.assert.calledOnceWithExactly(vscodeMessageSpy, 'Sample message');
    });

    context('when ignoring warning messages', () => {
      def('ignoreWarningMessages', () => true);

      it('logs the message to the output channel', () => {
        logMessage();

        sandbox.assert.calledOnceWithExactly(outputChannelSpy, '> Sample message\n');
      });

      it('does not shows a warning popup', () => {
        logMessage();

        sandbox.assert.notCalled(vscodeMessageSpy);
      });
    });
  });

  context('with an error message', () => {
    def('logLevel', () => LogLevel.Error);

    beforeEach(() => {
      vscodeMessageSpy = sandbox.spy(vscode.window, 'showErrorMessage');
    });

    it('logs the message to the output channel', () => {
      logMessage();

      sandbox.assert.calledOnceWithExactly(outputChannelSpy, '> Sample message\n');
    });

    it('shows an error popup', () => {
      logMessage();

      sandbox.assert.calledOnceWithExactly(vscodeMessageSpy, 'Sample message');
    });

    context('when ignoring warning messages', () => {
      def('ignoreWarningMessages', () => true);

      it('logs the message to the output channel', () => {
        logMessage();

        sandbox.assert.calledOnceWithExactly(outputChannelSpy, '> Sample message\n');
      });

      it('still shows an error popup', () => {
        logMessage();

        sandbox.assert.calledOnceWithExactly(vscodeMessageSpy, 'Sample message');
      });
    });
  });
});
