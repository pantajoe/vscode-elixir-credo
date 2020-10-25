import { expect } from 'chai';
import { createSandbox, SinonSandbox } from 'sinon';
import * as fs from 'fs';
import { autodetectExecutePath } from '../../configuration';

describe('Configuration Functions', () => {
  const OLD_ENV = { ...process.env };

  afterEach(() => {
    process.env = OLD_ENV;
  });

  context('#autodetectExecutePath', () => {
    context('with a valid execute path', () => {
      const validPath = '/usr/bin/.asdf/shims';
      let sandbox: SinonSandbox;

      beforeEach(() => {
        sandbox = createSandbox();
        process.env.PATH = `${validPath}:/useless/path`;
        sandbox.stub(fs, 'existsSync').withArgs(`${validPath}/mix`).returns(true);
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('selects the first valid execute path for the mix command', () => {
        expect(autodetectExecutePath()).to.equal(`${validPath}/`);
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
});
