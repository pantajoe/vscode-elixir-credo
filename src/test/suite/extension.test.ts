import * as vscode from 'vscode';
import { createSandbox, SinonSandbox } from 'sinon';
import { expect } from 'chai';
import * as configurationModule from '../../configuration';
import { activate } from '../../extension';

describe('Extension Tests', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  context('activation', () => {
    const extensionContext: vscode.ExtensionContext = { subscriptions: [] } as any;
    const subject = () => { activate(extensionContext); };

    it('refreshes the configuration on a onDidChangeConfiguration event', () => {
      const eventListenerSpy = sandbox.spy(vscode.workspace, 'onDidChangeConfiguration');

      subject();

      sandbox.assert.calledOnce(eventListenerSpy);

      const configurationSpy = sandbox.spy(configurationModule, 'getConfig');
      eventListenerSpy.args[0][0]({
        // test ConfigurationChangeEvent
        affectsConfiguration(section, _scope) {
          return section.includes('elixir');
        },
      });
      expect(configurationSpy.callCount).to.equal(1);
    });
  });
});
