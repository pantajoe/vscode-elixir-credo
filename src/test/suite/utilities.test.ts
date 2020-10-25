import * as vscode from 'vscode';
import { expect } from 'chai';
import {
  assert, createSandbox, SinonSandbox, SinonSpy,
} from 'sinon';
import * as fs from 'fs';
import { makeZeroBasedIndex, getCommandArguments } from '../../utilities';
import * as configurationModule from '../../configuration';

describe('Utilities', () => {
  context('#makeZeroBasedIndex', () => {
    it('An index of 1 is transformed into 0', () => {
      expect(makeZeroBasedIndex(1)).to.equal(0);
    });

    it('null is transformed into 0', () => {
      expect(makeZeroBasedIndex(null)).to.equal(0);
    });

    it('undefined is transformed into 0', () => {
      expect(makeZeroBasedIndex(undefined)).to.equal(0);
    });

    it('a number below 0 is transformed into 0', () => {
      expect(makeZeroBasedIndex(-1)).to.equal(0);
    });
  });

  context('#getCommandArguments', () => {
    let sandbox: SinonSandbox;

    beforeEach(() => {
      sandbox = createSandbox();
      sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
        command: 'mix',
        onSave: true,
        configurationFile: '.credo.exs',
        credoConfiguration: 'default',
        strictMode: false,
      }));
    });

    afterEach(() => {
      sandbox.restore();
    });

    context('if only one configuration file is found', () => {
      beforeEach(() => {
        sandbox.stub(fs, 'existsSync').callsFake((file) => file === '.credo.exs');
      });

      it('successfully adds the config file to the CLI arguments', () => {
        assert.match(
          getCommandArguments(),
          ['credo', '--format', 'json', '--read-from-stdin', '--config-file', '.credo.exs', '--config-name', 'default'],
        );
      });
    });

    context('if no configuration file is found', () => {
      let showWarningMessageSpy: SinonSpy;

      beforeEach(() => {
        showWarningMessageSpy = sandbox.spy(vscode.window, 'showWarningMessage');
        sandbox.stub(fs, 'existsSync').returns(false);
      });

      it('shows a warning message', () => {
        getCommandArguments();
        expect(showWarningMessageSpy.calledOnceWith('.credo.exs file does not exist. Ignoring...'))
          .to.true;
      });

      it('does not include a --configuration-file argument', () => {
        expect(getCommandArguments()).to.not.include('--configuration-file');
      });
    });

    context('if more than one configuration file is found', () => {
      let showWarningMessageSpy: SinonSpy;

      beforeEach(() => {
        showWarningMessageSpy = sandbox.spy(vscode.window, 'showWarningMessage');
        sandbox.stub(fs, 'existsSync').returns(true);
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
          index: 0,
          name: 'test',
          uri: vscode.Uri.parse('file:///usr/home'),
        }]);
      });

      it('shows a warning message', () => {
        getCommandArguments();
        assert.calledOnceWithExactly(
          showWarningMessageSpy,
          'Found multiple files (.credo.exs,/usr/home/.credo.exs) will use .credo.exs',
        );
      });
    });

    context('with enabled strict-mode', () => {
      beforeEach(() => {
        sandbox.restore();
        sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
          command: 'mix',
          onSave: true,
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          strictMode: true,
        }));
      });

      it('includes `--strict-mode`', () => {
        expect(getCommandArguments()).to.include('--strict');
      });
    });
  });
});