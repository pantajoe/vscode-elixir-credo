import * as vscode from 'vscode';
import { expect } from 'chai';
import {
  assert, createSandbox, SinonSandbox, SinonSpy,
} from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { trunc, makeZeroBasedIndex, getCommandArguments, getCommandEnvironment, getCurrentPath } from '../../utilities';
import { CredoConfiguration } from '../../configuration';
import ConfigurationProvider from '../../ConfigurationProvider';
import * as loggingModule from '../../logger';

const { LogLevel } = loggingModule;

declare let $config: CredoConfiguration;
declare let $documentUri: vscode.Uri;

describe('Utilities', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

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

  context('#trunc', () => {
    it('removes any trailing new line with spaces', () => {
      const result = trunc`This
        is so
        nice times
        ${2 + 1}`;

      expect(result).to.equal('This is so nice times 3');
    });
  });

  context('#getCurrentPath', () => {
    const fetchCurrentPath = () => getCurrentPath($documentUri);

    beforeEach(() => {
      sandbox.replaceGetter(vscode.workspace, 'workspaceFolders', () => [
        {
          index: 0,
          name: 'Another workspace',
          uri: vscode.Uri.file(path.resolve(__dirname)),
        },
        {
          index: 1,
          name: 'Main Workspace',
          uri: vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures')),
        },
      ]);
    });

    context('with a file in an opened workspace', () => {
      def('documentUri', () => vscode.Uri.file(path.resolve(__dirname, '../../../src/test/fixtures/sample.ex')));

      it('returns the main workspace\'s directory', () => {
        expect(fetchCurrentPath()).to.equal(path.resolve(__dirname, '../../../src/test/fixtures'));
      });
    });

    context('with a file without a workspace', () => {
      def('documentUri', () => vscode.Uri.file(path.resolve(__filename)));

      it('returns the directory of the file', () => {
        expect(fetchCurrentPath()).to.equal(path.resolve(__dirname));
      });
    });
  });

  context('#getCommandArguments', () => {
    def('config', () => ({
      command: 'mix',
      configurationFile: '.credo.exs',
      credoConfiguration: 'default',
      strictMode: false,
      ignoreWarningMessages: false,
      lintEverything: false,
    }));

    beforeEach(() => {
      sandbox.replaceGetter(ConfigurationProvider, 'instance', () => ({
        config: $config,
        reloadConfig: () => {},
      }));
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
      let logSpy: SinonSpy<loggingModule.LogArguments[], void>;

      beforeEach(() => {
        logSpy = sandbox.spy(loggingModule, 'log');
        sandbox.stub(fs, 'existsSync').returns(false);
      });

      it('shows a warning message', () => {
        getCommandArguments();
        sandbox.assert.calledOnceWithExactly(
          logSpy,
          {
            message: '.credo.exs file does not exist. Ignoring...',
            level: LogLevel.Warning,
          },
        );
      });

      it('does not include a --config-file argument', () => {
        expect(getCommandArguments()).to.not.include('--config-file');
      });
    });

    context('if more than one configuration file is found', () => {
      let logSpy: SinonSpy<loggingModule.LogArguments[], void>;

      beforeEach(() => {
        logSpy = sandbox.spy(loggingModule, 'log');
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
          logSpy,
          {
            message: 'Found multiple files (.credo.exs,/usr/home/.credo.exs) will use .credo.exs',
            level: LogLevel.Warning,
          },
        );
      });
    });

    context('with enabled strict-mode', () => {
      def('config', () => ({
        command: 'mix',
        configurationFile: '.credo.exs',
        credoConfiguration: 'default',
        strictMode: true,
        ignoreWarningMessages: false,
        lintEverything: false,
      }));

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
      const executePath = '/usr/.asdf/shims';

      beforeEach(() => {
        sandbox.stub(vscode.workspace, 'getConfiguration').withArgs('elixir.credo').callsFake(() => ({
          get(prop: string) {
            if (prop === 'executePath') {
              return executePath;
            }
            return null;
          },
        } as any));
      });

      it('returns a shallow copy of the PATH variable without any changes', () => {
        expect(getCommandEnvironment().PATH).to.include(`${path.delimiter}${executePath}`);
      });
    });
  });
});
