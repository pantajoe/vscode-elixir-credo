import { expect } from 'chai';
import { def } from 'bdd-lazy-var/global';
import * as cp from 'child_process';
import { createSandbox, SinonSandbox, SinonSpy } from 'sinon';
import { CredoOutput, CredoInformation } from '../../output';
import { parseOutput, reportError } from '../../execution';
import * as loggerModule from '../../logger';

declare let $output: string;
declare let $error: cp.ExecException | null;
declare let $stderr: string | Buffer;

describe('Credo Execution Functions', () => {
  let sandbox: SinonSandbox;
  let logSpy: SinonSpy<loggerModule.LogArguments[], void>;

  beforeEach(() => {
    sandbox = createSandbox();
    logSpy = sandbox.spy(loggerModule, 'log');
  });

  afterEach(() => {
    sandbox.restore();
  });

  context('#parseOutput', () => {
    context('with CredoInformation', () => {
      const parse = () => parseOutput<CredoInformation>($output);

      context('with an empty string', () => {
        def('output', () => '');

        it('returns null', () => {
          expect(parse()).to.be.null;
        });

        it('logs an error', () => {
          parse();

          sandbox.assert.calledWith(logSpy, {
            level: loggerModule.LogLevel.Error,
            // eslint-disable-next-line max-len
            message:
              'Command `mix credo` returns empty output! Please check your configuration. Did you add or modify your dependencies? You might need to run `mix deps.get` or recompile.',
          });
        });
      });

      context('with non-JSON output', () => {
        def('output', () => 'No JSON');

        it('returns null', () => {
          expect(parse()).to.be.null;
        });

        it('logs an error', () => {
          parse();

          sandbox.assert.calledWith(logSpy, {
            level: loggerModule.LogLevel.Error,
            // eslint-disable-next-line max-len
            message: 'Error on parsing output (It might be non-JSON output): "No JSON"',
          });
        });
      });

      context('with valid JSON output', () => {
        def(
          'output',
          () => `
          Some warning message.
          {
            "config": {
              "checks": [],
              "files": ["lib/sample_web/telemetry.ex"]
            },
            "system": {
              "credo": "1.5.4-ref.main.9fe4739+uncommittedchanges",
              "elixir": "1.11.1",
              "erlang": "23"
            }
          }
        `,
        );

        it('returns parsed credo information', () => {
          expect(parse()).to.deep.equal({
            config: {
              checks: [],
              files: ['lib/sample_web/telemetry.ex'],
            },
            system: {
              credo: '1.5.4-ref.main.9fe4739+uncommittedchanges',
              elixir: '1.11.1',
              erlang: '23',
            },
          });
        });

        it('does not log anything', () => {
          parse();

          expect(logSpy.notCalled).to.be.true;
        });
      });
    });

    context('with normal CredoOutput', () => {
      const parse = () => parseOutput<CredoOutput>($output);

      context('with an empty string', () => {
        def('output', () => '');

        it('returns null', () => {
          expect(parse()).to.be.null;
        });

        it('logs an error', () => {
          parse();

          sandbox.assert.calledWith(logSpy, {
            level: loggerModule.LogLevel.Error,
            // eslint-disable-next-line max-len
            message:
              'Command `mix credo` returns empty output! Please check your configuration. Did you add or modify your dependencies? You might need to run `mix deps.get` or recompile.',
          });
        });
      });

      context('with non-JSON output', () => {
        def('output', () => 'No JSON');

        it('returns null', () => {
          expect(parse()).to.be.null;
        });

        it('logs an error', () => {
          parse();

          sandbox.assert.calledWith(logSpy, {
            level: loggerModule.LogLevel.Error,
            // eslint-disable-next-line max-len
            message: 'Error on parsing output (It might be non-JSON output): "No JSON"',
          });
        });
      });

      context('with valid JSON output', () => {
        def(
          'output',
          () => `
          Some warning message.
          {
            "issues": [{
              "category": "readability",
              "check": "Credo.Check.Readability.ModuleDoc",
              "column": 11,
              "column_end": 32,
              "filename": "lib/sample_web/telemetry.ex",
              "line_no": 1,
              "message": "Modules should have a @moduledoc tag.",
              "priority": 1,
              "trigger": "SampleWeb.Telemetry"
            }]
          }
        `,
        );

        it('returns parsed credo output', () => {
          expect(parse()).to.deep.equal({
            issues: [
              {
                category: 'readability',
                check: 'Credo.Check.Readability.ModuleDoc',
                column: 11,
                column_end: 32,
                filename: 'lib/sample_web/telemetry.ex',
                line_no: 1,
                message: 'Modules should have a @moduledoc tag.',
                priority: 1,
                trigger: 'SampleWeb.Telemetry',
              },
            ],
          });
        });

        it('does not log anything', () => {
          parse();

          expect(logSpy.notCalled).to.be.true;
        });
      });
    });
  });

  context('#reportError', () => {
    const report = () => reportError({ error: $error, stderr: $stderr });

    context('with an "ENOENT" error', () => {
      def('error', () => ({ code: 'ENOENT' }));
      def('stderr', () => '');

      it('returns true', () => {
        expect(report()).to.be.true;
      });

      it('logs an error message that the mix binary is not found', () => {
        report();

        sandbox.assert.calledWith(logSpy, {
          level: loggerModule.LogLevel.Error,
          // eslint-disable-next-line max-len
          message:
            '`mix` is not executable. Try setting the option in this extension\'s configuration "elixir.credo.executePath" to the path of the mix binary.',
        });
      });
    });

    context('with any other error', () => {
      def('error', () => ({ code: 127 }));
      def('stderr', () => 'Any error');

      it('returns true', () => {
        expect(report()).to.be.true;
      });

      it('logs an error message', () => {
        report();

        sandbox.assert.calledWith(logSpy, {
          level: loggerModule.LogLevel.Error,
          message: 'An error occurred: "Any error" - Error Object: {"code":127}',
        });
      });
    });

    context('only with stderr', () => {
      def('error', () => null);
      def('stderr', () => 'A warning message');

      it('returns false', () => {
        expect(report()).to.be.false;
      });

      it('logs a warning', () => {
        report();

        sandbox.assert.calledWith(logSpy, {
          level: loggerModule.LogLevel.Warning,
          message: 'Warning: "A warning message"',
        });
      });
    });

    context('with no error', () => {
      def('error', () => null);
      def('stderr', () => '');

      it('returns false', () => {
        expect(report()).to.be.false;
      });

      it('logs no message', () => {
        report();

        expect(logSpy.notCalled).to.be.true;
      });
    });
  });
});
