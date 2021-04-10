import { expect } from 'chai';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import * as configurationModule from '../../configuration';
import ConfigurationProvider from '../../ConfigurationProvider';

describe('ConfigurationProvider', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  context('when fetching the extension config', () => {
    let configStub: SinonStub<[], configurationModule.CredoConfiguration>;

    beforeEach(() => {
      ConfigurationProvider.destroy();
      configStub = sandbox.stub(configurationModule, 'getConfig').returns({
        command: 'mix',
        configurationFile: '.credo.exs',
        credoConfiguration: 'default',
        strictMode: false,
        ignoreWarningMessages: false,
        lintEverything: false,
        enableDebug: false,
      });
    });

    it('fetches the config when called the first time', () => {
      ConfigurationProvider.instance.config;

      expect(configStub.calledOnce).to.be.true;
    });

    it('returns a valid config', () => {
      const {
        command,
        configurationFile,
        credoConfiguration,
        strictMode,
        ignoreWarningMessages,
        lintEverything,
      } = ConfigurationProvider.instance.config;
      expect(command).to.equal('mix');
      expect(configurationFile).to.equal('.credo.exs');
      expect(credoConfiguration).to.equal('default');
      expect(strictMode).to.be.false;
      expect(ignoreWarningMessages).to.be.false;
      expect(lintEverything).to.be.false;
    });
  });

  context('when the config changes', () => {
    let configStub: SinonStub<[], configurationModule.CredoConfiguration>;

    beforeEach(() => {
      ConfigurationProvider.destroy();
      configStub = sandbox.stub(configurationModule, 'getConfig').returns({
        command: 'mix',
        configurationFile: '.credo.exs',
        credoConfiguration: 'default',
        strictMode: false,
        ignoreWarningMessages: false,
        lintEverything: false,
        enableDebug: false,
      });
      const { config } = ConfigurationProvider.instance;
      configStub.restore();
      configStub = sandbox.stub(configurationModule, 'getConfig').returns({
        ...config,
        ignoreWarningMessages: true,
      });
    });

    it('reloads the config', () => {
      expect(ConfigurationProvider.instance.config.ignoreWarningMessages).to.be.false;
      ConfigurationProvider.instance.reloadConfig();
      expect(configStub.called).to.be.true;
      expect(ConfigurationProvider.instance.config.ignoreWarningMessages).to.be.true;
    });
  });
});
