import * as vscode from 'vscode';
import { expect } from 'chai';
import {
  assert, createSandbox, SinonSandbox, SinonSpy, SinonStub,
} from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { makeZeroBasedIndex, getCommandArguments, getCommandEnvironment } from '../../utilities';
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
    let configurationModuleStub: SinonStub;

    beforeEach(() => {
      sandbox = createSandbox();
      configurationModuleStub = sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
        command: 'mix',
        onSave: true,
        configurationFile: '.credo.exs',
        credoConfiguration: 'default',
        strictMode: false,
        ignoreWarningMessages: false,
        lintEverything: false,
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

      it('does not include a --config-file argument', () => {
        expect(getCommandArguments()).to.not.include('--config-file');
      });

      context('if warning messages are ignored in config', () => {
        beforeEach(() => {
          configurationModuleStub.restore();
          sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
            command: 'mix',
            onSave: true,
            configurationFile: '.credo.exs',
            credoConfiguration: 'default',
            strictMode: false,
            ignoreWarningMessages: true,
            lintEverything: false,
          }));
        });

        it('does not show a warning message', () => {
          getCommandArguments();
          expect(showWarningMessageSpy.calledOnceWith('.credo.exs file does not exist. Ignoring...'))
            .to.false;
        });
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

      context('if warning messages are ignored in config', () => {
        beforeEach(() => {
          configurationModuleStub.restore();
          sandbox.stub(configurationModule, 'getConfig').callsFake(() => ({
            command: 'mix',
            onSave: true,
            configurationFile: '.credo.exs',
            credoConfiguration: 'default',
            strictMode: false,
            ignoreWarningMessages: true,
            lintEverything: false,
          }));
        });

        it('does not show a warning message', () => {
          getCommandArguments();
          expect(
            showWarningMessageSpy
              .calledOnceWith('Found multiple files (.credo.exs,/usr/home/.credo.exs) will use .credo.exs'),
          ).to.false;
        });
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
          ignoreWarningMessages: false,
          lintEverything: false,
        }));
      });

      it('includes `--strict-mode`', () => {
        expect(getCommandArguments()).to.include('--strict');
      });
    });
  });

  context('#getCommandEnvironment', () => {
    context('without any given executePath in the extension\'s configuration', () => {
      it('returns a shallow copy of the PATH variable without any changes', () => {
        expect(getCommandEnvironment().PATH).to.equal(process.env.PATH);
      });
    });

    context('with a given executePath in the extension\'s configuration', () => {
      let sandbox: SinonSandbox;
      const executePath = '/usr/.asdf/shims';

      beforeEach(() => {
        sandbox = createSandbox();
        sandbox.stub(vscode.workspace, 'getConfiguration').withArgs('elixir.credo').callsFake(() => ({
          get(prop: string) {
            if (prop === 'executePath') {
              return executePath;
            }
            return null;
          },
        } as any));
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('returns a shallow copy of the PATH variable without any changes', () => {
        expect(getCommandEnvironment().PATH).to.include(`${path.delimiter}${executePath}`);
      });
    });
  });
});
