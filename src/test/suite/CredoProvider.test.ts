import * as vscode from 'vscode';
import { createSandbox, SinonSandbox } from 'sinon';
import { expect } from 'chai';
import * as configurationModule from '../../configuration';
import CredoProvider from '../../CredoProvider';

describe('CredoProvider', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  context('#isOnSave', () => {
    context('when the onSave flag in the extension\'s configuration is on', () => {
      beforeEach(() => {
        sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
          command: 'mix',
          onSave: true,
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          strictMode: false,
        }));

        it('returns true', () => {
          const credoProvider = new CredoProvider(vscode.languages.createDiagnosticCollection('elixir'));
          expect(credoProvider.isOnSave).to.equal(true);
        });
      });
    });

    context('when the onSave flag in the extension\'s configuration is off', () => {
      beforeEach(() => {
        sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
          command: 'mix',
          onSave: false,
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          strictMode: false,
        }));
      });

      it('returns false', () => {
        const credoProvider = new CredoProvider(vscode.languages.createDiagnosticCollection('elixir'));
        expect(credoProvider.isOnSave).to.equal(false);
      });
    });
  });
});
