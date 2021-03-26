import { expect } from 'chai';
import { createSandbox, SinonSandbox } from 'sinon';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { autodetectExecutePath } from '../../configuration';

describe('Configuration Functions', () => {
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
});
