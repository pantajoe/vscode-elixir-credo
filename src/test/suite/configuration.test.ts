import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as configurationModule from '../../configuration';

describe('Configuration', () => {
  let sandbox: SinonSandbox;
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    process.env = OLD_ENV;
    sandbox.restore();
  });

  context('#autodetectExecutePath', () => {
    const { autodetectExecutePath } = configurationModule;

    context('with a valid execute path', () => {
      context('on a UNIX based OS', () => {
        const validPath = '/usr/bin/.asdf/shims';

        beforeEach(() => {
          process.env.PATH = `${validPath}:/useless/path`;
          sandbox.stub(fs, 'existsSync').withArgs(`${validPath}/mix`).returns(true);
        });

        it('selects the first valid execute path for the mix command', () => {
          expect(autodetectExecutePath()).to.equal(`${validPath}/`);
        });
      });

      context('on a windows platform', () => {
        const validPath = 'C:\\Program Files (x86)\\Elixir\\bin';

        beforeEach(() => {
          process.env.PATH = `${validPath};C:\\Windows\\Useless\\Path`;
          sandbox.stub(os, 'platform').returns('win32');
          sandbox.replace(path, 'join', path.win32.join);
          sandbox.replace(path, 'delimiter', path.win32.delimiter);
          sandbox.replace(path, 'sep', path.win32.sep);
          sandbox.stub(fs, 'existsSync').withArgs(`${validPath}\\mix.bat`).returns(true);
        });

        it('selects the first valid execute path for the mix command', () => {
          expect(autodetectExecutePath()).to.equal(`${validPath}\\`);
        });
      });
    });

    context('without any valid execute path', () => {
      beforeEach(() => {
        process.env.PATH = '/useless/path:/another/useless/path';
      });

      it('returns an empty execute path to try executing mix on a global scope', () => {
        expect(autodetectExecutePath()).to.equal('');
      });
    });
  });

  context('#configuration', () => {
    let fetchConfigStub: SinonStub<void[], configurationModule.CredoConfiguration>;
    const reloadConfig = () => {
      configurationModule.reloadConfiguration(fetchConfigStub);
    };

    context('when fetching the extension config', () => {
      beforeEach(() => {
        fetchConfigStub = sandbox.stub(configurationModule, 'fetchConfig').returns({
          command: 'mix',
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          checksWithTag: [],
          checksWithoutTag: [],
          strictMode: false,
          ignoreWarningMessages: false,
          lintEverything: false,
          enableDebug: false,
        });
      });

      it('returns a valid config', () => {
        reloadConfig();
        const {
          command,
          configurationFile,
          credoConfiguration,
          strictMode,
          ignoreWarningMessages,
          lintEverything,
          enableDebug,
        } = configurationModule.getCurrentConfiguration();
        expect(command).to.equal('mix');
        expect(configurationFile).to.equal('.credo.exs');
        expect(credoConfiguration).to.equal('default');
        expect(strictMode).to.be.false;
        expect(ignoreWarningMessages).to.be.false;
        expect(lintEverything).to.be.false;
        expect(enableDebug).to.be.false;
      });
    });

    context('when the config changes', () => {
      beforeEach(() => {
        const initialConfig: configurationModule.CredoConfiguration = {
          command: 'mix',
          configurationFile: '.credo.exs',
          credoConfiguration: 'default',
          checksWithTag: [],
          checksWithoutTag: [],
          strictMode: false,
          ignoreWarningMessages: false,
          lintEverything: false,
          enableDebug: false,
        };
        fetchConfigStub = sandbox.stub(configurationModule, 'fetchConfig').returns(initialConfig);
        reloadConfig();
        fetchConfigStub.restore();
        fetchConfigStub = sandbox.stub(configurationModule, 'fetchConfig').returns({
          ...initialConfig,
          ignoreWarningMessages: true,
        });
      });

      it('reloads the config', () => {
        expect(configurationModule.getCurrentConfiguration().ignoreWarningMessages).to.be.false;
        reloadConfig();
        expect(fetchConfigStub.called).to.be.true;
        expect(configurationModule.getCurrentConfiguration().ignoreWarningMessages).to.be.true;
      });
    });
  });
});
